-- Migration: Add images table for user image uploads
-- Run this migration to enable the image upload feature

CREATE TABLE IF NOT EXISTS images (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    filename    VARCHAR(255)        NULL,            -- NULL for URL-type images
    original_name VARCHAR(255) NOT NULL,
    url         VARCHAR(500)        NULL,
    type        ENUM('uploaded', 'url') NOT NULL DEFAULT 'uploaded',
    mime_type   VARCHAR(100)        NULL,
    size        INT                 NULL,            -- processed file size in bytes
    original_size INT               NULL,            -- original upload size in bytes
    created_at  TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_images_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_images_user_id (user_id),
    INDEX idx_images_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
