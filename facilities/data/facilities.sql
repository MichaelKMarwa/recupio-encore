-- Facilities sample data insertion script

-- First, insert facility types
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
    SELECT id INTO donation_id FROM facility_types WHERE name = 'donation';
    SELECT id INTO recycling_id FROM facility_types WHERE name = 'recycling';
    SELECT id INTO disposal_id FROM facility_types WHERE name = 'disposal';

    -- Insert facilities
    INSERT INTO facilities (
        id, name, description, address, city, state, zip_code, 
        phone, email, website, image_url, is_verified, location
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
        ST_SetSRID(ST_MakePoint(-122.335167, 47.608013), 4326)
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
        ST_SetSRID(ST_MakePoint(-122.330167, 47.606013), 4326)
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
        ST_SetSRID(ST_MakePoint(-122.338167, 47.612013), 4326)
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
        ST_SetSRID(ST_MakePoint(-122.342167, 47.615013), 4326)
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
        ST_SetSRID(ST_MakePoint(-122.201167, 47.610013), 4326)
    );

    -- Link facilities with facility types
    INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
    SELECT f.id, donation_id, NOW()
    FROM facilities f
    WHERE f.name IN ('Goodwill Donation Center', 'Salvation Army');

    INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
    SELECT f.id, recycling_id, NOW()
    FROM facilities f
    WHERE f.name IN ('Green Earth Recycling', 'Tech Recyclers');

    INSERT INTO facility_type_mappings (facility_id, type_id, created_at)
    SELECT f.id, disposal_id, NOW()
    FROM facilities f
    WHERE f.name IN ('City Waste Management');

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
        generate_series(0, 6) AS day_of_week;
END $$; 