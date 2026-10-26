-- Migration: Add image_id to food_logs for meal photo attachments

ALTER TABLE food_logs 
  ADD COLUMN image_id INT NULL AFTER meal_time,
  ADD CONSTRAINT fk_food_logs_image 
    FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE SET NULL;
