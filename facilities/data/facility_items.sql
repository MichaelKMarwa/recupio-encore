-- Insert sample item categories if they don't exist
INSERT INTO categories (id, name, icon, description, created_at, updated_at) VALUES
  (uuid_generate_v4(), 'Electronics', 'computer', 'Electronic devices and accessories', NOW(), NOW()),
  (uuid_generate_v4(), 'Clothing', 'shirt', 'All types of clothing items', NOW(), NOW()),
  (uuid_generate_v4(), 'Furniture', 'chair', 'Home and office furniture', NOW(), NOW()),
  (uuid_generate_v4(), 'Household', 'home', 'Household goods and appliances', NOW(), NOW()),
  (uuid_generate_v4(), 'Hazardous', 'warning', 'Hazardous materials requiring special handling', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert sample items if they don't exist
DO $$
DECLARE
  electronics_id VARCHAR(255);
  clothing_id VARCHAR(255);
  furniture_id VARCHAR(255);
  household_id VARCHAR(255);
  hazardous_id VARCHAR(255);
BEGIN
  -- Get category IDs
  SELECT id INTO electronics_id FROM categories WHERE name = 'Electronics';
  SELECT id INTO clothing_id FROM categories WHERE name = 'Clothing';
  SELECT id INTO furniture_id FROM categories WHERE name = 'Furniture';
  SELECT id INTO household_id FROM categories WHERE name = 'Household';
  SELECT id INTO hazardous_id FROM categories WHERE name = 'Hazardous';

  -- Insert items
  INSERT INTO items (id, name, category_id, notes, image_url, created_at, updated_at) VALUES
    (uuid_generate_v4(), 'Laptop', electronics_id, 'Working or non-working laptops', 'https://example.com/laptop.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'Smartphone', electronics_id, 'Cell phones and smartphones', 'https://example.com/smartphone.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'Television', electronics_id, 'All types of TVs', 'https://example.com/tv.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'T-Shirt', clothing_id, 'All sizes and types', 'https://example.com/tshirt.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'Jeans', clothing_id, 'All sizes and styles', 'https://example.com/jeans.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'Sofa', furniture_id, 'Couches and sofas', 'https://example.com/sofa.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'Table', furniture_id, 'Dining and coffee tables', 'https://example.com/table.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'Dishware', household_id, 'Plates, cups, and utensils', 'https://example.com/dishware.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'Batteries', hazardous_id, 'Household batteries requiring special disposal', 'https://example.com/batteries.jpg', NOW(), NOW()),
    (uuid_generate_v4(), 'Paint', hazardous_id, 'Unused or leftover paint', 'https://example.com/paint.jpg', NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- Link items to facilities based on facility type
  -- Link electronic items to electronics recyclers
  INSERT INTO facility_items (id, facility_id, item_id, created_at)
  SELECT 
    uuid_generate_v4(),
    f.id,
    i.id,
    NOW()
  FROM 
    facilities f,
    items i,
    facility_type_mappings ftm,
    facility_types ft
  WHERE 
    f.id = ftm.facility_id AND
    ftm.type_id = ft.id AND
    ft.name = 'recycling' AND
    i.category_id = electronics_id AND
    f.name IN ('Green Earth Recycling', 'Tech Recyclers')
  ON CONFLICT (facility_id, item_id) DO NOTHING;

  -- Link clothing and furniture to donation centers
  INSERT INTO facility_items (id, facility_id, item_id, created_at)
  SELECT 
    uuid_generate_v4(),
    f.id,
    i.id,
    NOW()
  FROM 
    facilities f,
    items i,
    facility_type_mappings ftm,
    facility_types ft
  WHERE 
    f.id = ftm.facility_id AND
    ftm.type_id = ft.id AND
    ft.name = 'donation' AND
    i.category_id IN (clothing_id, furniture_id, household_id) AND
    f.name IN ('Goodwill Donation Center', 'Salvation Army')
  ON CONFLICT (facility_id, item_id) DO NOTHING;

  -- Link hazardous items to disposal facilities
  INSERT INTO facility_items (id, facility_id, item_id, created_at)
  SELECT 
    uuid_generate_v4(),
    f.id,
    i.id,
    NOW()
  FROM 
    facilities f,
    items i,
    facility_type_mappings ftm,
    facility_types ft
  WHERE 
    f.id = ftm.facility_id AND
    ftm.type_id = ft.id AND
    ft.name = 'disposal' AND
    i.category_id = hazardous_id AND
    f.name = 'City Waste Management'
  ON CONFLICT (facility_id, item_id) DO NOTHING;
END $$; 