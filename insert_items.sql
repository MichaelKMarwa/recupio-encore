INSERT INTO items (id, name, category_id, notes, created_at, updated_at) VALUES
-- Clothing
('clothing-1', 'T-shirts', 'clothing', NULL, NOW(), NOW()),
('clothing-2', 'Jeans', 'clothing', NULL, NOW(), NOW()),
('clothing-3', 'Sweaters', 'clothing', NULL, NOW(), NOW()),
('clothing-4', 'Jackets', 'clothing', NULL, NOW(), NOW()),
('clothing-5', 'Shoes', 'clothing', NULL, NOW(), NOW()),

-- Furniture
('furniture-1', 'Sofa', 'furniture', NULL, NOW(), NOW()),
('furniture-2', 'Table', 'furniture', NULL, NOW(), NOW()),
('furniture-3', 'Chair', 'furniture', NULL, NOW(), NOW()),
('furniture-4', 'Bookshelf', 'furniture', NULL, NOW(), NOW()),
('furniture-5', 'Bed Frame', 'furniture', NULL, NOW(), NOW()),

-- Electronics
('electronics-1', 'Smartphones', 'electronics', 'Make sure to wipe all data', NOW(), NOW()),
('electronics-2', 'Laptops', 'electronics', 'Make sure to wipe all data', NOW(), NOW()),
('electronics-3', 'Tablets', 'electronics', 'Make sure to wipe all data', NOW(), NOW()),
('electronics-4', 'TV Sets', 'electronics', NULL, NOW(), NOW()),
('electronics-5', 'Cables & Chargers', 'electronics', NULL, NOW(), NOW()),

-- Kitchenware
('kitchenware-1', 'Pots & Pans', 'kitchenware', NULL, NOW(), NOW()),
('kitchenware-2', 'Dishes', 'kitchenware', NULL, NOW(), NOW()),
('kitchenware-3', 'Utensils', 'kitchenware', NULL, NOW(), NOW()),
('kitchenware-4', 'Small Appliances', 'kitchenware', NULL, NOW(), NOW()),
('kitchenware-5', 'Glassware', 'kitchenware', NULL, NOW(), NOW()),

-- Books
('books-1', 'Hardcover Books', 'books', NULL, NOW(), NOW()),
('books-2', 'Paperback Books', 'books', NULL, NOW(), NOW()),
('books-3', 'Textbooks', 'books', NULL, NOW(), NOW()),
('books-4', 'Children''s Books', 'books', NULL, NOW(), NOW()),
('books-5', 'Comic Books', 'books', NULL, NOW(), NOW()),

-- Toys
('toys-1', 'Action Figures', 'toys', NULL, NOW(), NOW()),
('toys-2', 'Board Games', 'toys', NULL, NOW(), NOW()),
('toys-3', 'Puzzles', 'toys', NULL, NOW(), NOW()),
('toys-4', 'Stuffed Animals', 'toys', NULL, NOW(), NOW()),
('toys-5', 'Building Blocks', 'toys', NULL, NOW(), NOW()),

-- Home Goods
('homegoods-1', 'Decorative Items', 'homegoods', NULL, NOW(), NOW()),
('homegoods-2', 'Picture Frames', 'homegoods', NULL, NOW(), NOW()),
('homegoods-3', 'Pillows', 'homegoods', 'Some charities reject pillows', NOW(), NOW()),
('homegoods-4', 'Blankets', 'homegoods', NULL, NOW(), NOW()),
('homegoods-5', 'Lamps', 'homegoods', NULL, NOW(), NOW()),

-- Sports Gear
('sportsgear-1', 'Bicycles', 'sportsgear', NULL, NOW(), NOW()),
('sportsgear-2', 'Sports Equipment', 'sportsgear', NULL, NOW(), NOW()),
('sportsgear-3', 'Bicycle Helmets', 'sportsgear', 'Check for cracks or damage', NOW(), NOW()),
('sportsgear-4', 'Weights', 'sportsgear', NULL, NOW(), NOW()),
('sportsgear-5', 'Camping Gear', 'sportsgear', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
name = EXCLUDED.name, category_id = EXCLUDED.category_id, notes = EXCLUDED.notes, updated_at = NOW(); 