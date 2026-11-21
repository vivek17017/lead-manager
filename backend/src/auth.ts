
import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { pool } from "./db";

const router = Router();

const rawJWT_SECRET = process.env.JWT_SECRET;

if (!rawJWT_SECRET || rawJWT_SECRET.length < 32) {
  throw new Error("A secure JWT_SECRET is required in .env");
}
const JWT_SECRET: string = rawJWT_SECRET;
const isProduction = process.env.NODE_ENV === "production";
const COOKIE_NAME = isProduction ? "__Host-lead_session" : "lead_session";
const ONE_DAY = 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  path: "/"
};

// Validation
const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string()
    .min(8)
    .max(72)
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "Password must be at most 72 bytes"
    )
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1)
});

// Database row types
type PublicUser = {
  id: string;
  name: string;
  email: string;
};

type UserWithPassword = PublicUser & {
  password_hash: string;
};

// Protect authentication endpoints against excessive requests
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Try again later."
  }
});

// Create a signed JWT
function createToken(userId: string): string {
  return jwt.sign({}, JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    issuer: "lead-manager",
    audience: "lead-manager-web",
    expiresIn: "1d"
  });
}

// Verify a JWT and extract its user ID
function verifyToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "lead-manager",
      audience: "lead-manager-web"
    });

    if (typeof decoded === "string") {
      return null;
    }

    return typeof decoded.sub === "string"
      ? decoded.sub
      : null;
  } catch {
    return null;
  }
}

// Middleware for protected API routes
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.[COOKIE_NAME];

  if (typeof token !== "string") {
    res.status(401).json({
      message: "Authentication required"
    });
    return;
  }

  const userId = verifyToken(token);

  if (!userId) {
    res.status(401).json({
      message: "Invalid or expired session"
    });
    return;
  }

  res.locals.userId = userId;
  next();
}

// POST /api/auth/signup
router.post("/signup", authLimiter, async (req, res) => {
  const result = signupSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "Invalid signup data",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  const { name, email, password } = result.data;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await pool.query<PublicUser>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, passwordHash]
    );

    res.status(201).json({
      message: "Account created successfully. Please log in.",
      user: newUser.rows[0]
    });
  } catch (error: unknown) {
    // PostgreSQL error code 23505 = unique constraint violation
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({
        message: "An account with this email already exists"
      });
      return;
    }

    console.error("Signup error:", error);

    res.status(500).json({
      message: "Unable to create account"
    });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      message: "A valid email and password are required"
    });
    return;
  }

  const { email, password } = result.data;

  try {
    const queryResult = await pool.query<UserWithPassword>(
      `SELECT id, name, email, password_hash
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`,
      [email]
    );

    const user = queryResult.rows[0];

    if (!user) {
      res.status(401).json({
        message: "Invalid email or password"
      });
      return;
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      res.status(401).json({
        message: "Invalid email or password"
      });
      return;
    }

    const token = createToken(user.id);

    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: ONE_DAY
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Unable to log in"
    });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (_req, res) => {
  try {
    const result = await pool.query<PublicUser>(
      `SELECT id, name, email
       FROM users
       WHERE id = $1`,
      [res.locals.userId]
    );

    if (result.rows.length === 0) {
      res.clearCookie(COOKIE_NAME, cookieOptions);

      res.status(401).json({
        message: "Account no longer exists"
      });
      return;
    }

    res.status(200).json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Get current user error:", error);

    res.status(500).json({
      message: "Unable to retrieve user"
    });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);

  res.status(200).json({
    message: "Logged out successfully"
  });
});

export { router as authRouter };
