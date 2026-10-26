-- Migration: Add share_token to food_logs for public sharing feature

ALTER TABLE food_logs
  ADD COLUMN share_token VARCHAR(64) NULL DEFAULT NULL AFTER image_id,
  ADD UNIQUE INDEX idx_food_logs_share_token (share_token);
