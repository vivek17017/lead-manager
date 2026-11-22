
import {
  Router,
  type Request,
  type Response,
  type RequestHandler
} from "express";

import {
  sendApiError,
  sendValidationError
} from "./api-errors";

import { z } from "zod";
import { pool } from "./db";
import { requireAuth } from "./auth";

const router = Router();

// ---------- Validation ----------

const statusSchema = z.enum([
  "New",
  "Contacted",
  "Qualified",
  "Lost"
]);

const sourceSchema = z.enum([
  "Website",
  "Referral",
  "LinkedIn",
  "Cold Call",
  "Other"
]);

const listQuerySchema = z.object({
  search: z.string()
    .trim()
    .max(100)
    .default(""),

  status: statusSchema.optional(),

  sort: z.enum([
    "newest",
    "oldest",
    "name_asc",
    "name_desc"
  ]).default("newest"),

  page: z.coerce.number()
    .int()
    .min(1)
    .max(100000)
    .default(1),

  limit: z.coerce.number()
    .int()
    .min(1)
    .max(50)
    .default(10)
}).strict();

const sortSql = {
  newest: "created_at DESC, id DESC",
  oldest: "created_at ASC, id ASC",
  name_asc: "LOWER(name) ASC, id ASC",
  name_desc: "LOWER(name) DESC, id DESC"
} as const;

const leadFields = {
  name: z.string().trim().min(2).max(100),

  email: z.string()
    .trim()
    .toLowerCase()
    .email()
    .max(255),

  phone: z.string()
    .trim()
    .min(7)
    .max(30)
    .regex(
      /^\+?[0-9][0-9 ()-]*$/,
      "Invalid phone number format"
    ),

  company: z.string().trim().min(1).max(150),

  source: sourceSchema,

  status: statusSchema
};

// Create: all lead details required except status
const createLeadSchema = z.object({
  ...leadFields,
  status: statusSchema.default("New")
}).strict();

// Update: allow editing one or more fields
const updateLeadSchema = z.object(leadFields)
  .strict()
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one field to update"
  );

// ---------- Types ----------

type Lead = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: string;
  created_at: Date;
  updated_at: Date;
};
type LeadStatsRow = {
  total: string;
  new_count: string;
  contacted_count: string;
  qualified_count: string;
  lost_count: string;
};
// Explicit columns returned from the database
const leadColumns = `
  id, user_id, name, email, phone, company,
  source, status, created_at, updated_at
`;

// Validate PostgreSQL BIGINT IDs
function validLeadId(
  value: string | undefined|unknown
): value is string {
  if (typeof value !== "string" || !/^[1-9]\d{0,18}$/.test(value)) {
    return false;
  }

  return BigInt(value) <= 9223372036854775807n;
}

// Format validation errors for API clients


// Forward asynchronous errors to Express
type AsyncRoute = (
  req: Request,
  res: Response
) => Promise<void>;

function asyncHandler(fn: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

// All routes below require a valid JWT
router.use(requireAuth);

// ---------- CREATE ----------

// POST /api/leads
router.post("/", asyncHandler(async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);

  if (!parsed.success) {
  sendValidationError(
    res,
    parsed.error.issues,
    "Invalid lead data"
  );
  return;
}

  const {
    name,
    email,
    phone,
    company,
    source,
    status
  } = parsed.data;

  const userId: string = res.locals.userId;

  const result = await pool.query<Lead>(
    `INSERT INTO leads (
      user_id, name, email, phone,
      company, source, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${leadColumns}`,
    [
      userId,
      name,
      email,
      phone,
      company,
      source,
      status
    ]
  );

  res.status(201).json({
    message: "Lead created successfully",
    lead: result.rows[0]
  });
}));

// ---------- READ ALL ----------

// GET /api/leads

// ---------- READ ALL WITH FILTERS AND PAGINATION ----------

// GET /api/leads
router.get("/", asyncHandler(async (req, res) => {
  // 1. Validate query parameters
  const parsed = listQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    sendValidationError(
      res,
      parsed.error.issues,
      "Invalid search or pagination parameters"
    );
    return;
  }

  const {
    search,
    status,
    sort,
    page,
    limit
  } = parsed.data;

  // 2. Get the user ID from verified authentication
  const userId: string = res.locals.userId;

  // 3. Build safe WHERE conditions
  const conditions: string[] = ["user_id = $1"];
  const values: Array<string | number> = [userId];

  if (search) {
    // Treat %, _ and backslash as literal search text
    const escapedSearch = search.replace(
      /[\\%_]/g,
      (character) => "\\" + character
    );

    values.push(`%${escapedSearch}%`);

    conditions.push(
      `name ILIKE $${values.length}`
    );
  }

  if (status) {
    values.push(status);

    conditions.push(
      `status = $${values.length}`
    );
  }

  const whereSql = conditions.join(" AND ");

  // 4. Count all matching leads, before pagination
  const countResult = await pool.query<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM leads
     WHERE ${whereSql}`,
    values
  );

  const total = Number(countResult.rows[0].total);

  // 5. Calculate pagination
  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  const offset = (page - 1) * limit;

  // 6. Get the requested page
  const queryValues = [
    ...values,
    limit,
    offset
  ];

  const limitPlaceholder = `$${values.length + 1}`;
  const offsetPlaceholder = `$${values.length + 2}`;

  const result = await pool.query<Lead>(
    `SELECT ${leadColumns}
     FROM leads
     WHERE ${whereSql}
     ORDER BY ${sortSql[sort]}
     LIMIT ${limitPlaceholder}
     OFFSET ${offsetPlaceholder}`,
    queryValues
  );

  // 7. Return records and pagination metadata
  res.status(200).json({
    count: result.rows.length,
    leads: result.rows,

    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  });
}));

  // ---------- DASHBOARD STATISTICS ----------

  // GET /api/leads/stats
  router.get("/stats", asyncHandler(async (_req, res) => {
    const userId: string = res.locals.userId;

    const result = await pool.query<LeadStatsRow>(
      `SELECT
         COUNT(*) AS total,

         COUNT(*) FILTER (
           WHERE status = 'New'
         ) AS new_count,

         COUNT(*) FILTER (
           WHERE status = 'Contacted'
         ) AS contacted_count,

         COUNT(*) FILTER (
           WHERE status = 'Qualified'
         ) AS qualified_count,

         COUNT(*) FILTER (
           WHERE status = 'Lost'
         ) AS lost_count

       FROM leads
       WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];

    res.status(200).json({
      stats: {
        total: Number(row.total),
        new: Number(row.new_count),
        contacted: Number(row.contacted_count),
        qualified: Number(row.qualified_count),
        lost: Number(row.lost_count)
      }
    });
  }));


// ---------- READ ONE ----------

// GET /api/leads/:id
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validLeadId(id)) {
    sendApiError(
  res,
  400,
  "INVALID_LEAD_ID",
  "Invalid lead ID"
);
    return;
  }

  const userId: string = res.locals.userId;

  const result = await pool.query<Lead>(
    `SELECT ${leadColumns}
     FROM leads
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  const lead = result.rows[0];

  if (!lead) {
    sendApiError(
  res,
  404,
  "LEAD_NOT_FOUND",
  "Lead not found"
);
    return;
  }

  res.status(200).json({ lead });
}));

// ---------- UPDATE ----------

// PATCH /api/leads/:id
router.patch("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validLeadId(id)) {
    sendApiError(
  res,
  400,
  "INVALID_LEAD_ID",
  "Invalid lead ID"
);
    return;
  }

  const parsed = updateLeadSchema.safeParse(req.body);

  if (!parsed.success) {
  sendValidationError(
    res,
    parsed.error.issues,
    "Invalid update data"
  );
  return;
}

  const data = parsed.data;
  const userId: string = res.locals.userId;

  const result = await pool.query<Lead>(
    `UPDATE leads
     SET
       name = COALESCE($3, name),
       email = COALESCE($4, email),
       phone = COALESCE($5, phone),
       company = COALESCE($6, company),
       source = COALESCE($7, source),
       status = COALESCE($8, status),
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING ${leadColumns}`,
    [
      id,
      userId,
      data.name ?? null,
      data.email ?? null,
      data.phone ?? null,
      data.company ?? null,
      data.source ?? null,
      data.status ?? null
    ]
  );

  const lead = result.rows[0];

  if (!lead) {
    sendApiError(
  res,
  404,
  "LEAD_NOT_FOUND",
  "Lead not found"
);
    return;
  }

  res.status(200).json({
    message: "Lead updated successfully",
    lead
  });
}));

// ---------- DELETE ----------

// DELETE /api/leads/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!validLeadId(id)) {
    sendApiError(
  res,
  400,
  "INVALID_LEAD_ID",
  "Invalid lead ID"
);
    return;
  }

  const userId: string = res.locals.userId;

  const result = await pool.query<{ id: string }>(
    `DELETE FROM leads
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    sendApiError(
  res,
  404,
  "LEAD_NOT_FOUND",
  "Lead not found"
);
    return;
  }

  res.status(200).json({
    message: "Lead deleted successfully",
    id: result.rows[0].id
  });
}));





export { router as leadsRouter };
