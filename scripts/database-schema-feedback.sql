-- Enhanced Interactive Feedback Collection System
-- This schema supports anonymous feedback with admin approval workflow

-- Feedback submissions table
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id SERIAL PRIMARY KEY,
    
    -- Content fields
    message TEXT NOT NULL CHECK (LENGTH(message) >= 10 AND LENGTH(message) <= 1000),
    feedback_type VARCHAR(50) DEFAULT 'general' CHECK (feedback_type IN ('general', 'portfolio', 'website', 'collaboration', 'suggestion', 'compliment', 'critique')),
    
    -- Interactive elements
    mood_emoji VARCHAR(10), -- User can select mood/emotion
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Optional 1-5 star rating
    
    -- Anonymous metadata (no personal info stored)
    user_agent TEXT, -- Browser info for analytics
    ip_hash VARCHAR(64), -- Hashed IP for spam prevention (not storing actual IP)
    session_id VARCHAR(100), -- Temporary session to prevent spam
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Admin workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    admin_notes TEXT, -- Private notes for admin
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(100), -- Admin username who reviewed
    
    -- Display settings (when approved)
    display_publicly BOOLEAN DEFAULT FALSE,
    display_order INTEGER, -- For custom ordering of approved feedback
    is_featured BOOLEAN DEFAULT FALSE, -- Highlight special feedback
    
    -- Spam prevention
    is_spam BOOLEAN DEFAULT FALSE,
    spam_score DECIMAL(3,2) DEFAULT 0.00, -- Auto-calculated spam likelihood
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Feedback categories for better organization
CREATE TABLE IF NOT EXISTS feedback_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_emoji VARCHAR(10),
    color_hex VARCHAR(7), -- For UI theming
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default categories (only if they don't exist)
INSERT INTO feedback_categories (name, description, icon_emoji, color_hex) 
SELECT * FROM (VALUES
('General', 'General feedback about anything', '💬', '#6B7280'),
('Portfolio', 'Feedback about photography work', '📸', '#3B82F6'),
('Website', 'Feedback about this website', '🌐', '#10B981'),
('Collaboration', 'Interest in working together', '🤝', '#8B5CF6'),
('Suggestion', 'Ideas for improvement', '💡', '#F59E0B'),
('Compliment', 'Positive feedback and praise', '❤️', '#EF4444'),
('Critique', 'Constructive criticism', '🎯', '#F97316')
) AS t(name, description, icon_emoji, color_hex)
WHERE NOT EXISTS (SELECT 1 FROM feedback_categories WHERE feedback_categories.name = t.name);

-- Feedback reactions (for approved feedback that's displayed)
CREATE TABLE IF NOT EXISTS feedback_reactions (
    id SERIAL PRIMARY KEY,
    feedback_id INTEGER REFERENCES feedback_submissions(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) CHECK (reaction_type IN ('like', 'love', 'insightful', 'helpful', 'funny')),
    ip_hash VARCHAR(64), -- To prevent duplicate reactions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(feedback_id, ip_hash, reaction_type)
);

-- Admin activity log
CREATE TABLE IF NOT EXISTS feedback_admin_log (
    id SERIAL PRIMARY KEY,
    feedback_id INTEGER REFERENCES feedback_submissions(id) ON DELETE CASCADE,
    admin_username VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'approved', 'rejected', 'archived', 'featured', etc.
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance (only create if they don't exist)
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_submissions(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_display ON feedback_submissions(display_publicly, display_order);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_submissions(feedback_type);
CREATE INDEX IF NOT EXISTS idx_feedback_spam ON feedback_submissions(is_spam, spam_score);
CREATE INDEX IF NOT EXISTS idx_reactions_feedback ON feedback_reactions(feedback_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_feedback ON feedback_admin_log(feedback_id);

-- Views for common queries (drop and recreate to ensure they're up to date)
DROP VIEW IF EXISTS pending_feedback;
CREATE VIEW pending_feedback AS
SELECT 
    fs.*,
    fc.name as category_name,
    fc.icon_emoji as category_icon,
    fc.color_hex as category_color
FROM feedback_submissions fs
LEFT JOIN feedback_categories fc ON fs.feedback_type = fc.name
WHERE fs.status = 'pending' 
    AND fs.deleted_at IS NULL 
    AND fs.is_spam = FALSE
ORDER BY fs.created_at ASC;

DROP VIEW IF EXISTS approved_feedback;
CREATE VIEW approved_feedback AS
SELECT 
    fs.*,
    fc.name as category_name,
    fc.icon_emoji as category_icon,
    fc.color_hex as category_color,
    COALESCE(reaction_counts.total_reactions, 0) as total_reactions
FROM feedback_submissions fs
LEFT JOIN feedback_categories fc ON fs.feedback_type = fc.name
LEFT JOIN (
    SELECT 
        feedback_id, 
        COUNT(*) as total_reactions,
        COUNT(CASE WHEN reaction_type = 'like' THEN 1 END) as likes,
        COUNT(CASE WHEN reaction_type = 'love' THEN 1 END) as loves,
        COUNT(CASE WHEN reaction_type = 'insightful' THEN 1 END) as insightful,
        COUNT(CASE WHEN reaction_type = 'helpful' THEN 1 END) as helpful,
        COUNT(CASE WHEN reaction_type = 'funny' THEN 1 END) as funny
    FROM feedback_reactions 
    GROUP BY feedback_id
) reaction_counts ON fs.id = reaction_counts.feedback_id
WHERE fs.status = 'approved' 
    AND fs.display_publicly = TRUE 
    AND fs.deleted_at IS NULL
ORDER BY fs.is_featured DESC, fs.display_order ASC, fs.created_at DESC;

-- Function to calculate spam score (basic implementation)
CREATE OR REPLACE FUNCTION calculate_spam_score(message_text TEXT, user_agent_text TEXT)
RETURNS DECIMAL(3,2) AS $$
DECLARE
    score DECIMAL(3,2) := 0.00;
    word_count INTEGER;
    caps_ratio DECIMAL(3,2);
    url_count INTEGER;
BEGIN
    -- Count words
    word_count := array_length(string_to_array(trim(message_text), ' '), 1);
    
    -- Check for excessive caps
    caps_ratio := (LENGTH(message_text) - LENGTH(LOWER(message_text)))::DECIMAL / LENGTH(message_text);
    
    -- Count URLs
    url_count := (LENGTH(message_text) - LENGTH(regexp_replace(message_text, 'https?://[^\s]+', '', 'g'))) / 10;
    
    -- Calculate score
    IF word_count < 3 THEN score := score + 0.3; END IF;
    IF caps_ratio > 0.5 THEN score := score + 0.4; END IF;
    IF url_count > 2 THEN score := score + 0.5; END IF;
    IF message_text ~* '(buy now|click here|free money|urgent|winner)' THEN score := score + 0.6; END IF;
    
    RETURN LEAST(score, 1.00);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate spam score
CREATE OR REPLACE FUNCTION update_spam_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.spam_score := calculate_spam_score(NEW.message, NEW.user_agent);
    NEW.is_spam := NEW.spam_score > 0.7;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_spam_check
    BEFORE INSERT OR UPDATE ON feedback_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_spam_score();

-- Sample data for testing (optional)
-- INSERT INTO feedback_submissions (message, feedback_type, mood_emoji, rating, user_agent, ip_hash, session_id) VALUES
-- ('Love your photography work! The lighting in your portraits is absolutely stunning.', 'portfolio', '😍', 5, 'Mozilla/5.0...', 'hash123', 'session456'),
-- ('The website loads really fast and has a great design. Very professional!', 'website', '👍', 4, 'Mozilla/5.0...', 'hash789', 'session101'),
-- ('Would love to collaborate on a project sometime. Your style would be perfect for our brand.', 'collaboration', '🤝', 5, 'Mozilla/5.0...', 'hash456', 'session789');
