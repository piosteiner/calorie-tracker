-- Migration: Add images table and sharing support to food_logs
-- Run this migration to enable the image upload and meal sharing features

-- 1. Images table
CREATE TABLE IF NOT EXISTS images (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    filename    VARCHAR(255) NULL,
    original_name VARCHAR(255),
    url         VARCHAR(2048),
    type        ENUM('uploaded', 'url') NOT NULL DEFAULT 'uploaded',
    mime_type   VARCHAR(100),
    size        INT,
    original_size INT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_images_user (user_id),
    INDEX idx_images_filename (filename)
);

-- 2. Add image_id FK to food_logs
ALTER TABLE food_logs
    ADD COLUMN IF NOT EXISTS image_id INT NULL,
    ADD CONSTRAINT fk_food_logs_image
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE SET NULL;

-- 3. Add share_token to food_logs
ALTER TABLE food_logs
    ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE NULL;

CREATE INDEX IF NOT EXISTS idx_food_logs_share_token ON food_logs (share_token);
