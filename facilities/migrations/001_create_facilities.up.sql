CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

CREATE TABLE facility_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE facilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('donation', 'recycling', 'trash', 'mixed')),
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    phone TEXT NOT NULL,
    website TEXT,
    hours TEXT NOT NULL,
    accepted_items TEXT[] NOT NULL,
    rejected_items TEXT[],
    notes TEXT,
    distance FLOAT,
    rating FLOAT CHECK (rating BETWEEN 0 AND 5),
    image_url TEXT,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    tags TEXT[] NOT NULL,
    description TEXT NOT NULL,
    tax_deductible BOOLEAN NOT NULL,
    pickup_available BOOLEAN NOT NULL
);

CREATE TABLE facility_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(facility_id, day_of_week)
);

CREATE TABLE facility_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(facility_id, item_id)
);

CREATE TABLE facility_type_mappings (
    facility_id TEXT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    type_id UUID NOT NULL REFERENCES facility_types(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (facility_id, type_id)
);

-- Indexes for better query performance
CREATE INDEX idx_facilities_location ON facilities USING GIN (to_tsvector('english', name || ' ' || address || ' ' || description));
CREATE INDEX idx_facilities_zip_code ON facilities(zip_code);
CREATE INDEX idx_facility_hours_facility_id ON facility_hours(facility_id);
CREATE INDEX idx_facility_items_facility_id ON facility_items(facility_id);
CREATE INDEX idx_facility_items_item_id ON facility_items(item_id);

-- Create indexes for common query patterns
CREATE INDEX idx_facilities_type ON facilities(type);
CREATE INDEX idx_facilities_city ON facilities(city);
CREATE INDEX idx_facilities_zip_code_second ON facilities(zip_code);
CREATE INDEX idx_facilities_rating ON facilities(rating);
