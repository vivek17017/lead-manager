
import { useState, type FormEvent } from "react";

import { ApiError } from "../api";

import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  type Lead,
  type LeadInput
} from "../types/lead";

type LeadFormProps = {
  lead: Lead | null;
  onSave: (data: LeadInput) => Promise<void>;
  onCancel: () => void;
};

type FormErrors = Partial<
  Record<keyof LeadInput, string>
>;

const emptyForm: LeadInput = {
  name: "",
  email: "",
  phone: "",
  company: "",
  source: "Website",
  status: "New"
};

// Frontend validation
function validateLead(data: LeadInput): FormErrors {
  const errors: FormErrors = {};

  if (data.name.length < 2 || data.name.length > 100) {
    errors.name = "Name must contain 2–100 characters.";
  }

  if (
    data.email.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    errors.email = "Enter a valid email address.";
  }

  if (
    data.phone.length < 7 ||
    data.phone.length > 30 ||
    !/^\+?[0-9][0-9 ()-]*$/.test(data.phone)
  ) {
    errors.phone = "Enter a valid phone number (7–30 characters).";
  }

  if (
    data.company.length < 1 ||
    data.company.length > 150
  ) {
    errors.company = "Company is required (maximum 150 characters).";
  }

  return errors;
}

export default function LeadForm({
  lead,
  onSave,
  onCancel
}: LeadFormProps) {
  const isEditing = lead !== null;

  const [form, setForm] = useState<LeadInput>(
    () => lead
      ? {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          source: lead.source,
          status: lead.status
        }
      : { ...emptyForm }
  );

  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  function setField(field: keyof LeadInput, value: string) {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));

    // Clear an old error when the user edits that field
    setErrors((previous) => ({
      ...previous,
      [field]: undefined
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) return;

    setFormError("");
    setErrors({});

    // Normalize user input before sending
    const cleaned: LeadInput = {
      ...form,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      company: form.company.trim()
    };

    const validationErrors = validateLead(cleaned);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);

    try {
      await onSave(cleaned);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);

        const backendErrors: FormErrors = {};

        for (const detail of error.details) {
          const field = detail.field as keyof LeadInput;

          if (field in cleaned) {
            backendErrors[field] = detail.message;
          }
        }

        setErrors(backendErrors);
      } else {
        setFormError("Unable to save lead. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="lead-form-card">
      <div className="section-heading">
        <div>
          <h2>{isEditing ? "Edit Lead" : "Add New Lead"}</h2>
          <p className="muted">
            {isEditing
              ? "Update the contact details or sales status."
              : "Capture a new potential customer."}
          </p>
        </div>
      </div>

      {formError && (
        <div className="error-banner" role="alert">
          {formError}
        </div>
      )}

      <form noValidate onSubmit={handleSubmit}>
        <div className="lead-form-grid">
          <div className="form-field">
            <label htmlFor="lead-name">Full name *</label>
            <input
              id="lead-name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Rahul Sharma"
              maxLength={100}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && (
              <p className="field-error">{errors.name}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="lead-email">Email *</label>
            <input
              id="lead-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="rahul@example.com"
              maxLength={255}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && (
              <p className="field-error">{errors.email}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="lead-phone">Phone *</label>
            <input
              id="lead-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="+91 9876543210"
              maxLength={30}
              aria-invalid={Boolean(errors.phone)}
            />
            {errors.phone && (
              <p className="field-error">{errors.phone}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="lead-company">Company *</label>
            <input
              id="lead-company"
              value={form.company}
              onChange={(e) => setField("company", e.target.value)}
              placeholder="ABC Restaurant"
              maxLength={150}
              aria-invalid={Boolean(errors.company)}
            />
            {errors.company && (
              <p className="field-error">{errors.company}</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="lead-source">Lead source *</label>
            <select
              id="lead-source"
              value={form.source}
              onChange={(e) => setField("source", e.target.value)}
            >
              {LEAD_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="lead-status">Status *</label>
            <select
              id="lead-status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
            >
              {LEAD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="lead-form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Add Lead"}
          </button>
        </div>
      </form>
    </section>
  );
}
