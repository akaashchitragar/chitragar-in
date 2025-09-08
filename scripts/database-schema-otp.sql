-- Create OTP table for admin authentication
CREATE TABLE IF NOT EXISTS admin_otp (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_otp_email ON admin_otp(email);

-- Create index on created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_admin_otp_created_at ON admin_otp(created_at);
