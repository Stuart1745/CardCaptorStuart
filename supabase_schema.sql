-- MTG Collection Tracker Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
CREATE TYPE card_condition AS ENUM ('NM', 'LP', 'MP', 'HP');
CREATE TYPE receipt_status AS ENUM ('Draft', 'Approved', 'Rejected');

-- 2. Create Tables

-- collection_items
CREATE TABLE collection_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_name TEXT NOT NULL,
    set_code TEXT NOT NULL,
    condition card_condition NOT NULL DEFAULT 'NM',
    is_foil BOOLEAN NOT NULL DEFAULT FALSE,
    language TEXT NOT NULL DEFAULT 'EN',
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_price DECIMAL(10, 2),
    market_price DECIMAL(10, 2),
    date_added TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    moxfield_id TEXT,
    in_cube BOOLEAN NOT NULL DEFAULT FALSE
);

-- sealed_inventory
CREATE TABLE sealed_inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    primary_set_code TEXT NOT NULL,
    bonus_sheet_codes TEXT[] DEFAULT '{}',
    drafting_notes TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_draftable BOOLEAN NOT NULL DEFAULT FALSE
);

-- decks
CREATE TABLE decks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL,
    moxfield_url TEXT
);

-- receipt_queue
CREATE TABLE receipt_queue (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor TEXT NOT NULL,
    date_received TIMESTAMP WITH TIME ZONE NOT NULL,
    card_name TEXT NOT NULL,
    set_code TEXT,
    condition TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    purchase_price DECIMAL(10, 2),
    status receipt_status NOT NULL DEFAULT 'Draft'
);

-- 3. Row Level Security (RLS)
-- Enable RLS on all tables
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sealed_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_queue ENABLE ROW LEVEL SECURITY;

-- Create policies so users can only view and manage their own data
CREATE POLICY "Users can manage their own collection items"
ON collection_items FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sealed inventory"
ON sealed_inventory FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own decks"
ON decks FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own receipt queue"
ON receipt_queue FOR ALL USING (auth.uid() = user_id);

-- Note: For the "Play Night" view-only access, we can create separate policies
-- later that allow anonymous or specific read-only access to specific users.
