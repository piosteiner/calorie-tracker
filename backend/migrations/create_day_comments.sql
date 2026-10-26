-- Day comments: one comment per user per calendar date
CREATE TABLE IF NOT EXISTS day_comments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    log_date    DATE NOT NULL,
    comment     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_date (user_id, log_date),
    CONSTRAINT fk_day_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
