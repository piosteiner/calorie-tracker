-- Migration: Create share_ranges table for date-range public sharing
-- Instead of embedding every log token in the URL, a single short token
-- represents a (user, date_from, date_to) query stored server-side.

CREATE TABLE share_ranges (
    id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    token      VARCHAR(22)   NOT NULL,
    user_id    INT UNSIGNED  NOT NULL,
    date_from  DATE          NOT NULL,
    date_to    DATE          NOT NULL,
    created_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY idx_share_ranges_token (token),
    KEY idx_share_ranges_user_id (user_id),
    KEY idx_share_ranges_created_at (created_at)
);
