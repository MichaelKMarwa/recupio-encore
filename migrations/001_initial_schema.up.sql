-- Create users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create guest_sessions table
CREATE TABLE guest_sessions (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create items table
CREATE TABLE items (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id VARCHAR(255) NOT NULL,
    description TEXT,
    notes TEXT,
    average_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    average_carbon_offset DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create item_categories table
CREATE TABLE item_categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create facilities table
CREATE TABLE facilities (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('donation', 'recycling', 'disposal')),
    description TEXT,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),
    email VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    notes TEXT,
    tax_deductible BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create facility_hours table
CREATE TABLE facility_hours (
    id VARCHAR(255) PRIMARY KEY,
    facility_id VARCHAR(255) REFERENCES facilities(id),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT false,
    UNIQUE(facility_id, day_of_week)
);

-- Create facility_items table
CREATE TABLE facility_items (
    facility_id VARCHAR(255) REFERENCES facilities(id),
    item_id VARCHAR(255) REFERENCES items(id),
    is_accepted BOOLEAN DEFAULT true,
    notes TEXT,
    PRIMARY KEY (facility_id, item_id)
);

-- Create facility_reviews table
CREATE TABLE facility_reviews (
    id VARCHAR(255) PRIMARY KEY,
    facility_id VARCHAR(255) REFERENCES facilities(id),
    user_id VARCHAR(255) REFERENCES users(id),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create drop_offs table
CREATE TABLE drop_offs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    guest_session_id VARCHAR(255) REFERENCES guest_sessions(id),
    facility_id VARCHAR(255) REFERENCES facilities(id),
    drop_off_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL)
);

-- Create drop_off_items table
CREATE TABLE drop_off_items (
    id VARCHAR(255) PRIMARY KEY,
    drop_off_id VARCHAR(255) REFERENCES drop_offs(id),
    item_id VARCHAR(255) REFERENCES items(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    condition VARCHAR(20) CHECK (condition IN ('new', 'used', 'refurbished')),
    estimated_value DECIMAL(10,2) NOT NULL,
    carbon_offset DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- Create tax_receipts table
CREATE TABLE tax_receipts (
    id VARCHAR(255) PRIMARY KEY,
    drop_off_id VARCHAR(255) REFERENCES drop_offs(id),
    user_id VARCHAR(255) REFERENCES users(id),
    receipt_number VARCHAR(255) UNIQUE NOT NULL,
    receipt_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tax_year INTEGER NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    receipt_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create premium_features table
CREATE TABLE premium_features (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_premium_features table
CREATE TABLE user_premium_features (
    user_id VARCHAR(255) REFERENCES users(id),
    feature_id VARCHAR(255) REFERENCES premium_features(id),
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, feature_id)
);

-- Create payments table
CREATE TABLE payments (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    feature_id VARCHAR(255) REFERENCES premium_features(id),
    payment_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create impact_metrics table
CREATE TABLE impact_metrics (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    carbon_offset DECIMAL(10,2) NOT NULL DEFAULT 0,
    trees_equivalent DECIMAL(10,2) NOT NULL DEFAULT 0,
    landfill_reduction DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_preferences table
CREATE TABLE user_preferences (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id),
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);