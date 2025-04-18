INSERT INTO items (id, name, category_id, notes, description, average_value, average_carbon_offset, created_at, updated_at) VALUES
-- Clothing
('clothing-1', 'T-shirts', 'clothing', NULL, 'T-shirts of various types', 10.00, 2.50, NOW(), NOW()),
('clothing-2', 'Jeans', 'clothing', NULL, 'Denim jeans', 15.00, 3.00, NOW(), NOW()),
('clothing-3', 'Sweaters', 'clothing', NULL, 'Warm sweaters', 20.00, 2.75, NOW(), NOW()),
('clothing-4', 'Jackets', 'clothing', NULL, 'Various jackets and coats', 30.00, 4.50, NOW(), NOW()),
('clothing-5', 'Shoes', 'clothing', NULL, 'All types of footwear', 25.00, 3.25, NOW(), NOW()),

-- Furniture
('furniture-1', 'Sofa', 'furniture', NULL, 'Sofas and couches', 150.00, 20.00, NOW(), NOW()),
('furniture-2', 'Table', 'furniture', NULL, 'Tables of all sizes', 100.00, 15.00, NOW(), NOW()),
('furniture-3', 'Chair', 'furniture', NULL, 'Chairs and stools', 50.00, 8.00, NOW(), NOW()),
('furniture-4', 'Bookshelf', 'furniture', NULL, 'Bookshelves and bookcases', 75.00, 12.50, NOW(), NOW()),
('furniture-5', 'Bed Frame', 'furniture', NULL, 'Bed frames of various sizes', 125.00, 18.00, NOW(), NOW()),

-- Electronics
('electronics-1', 'Smartphones', 'electronics', 'Make sure to wipe all data', 'Mobile phones', 100.00, 15.00, NOW(), NOW()),
('electronics-2', 'Laptops', 'electronics', 'Make sure to wipe all data', 'Laptop computers', 200.00, 25.00, NOW(), NOW()),
('electronics-3', 'Tablets', 'electronics', 'Make sure to wipe all data', 'Tablet devices', 150.00, 20.00, NOW(), NOW()),
('electronics-4', 'TV Sets', 'electronics', NULL, 'Television sets', 175.00, 22.50, NOW(), NOW()),
('electronics-5', 'Cables & Chargers', 'electronics', NULL, 'Various electronic accessories', 10.00, 1.50, NOW(), NOW()),

-- Kitchenware
('kitchenware-1', 'Pots & Pans', 'kitchenware', NULL, 'Cookware for kitchen use', 40.00, 5.00, NOW(), NOW()),
('kitchenware-2', 'Dishes', 'kitchenware', NULL, 'Plates and dishes', 30.00, 4.00, NOW(), NOW()),
('kitchenware-3', 'Utensils', 'kitchenware', NULL, 'Kitchen utensils', 15.00, 2.00, NOW(), NOW()),
('kitchenware-4', 'Small Appliances', 'kitchenware', NULL, 'Toasters, blenders, etc.', 50.00, 7.50, NOW(), NOW()),
('kitchenware-5', 'Glassware', 'kitchenware', NULL, 'Glasses and cups', 25.00, 3.00, NOW(), NOW()),

-- Books
('books-1', 'Hardcover Books', 'books', NULL, 'Hardcover bound books', 8.00, 1.50, NOW(), NOW()),
('books-2', 'Paperback Books', 'books', NULL, 'Paperback books', 5.00, 1.00, NOW(), NOW()),
('books-3', 'Textbooks', 'books', NULL, 'Educational textbooks', 15.00, 2.00, NOW(), NOW()),
('books-4', 'Children''s Books', 'books', NULL, 'Books for children', 6.00, 1.25, NOW(), NOW()),
('books-5', 'Comic Books', 'books', NULL, 'Comic books and graphic novels', 7.00, 1.25, NOW(), NOW()),

-- Toys
('toys-1', 'Action Figures', 'toys', NULL, 'Action figures and dolls', 10.00, 1.50, NOW(), NOW()),
('toys-2', 'Board Games', 'toys', NULL, 'Board and card games', 15.00, 2.00, NOW(), NOW()),
('toys-3', 'Puzzles', 'toys', NULL, 'Puzzles of various types', 8.00, 1.25, NOW(), NOW()),
('toys-4', 'Stuffed Animals', 'toys', NULL, 'Plush toys', 7.00, 1.00, NOW(), NOW()),
('toys-5', 'Building Blocks', 'toys', NULL, 'Construction and building toys', 12.00, 1.75, NOW(), NOW()),

-- Home Goods
('homegoods-1', 'Decorative Items', 'homegoods', NULL, 'Home decor items', 15.00, 2.00, NOW(), NOW()),
('homegoods-2', 'Picture Frames', 'homegoods', NULL, 'Frames for photos and art', 10.00, 1.50, NOW(), NOW()),
('homegoods-3', 'Pillows', 'homegoods', 'Some charities reject pillows', 'Decorative and bed pillows', 12.00, 1.75, NOW(), NOW()),
('homegoods-4', 'Blankets', 'homegoods', NULL, 'Blankets and throws', 20.00, 2.50, NOW(), NOW()),
('homegoods-5', 'Lamps', 'homegoods', NULL, 'Lighting fixtures', 25.00, 3.00, NOW(), NOW()),

-- Sports Gear
('sportsgear-1', 'Bicycles', 'sportsgear', NULL, 'Bikes for all ages', 75.00, 10.00, NOW(), NOW()),
('sportsgear-2', 'Sports Equipment', 'sportsgear', NULL, 'Various sporting goods', 30.00, 4.00, NOW(), NOW()),
('sportsgear-3', 'Bicycle Helmets', 'sportsgear', 'Check for cracks or damage', 'Safety helmets', 15.00, 2.00, NOW(), NOW()),
('sportsgear-4', 'Weights', 'sportsgear', NULL, 'Exercise weights', 25.00, 3.50, NOW(), NOW()),
('sportsgear-5', 'Camping Gear', 'sportsgear', NULL, 'Equipment for camping', 40.00, 5.00, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
name = EXCLUDED.name, 
category_id = EXCLUDED.category_id, 
notes = EXCLUDED.notes, 
description = EXCLUDED.description,
average_value = EXCLUDED.average_value,
average_carbon_offset = EXCLUDED.average_carbon_offset,
updated_at = NOW(); 