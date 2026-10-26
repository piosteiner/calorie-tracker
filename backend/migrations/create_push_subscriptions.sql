-- Push notification subscriptions
-- One row per browser/device endpoint per user.
-- A user may have multiple active subscriptions (phone + desktop, etc.)

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id      INT          NOT NULL,
    endpoint     TEXT         NOT NULL,
    p256dh       VARCHAR(255) NOT NULL,
    auth         VARCHAR(255) NOT NULL,
    user_agent   VARCHAR(255) NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Prevent duplicate endpoint rows per user
    UNIQUE KEY uq_user_endpoint (user_id, endpoint(500)),
    INDEX idx_user_id (user_id),

    CONSTRAINT fk_push_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
