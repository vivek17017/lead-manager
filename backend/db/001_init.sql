
-- Create the users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    name VARCHAR(100) NOT NULL
        CHECK (LENGTH(TRIM(name)) > 0),

    email VARCHAR(255) NOT NULL
        CHECK (LENGTH(TRIM(email)) > 0),

    password_hash TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate login emails regardless of letter case
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
ON users (LOWER(email));


-- Create the leads table
CREATE TABLE IF NOT EXISTS leads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL
        CHECK (LENGTH(TRIM(name)) > 0),

    email VARCHAR(255) NOT NULL
        CHECK (LENGTH(TRIM(email)) > 0),

    phone VARCHAR(30) NOT NULL
        CHECK (LENGTH(TRIM(phone)) > 0),

    company VARCHAR(150) NOT NULL
        CHECK (LENGTH(TRIM(company)) > 0),

    source VARCHAR(30) NOT NULL
        CHECK (
            source IN (
                'Website',
                'Referral',
                'LinkedIn',
                'Cold Call',
                'Other'
            )
        ),

    status VARCHAR(20) NOT NULL DEFAULT 'New'
        CHECK (
            status IN (
                'New',
                'Contacted',
                'Qualified',
                'Lost'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for filtering leads by owner and status
CREATE INDEX IF NOT EXISTS idx_leads_user_status_created
ON leads (user_id, status, created_at DESC);

-- Index for listing a user's newest leads
CREATE INDEX IF NOT EXISTS idx_leads_user_created
ON leads (user_id, created_at DESC);
