-- Add created_at to meal_requests
ALTER TABLE meal_requests 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
