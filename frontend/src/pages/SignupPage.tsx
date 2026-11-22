
import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useNavigate
} from "react-router";

import { apiRequest, ApiError } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { status } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string>
  >({});

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (name.trim().length < 2 || name.trim().length > 100) {
      errors.name = "Name must contain 2–100 characters.";
    }

    if (
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      errors.email = "Enter a valid email address.";
    }

    if (password.length < 8) {
      errors.password = "Use at least 8 characters.";
    } else if (
      password.length > 72 ||
      new TextEncoder().encode(password).length > 72
    ) {
      errors.password = "Password must be at most 72 bytes.";
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    return errors;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setFormError("");
    setFieldErrors({});

    const errors = validate();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      await apiRequest("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password
        })
      });

      navigate("/login", {
        replace: true,
        state: {
          notice: "Account created successfully. Please log in."
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);

        const errors: Record<string, string> = {};

        for (const detail of error.details) {
          errors[detail.field] = detail.message;
        }

        setFieldErrors(errors);
      } else {
        setFormError("Unable to create account. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="center-screen">
        Checking your session...
      </main>
    );
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand">Lead Manager</div>

        <h1>Create account</h1>
        <p className="muted">
          Start managing your customer leads.
        </p>

        {formError && (
          <div className="error-banner" role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form">
          <div className="form-field">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              maxLength={100}
            />
            {fieldErrors.name && (
              <p className="field-error">{fieldErrors.name}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              maxLength={255}
            />
            {fieldErrors.email && (
              <p className="field-error">{fieldErrors.email}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />
            {fieldErrors.password && (
              <p className="field-error">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {fieldErrors.confirmPassword && (
              <p className="field-error">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="form-footer">
          Already have an account?{" "}
          <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
