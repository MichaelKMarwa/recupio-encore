CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE drop_offs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_session_id VARCHAR(255) REFERENCES guest_sessions(session_id) ON DELETE SET NULL,
    facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    drop_off_date TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL)
);

CREATE TABLE drop_off_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drop_off_id UUID NOT NULL REFERENCES drop_offs(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(drop_off_id, item_id)
);

CREATE TABLE donation_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drop_off_id UUID NOT NULL REFERENCES drop_offs(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL UNIQUE,
    receipt_url VARCHAR(255) NOT NULL,
    total_value DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(receipt_number)
);

-- Indexes for better query performance
CREATE INDEX idx_drop_offs_user_id ON drop_offs(user_id);
CREATE INDEX idx_drop_offs_guest_session_id ON drop_offs(guest_session_id);
CREATE INDEX idx_drop_offs_facility_id ON drop_offs(facility_id);
CREATE INDEX idx_drop_offs_drop_off_date ON drop_offs(drop_off_date);
CREATE INDEX idx_drop_off_items_drop_off_id ON drop_off_items(drop_off_id);
CREATE INDEX idx_donation_receipts_drop_off_id ON donation_receipts(drop_off_id);
