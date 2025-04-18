INSERT INTO categories (id, name, icon, description, created_at, updated_at) VALUES
('clothing', 'Clothing', 'Shirt', 'Clothing items', NOW(), NOW()),
('furniture', 'Furniture', 'Sofa', 'Furniture items', NOW(), NOW()),
('electronics', 'Electronics', 'Smartphone', 'Electronic devices', NOW(), NOW()),
('kitchenware', 'Kitchenware', 'Utensils', 'Kitchen items', NOW(), NOW()),
('books', 'Books', 'BookOpen', 'Books', NOW(), NOW()),
('toys', 'Toys', 'Gamepad2', 'Toys', NOW(), NOW()),
('homegoods', 'Home Goods', 'Lamp', 'Home goods', NOW(), NOW()),
('sportsgear', 'Sports Gear', 'Dumbbell', 'Sports equipment', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
name = EXCLUDED.name, icon = EXCLUDED.icon, description = EXCLUDED.description, updated_at = NOW(); 