
# Lead Manager

A full-stack sales lead management application built using
React, TypeScript, Node.js, Express, and PostgreSQL.

Users can securely manage their own sales leads, track lead
statuses, search and filter records, and view dashboard
statistics.

## Features

- User signup and login
- Password hashing with bcrypt
- JWT authentication using HTTP-only cookies
- User-specific lead management
- Create, view, edit, and delete leads
- Confirmation before deleting
- Search leads by name
- Filter leads by status
- Server-side sorting and pagination
- Dashboard with lead counts by status
- Frontend and backend validation
- Consistent API error responses
- Responsive React interface
- Automated API integration tests

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Authentication | JWT, bcrypt, HTTP-only cookies |
| Validation | Zod |
| Testing | Vitest, Supertest |
| Hosting | Render, Neon |
| Version Control | Git, GitHub |

## Architecture

Browser (React)
      |
      | HTTPS / REST API
      v
Express Backend
      |
      | Authentication + validation
      v
PostgreSQL Database

The backend restricts lead access using the authenticated
user ID. Each user can access only their own records.

## Project Structure

lead-manager/
├── backend/
│   ├── db/
│   │   └── 001_init.sql
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── leads.ts
│   │   ├── db.ts
│   │   └── api-errors.ts
│   └── tests/
│       ├── api.test.ts
│       └── setup-env.ts
├── frontend/
│   └── src/
│       ├── auth/
│       ├── components/
│       ├── pages/
│       ├── types/
│       └── api.ts
└── README.md

## Local Setup

Requirements:

- Compatible Node.js LTS version
- PostgreSQL
- npm

1. Clone the repository:

   git clone YOUR_REPOSITORY_URL
   cd lead-manager

2. Install dependencies:

   cd backend
   npm ci

   cd ../frontend
   npm ci

3. Create a PostgreSQL database named lead_manager.

4. Execute backend/db/001_init.sql in that database.

5. Create backend/.env using backend/.env.example.

6. Configure DATABASE_URL and JWT_SECRET.

7. Start the backend:

   cd backend
   npm run dev

8. Start the frontend in another terminal:

   cd frontend
   npm run dev

Open http://localhost:5173

## Environment Variables

| Variable | Purpose |
| --- | --- |
| PORT | Express server port |
| NODE_ENV | Application environment |
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | Secret used to sign JWTs |

Do not commit real .env files.

## API Endpoints

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | /api/auth/signup | Register |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| POST | /api/auth/logout | Logout |

### Leads

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | /api/leads | Create lead |
| GET | /api/leads | List leads |
| GET | /api/leads/:id | Retrieve lead |
| PATCH | /api/leads/:id | Update lead |
| DELETE | /api/leads/:id | Delete lead |
| GET | /api/leads/stats | Dashboard counts |

### Query Parameters

GET /api/leads supports:

- search: Search by name
- status: Filter by status
- sort: newest, oldest, name_asc, name_desc
- page: Page number
- limit: Records per page, maximum 50

## Testing

Tests use a dedicated PostgreSQL database named
lead_manager_test.

Create backend/.env.test from backend/.env.test.example.

Apply the same database schema, then run:

    cd backend
    npm test

The integration tests verify authentication, password
hashing, CRUD operations, validation, authorization,
search, pagination, and dashboard statistics.

Never run destructive tests against production data.

## Security

- bcrypt password hashing
- Signed JWT authentication
- HTTP-only authentication cookies
- Secure cookies in production
- Parameterized SQL queries
- Backend input validation
- User ownership enforcement
- Authentication rate limiting
- Environment-based secret management

## Deployment

The React application is built using Vite and served
by Express as static assets.

Render hosts the Express web service.
Neon provides managed PostgreSQL.

Production secrets are configured in Render's
environment settings.

## Known Limitations

- No email verification or password reset
- No account deletion interface
- No lead import/export feature
- Offset-based pagination
- No real-time multi-user synchronization
- Basic in-memory authentication rate limiting

These were left outside the initial project scope to
focus on correctness, core CRM features, and testing.

## License

For educational and portfolio use.
