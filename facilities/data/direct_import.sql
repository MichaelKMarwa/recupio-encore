-- Direct facility import SQL script
-- This script creates sample facilities directly with proper transaction handling

-- Start a transaction
BEGIN;

-- Create extension for UUID support if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Create PostGIS extension if needed (for geographical queries)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Make sure facility_types exist
INSERT INTO facility_types (id, name, created_at) VALUES 
  (uuid_generate_v4(), 'donation', NOW()),
  (uuid_generate_v4(), 'recycling', NOW()),
  (uuid_generate_v4(), 'disposal', NOW())
ON CONFLICT (name) DO NOTHING;

-- Get facility type IDs for reference
DO $$
DECLARE
    donation_id VARCHAR(255);
    recycling_id VARCHAR(255);
    disposal_id VARCHAR(255);
BEGIN
    -- Get the type IDs
    SELECT id INTO donation_id FROM facility_types WHERE name = 'donation';
    SELECT id INTO recycling_id FROM facility_types WHERE name = 'recycling';
    SELECT id INTO disposal_id FROM facility_types WHERE name = 'disposal';

    -- Insert facilities
    INSERT INTO facilities (
        id, name, description, address, city, state, zip_code, 
        phone, email, website, image_url, is_verified, location, created_at, updated_at
    ) VALUES 
    (
        uuid_generate_v4(), 
        'Goodwill Donation Center', 
        'Accepts clothing, furniture, electronics, and household items.',
        '123 Main St', 
        'Seattle', 
        'WA', 
        '98101', 
        '206-555-1234', 
        'info@goodwill.org', 
        'https://www.goodwill.org', 
        'https://example.com/goodwill.jpg', 
        TRUE,
        ST_SetSRID(ST_MakePoint(-122.335167, 47.608013), 4326),
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(), 
        'Green Earth Recycling', 
        'Specializes in electronics and battery recycling.',
        '456 Pine Ave', 
        'Seattle', 
        'WA', 
        '98101', 
        '206-555-2345', 
        'contact@greenearthrecycling.org', 
        'https://www.greenearthrecycling.org', 
        'https://example.com/greenearth.jpg', 
        TRUE,
        ST_SetSRID(ST_MakePoint(-122.330167, 47.606013), 4326),
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(), 
        'Salvation Army', 
        'Accepts clothing, furniture, appliances, and household goods.',
        '789 Oak Blvd', 
        'Seattle', 
        'WA', 
        '98102', 
        '206-555-3456', 
        'info@salvationarmy.org', 
        'https://www.salvationarmy.org', 
        'https://example.com/salvationarmy.jpg', 
        TRUE,
        ST_SetSRID(ST_MakePoint(-122.338167, 47.612013), 4326),
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(), 
        'City Waste Management', 
        'Municipal waste disposal facility.',
        '321 Elm St', 
        'Seattle', 
        'WA', 
        '98103', 
        '206-555-4567', 
        'info@citywaste.gov', 
        'https://www.citywaste.gov', 
        'https://example.com/citywaste.jpg', 
        TRUE,
        ST_SetSRID(ST_MakePoint(-122.342167, 47.615013), 4326),
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(), 
        'Tech Recyclers', 
        'Specializes in recycling computers, phones, and other electronics.',
        '555 Cedar Rd', 
        'Bellevue', 
        'WA', 
        '98004', 
        '425-555-5678', 
        'info@techrecyclers.com', 
        'https://www.techrecyclers.com', 
        'https://example.com/techrecyclers.jpg', 
        TRUE,
        ST_SetSRID(ST_MakePoint(-122.201167, 47.610013), 4326),
        NOW(),
        NOW()
    )
    ON CONFLICT DO NOTHING;

    -- Link facilities with facility types
    INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
    SELECT f.id, donation_id, NOW()
    FROM facilities f
    WHERE f.name IN ('Goodwill Donation Center', 'Salvation Army')
    ON CONFLICT DO NOTHING;

    INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
    SELECT f.id, recycling_id, NOW()
    FROM facilities f
    WHERE f.name IN ('Green Earth Recycling', 'Tech Recyclers')
    ON CONFLICT DO NOTHING;

    INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
    SELECT f.id, disposal_id, NOW()
    FROM facilities f
    WHERE f.name IN ('City Waste Management')
    ON CONFLICT DO NOTHING;

    -- Add facility hours
    -- Insert standard business hours for all facilities
    INSERT INTO facility_hours (id, facility_id, day_of_week, open_time, close_time, is_closed, created_at, updated_at)
    SELECT 
        uuid_generate_v4(),
        f.id,
        day_of_week,
        CASE 
            WHEN day_of_week BETWEEN 1 AND 5 THEN '09:00:00'::TIME -- Monday to Friday
            WHEN day_of_week = 6 THEN '10:00:00'::TIME -- Saturday
            ELSE '12:00:00'::TIME -- Sunday
        END AS open_time,
        CASE 
            WHEN day_of_week BETWEEN 1 AND 5 THEN '18:00:00'::TIME -- Monday to Friday
            WHEN day_of_week = 6 THEN '17:00:00'::TIME -- Saturday
            ELSE '16:00:00'::TIME -- Sunday
        END AS close_time,
        CASE 
            WHEN f.name = 'City Waste Management' AND day_of_week = 0 THEN TRUE -- Closed on Sundays
            ELSE FALSE
        END AS is_closed,
        NOW(),
        NOW()
    FROM 
        facilities f,
        generate_series(0, 6) AS day_of_week
    ON CONFLICT DO NOTHING;
END $$;

-- Create categories for items
INSERT INTO categories (id, name, icon, description, created_at, updated_at) VALUES
  (uuid_generate_v4(), 'Electronics', 'computer', 'Electronic devices and accessories', NOW(), NOW()),
  (uuid_generate_v4(), 'Clothing', 'shirt', 'All types of clothing items', NOW(), NOW()),
  (uuid_generate_v4(), 'Furniture', 'chair', 'Home and office furniture', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Create items within those categories
DO $$
DECLARE
  electronics_id VARCHAR(255);
  clothing_id VARCHAR(255);
  furniture_id VARCHAR(255);
BEGIN
  SELECT id INTO electronics_id FROM categories WHERE name = 'Electronics';
  SELECT id INTO clothing_id FROM categories WHERE name = 'Clothing';
  SELECT id INTO furniture_id FROM categories WHERE name = 'Furniture';
  
  -- Create items
  INSERT INTO items (id, name, category_id, notes, created_at, updated_at) VALUES
    (uuid_generate_v4(), 'Laptop', electronics_id, 'Working or non-working laptops', NOW(), NOW()),
    (uuid_generate_v4(), 'Smartphone', electronics_id, 'Cell phones and smartphones', NOW(), NOW()),
    (uuid_generate_v4(), 'T-Shirt', clothing_id, 'All sizes and types', NOW(), NOW()),
    (uuid_generate_v4(), 'Sofa', furniture_id, 'Couches and sofas', NOW(), NOW())
  ON CONFLICT DO NOTHING;
  
  -- Connect electronic items to recycling centers
  INSERT INTO facility_items (id, facility_id, item_id, created_at)
  SELECT 
    uuid_generate_v4(),
    f.id,
    i.id,
    NOW()
  FROM 
    facilities f
    JOIN facility_type_mappings ftm ON f.id = ftm.facility_id
    JOIN facility_types ft ON ftm.type_id = ft.id AND ft.name = 'recycling'
    JOIN items i ON i.category_id = electronics_id
  ON CONFLICT DO NOTHING;
  
  -- Connect clothing and furniture to donation centers
  INSERT INTO facility_items (id, facility_id, item_id, created_at)
  SELECT 
    uuid_generate_v4(),
    f.id,
    i.id,
    NOW()
  FROM 
    facilities f
    JOIN facility_type_mappings ftm ON f.id = ftm.facility_id
    JOIN facility_types ft ON ftm.type_id = ft.id AND ft.name = 'donation'
    JOIN items i ON i.category_id IN (clothing_id, furniture_id)
  ON CONFLICT DO NOTHING;
END $$;

-- Commit the transaction if everything worked
COMMIT; 