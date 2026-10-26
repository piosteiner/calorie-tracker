-- Migration: Track when share tokens are created so they can be auto-expired

ALTER TABLE food_logs
  ADD COLUMN share_token_created_at TIMESTAMP NULL DEFAULT NULL AFTER share_token,
  ADD INDEX idx_food_logs_share_token_created_at (share_token_created_at);
