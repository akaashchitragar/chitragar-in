-- Newsletter Subscription System
-- This schema supports newsletter subscriptions with admin management

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    
    -- Subscriber info
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Subscription metadata
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    unsubscribe_token VARCHAR(100) UNIQUE, -- For unsubscribe links
    
    -- Tracking
    ip_hash VARCHAR(64), -- Hashed IP for analytics (privacy-friendly)
    user_agent TEXT, -- Browser info for analytics
    referrer VARCHAR(255), -- Where they came from
    
    -- Email sending status
    welcome_email_sent BOOLEAN DEFAULT FALSE,
    welcome_email_sent_at TIMESTAMP WITH TIME ZONE,
    last_email_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Admin management
    notes TEXT, -- Admin notes about subscriber
    tags TEXT[], -- Tags for segmentation (e.g., 'photography', 'collaboration')
    
    -- Soft delete
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Newsletter campaigns table (for future use)
CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id SERIAL PRIMARY KEY,
    
    -- Campaign details
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    html_content TEXT,
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
    
    -- Statistics
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_opened INTEGER DEFAULT 0,
    total_clicked INTEGER DEFAULT 0,
    
    -- Metadata
    created_by VARCHAR(100), -- Admin who created
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email send log table
CREATE TABLE IF NOT EXISTS newsletter_email_log (
    id SERIAL PRIMARY KEY,
    
    -- References
    subscriber_id INTEGER REFERENCES newsletter_subscribers(id) ON DELETE CASCADE,
    campaign_id INTEGER REFERENCES newsletter_campaigns(id) ON DELETE SET NULL,
    
    -- Email details
    email_type VARCHAR(50) NOT NULL, -- 'welcome', 'newsletter', 'unsubscribe_confirmation'
    subject VARCHAR(255),
    
    -- Sending status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
    external_id VARCHAR(100), -- Resend message ID
    
    -- Timestamps
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(is_active, unsubscribed_at);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON newsletter_subscribers(subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_welcome_email ON newsletter_subscribers(welcome_email_sent, welcome_email_sent_at);
CREATE INDEX IF NOT EXISTS idx_email_log_subscriber ON newsletter_email_log(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_email_log_status ON newsletter_email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON newsletter_email_log(email_type);

-- Views for common queries
DROP VIEW IF EXISTS active_subscribers;
CREATE VIEW active_subscribers AS
SELECT 
    ns.*,
    COUNT(nel.id) as total_emails_sent,
    MAX(nel.sent_at) as last_email_sent
FROM newsletter_subscribers ns
LEFT JOIN newsletter_email_log nel ON ns.id = nel.subscriber_id
WHERE ns.is_active = TRUE 
    AND ns.unsubscribed_at IS NULL 
    AND ns.deleted_at IS NULL
GROUP BY ns.id
ORDER BY ns.subscribed_at DESC;

DROP VIEW IF EXISTS newsletter_stats;
CREATE VIEW newsletter_stats AS
SELECT 
    COUNT(*) as total_subscribers,
    COUNT(CASE WHEN is_active = TRUE AND unsubscribed_at IS NULL AND deleted_at IS NULL THEN 1 END) as active_subscribers,
    COUNT(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 END) as unsubscribed,
    COUNT(CASE WHEN welcome_email_sent = TRUE THEN 1 END) as welcome_emails_sent,
    COUNT(CASE WHEN subscribed_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_this_month,
    COUNT(CASE WHEN subscribed_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week
FROM newsletter_subscribers;

-- Function to generate unsubscribe token
CREATE OR REPLACE FUNCTION generate_unsubscribe_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate unsubscribe token
CREATE OR REPLACE FUNCTION set_unsubscribe_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.unsubscribe_token IS NULL THEN
        NEW.unsubscribe_token := generate_unsubscribe_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER newsletter_unsubscribe_token
    BEFORE INSERT ON newsletter_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION set_unsubscribe_token();

-- Function to safely unsubscribe (soft delete)
CREATE OR REPLACE FUNCTION unsubscribe_user(token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    subscriber_count INTEGER;
BEGIN
    UPDATE newsletter_subscribers 
    SET 
        is_active = FALSE,
        unsubscribed_at = CURRENT_TIMESTAMP
    WHERE unsubscribe_token = token
        AND is_active = TRUE
        AND unsubscribed_at IS NULL;
    
    GET DIAGNOSTICS subscriber_count = ROW_COUNT;
    RETURN subscriber_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing (optional)
-- INSERT INTO newsletter_subscribers (email, ip_hash, user_agent, referrer) VALUES
-- ('test@example.com', 'hash123', 'Mozilla/5.0...', 'https://chitragar.in'),
-- ('demo@example.com', 'hash456', 'Mozilla/5.0...', 'https://chitragar.in/photos');
