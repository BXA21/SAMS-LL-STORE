-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    make VARCHAR(255) NOT NULL, -- GFO / AFO
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    product_type VARCHAR(255) NOT NULL, -- e.g., "Fire Extinguisher Ball", "Fire Extinguisher Flower Pot"
    short_description TEXT,
    overview TEXT,
    price DECIMAL(10, 3) NOT NULL, -- 3 decimal places for OMR (e.g. 12.000)
    currency VARCHAR(10) DEFAULT 'OMR' NOT NULL,
    weight VARCHAR(50) NOT NULL, -- e.g., "400 gms", "1.3 kgs"
    life_years INT DEFAULT 5 NOT NULL,
    quantity INT DEFAULT 1 NOT NULL, -- Pack qty
    stock INT DEFAULT 100 NOT NULL,
    images TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    key_features TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    specifications JSONB DEFAULT '{}'::jsonb NOT NULL,
    best_for TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    safety_notes TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    usage_areas TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. INQUIRIES TABLE
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255),
    quantity INT DEFAULT 1,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new' NOT NULL, -- 'new', 'contacted', 'quoted', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    company_name VARCHAR(255),
    notes TEXT,
    total_amount DECIMAL(10, 3) NOT NULL,
    currency VARCHAR(10) DEFAULT 'OMR' NOT NULL,
    status VARCHAR(50) DEFAULT 'pending_payment' NOT NULL, -- 'pending_payment', 'paid', 'failed', 'cancelled', 'refunded', 'manual_inquiry'
    payment_status VARCHAR(50) DEFAULT 'initiated' NOT NULL, -- 'initiated', 'pending', 'successful', 'failed', 'cancelled', 'refunded'
    payment_provider VARCHAR(50), -- 'paymob' or 'manual'
    paymob_order_id VARCHAR(255),
    paymob_transaction_id VARCHAR(255),
    items JSONB NOT NULL, -- fallback JSON snapshot of items
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. ORDER_ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_slug VARCHAR(255) NOT NULL,
    make VARCHAR(50) NOT NULL,
    weight VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 3) NOT NULL,
    total_price DECIMAL(10, 3) NOT NULL,
    currency VARCHAR(10) DEFAULT 'OMR' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    provider VARCHAR(50) DEFAULT 'paymob' NOT NULL,
    provider_order_id VARCHAR(255),
    provider_transaction_id VARCHAR(255),
    amount DECIMAL(10, 3) NOT NULL,
    currency VARCHAR(10) DEFAULT 'OMR' NOT NULL,
    status VARCHAR(50) DEFAULT 'initiated' NOT NULL, -- 'initiated', 'pending', 'successful', 'failed', 'cancelled', 'refunded'
    payment_url TEXT,
    iframe_url TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. PAYMENT_EVENTS TABLE (Webhook audit trail)
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    provider VARCHAR(50) DEFAULT 'paymob' NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    provider_transaction_id VARCHAR(255),
    payload JSONB NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. PRODUCT_PRICE_HISTORY TABLE
CREATE TABLE IF NOT EXISTS product_price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    old_price DECIMAL(10, 3) NOT NULL,
    new_price DECIMAL(10, 3) NOT NULL,
    currency VARCHAR(10) DEFAULT 'OMR' NOT NULL,
    changed_by VARCHAR(255),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CERTIFICATES TABLE
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    file_url TEXT,
    certificate_type VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TESTIMONIALS TABLE
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    company VARCHAR(255),
    message TEXT NOT NULL,
    rating INT DEFAULT 5 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. FAQS TABLE
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    order_index INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. SITE_SETTINGS TABLE
CREATE TABLE IF NOT EXISTS site_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. ADMIN_PROFILES TABLE
CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- references auth.users(id) in Supabase
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- RLS (ROW LEVEL SECURITY) POLICIES
-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Create basic Policies

-- Public Read / Authenticated Admin Edit
CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admin All Categories" ON categories FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Read Products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admin All Products" ON products FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Read Certificates" ON certificates FOR SELECT USING (is_active = true);
CREATE POLICY "Admin All Certificates" ON certificates FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Read Testimonials" ON testimonials FOR SELECT USING (is_active = true);
CREATE POLICY "Admin All Testimonials" ON testimonials FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Read FAQs" ON faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Admin All FAQs" ON faqs FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Read Site Settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Admin All Site Settings" ON site_settings FOR ALL TO authenticated USING (true);

-- Public Write/Insert, Admin Select/Edit for Inquiries & Orders
CREATE POLICY "Public Insert Inquiries" ON inquiries FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin All Inquiries" ON inquiries FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Insert Orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Select Own Orders" ON orders FOR SELECT USING (true); -- Can restrict to session or allow read for success page
CREATE POLICY "Admin All Orders" ON orders FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Insert Order Items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Select Order Items" ON order_items FOR SELECT USING (true);
CREATE POLICY "Admin All Order Items" ON order_items FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Insert Payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Select Payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Admin All Payments" ON payments FOR ALL TO authenticated USING (true);

CREATE POLICY "Public Insert Payment Events" ON payment_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin All Payment Events" ON payment_events FOR ALL TO authenticated USING (true);

-- Price History & Admin Profiles are Admin Only
CREATE POLICY "Admin All Price History" ON product_price_history FOR ALL TO authenticated USING (true);
CREATE POLICY "Admin All Profiles" ON admin_profiles FOR ALL TO authenticated USING (true);


-- -------------------------------------------------------------
-- SEED DATA
-- -------------------------------------------------------------

-- 1. Seed Categories
INSERT INTO categories (id, name, slug, description, image_url) VALUES 
('11111111-1111-1111-1111-111111111111', 'Fire Extinguisher Balls', 'fire-extinguisher-balls', 'Automatic fire extinguishing balls designed to activate on contact with flames, providing fast protection for various environments.', '/hero_bg.png'),
('22222222-2222-2222-2222-222222222222', 'Fire Extinguisher Flower Pots', 'fire-extinguisher-flower-pots', 'Decorative fire safety products designed to blend elegantly into interiors while serving as automatic fire suppression devices.', '/hero_bg.png')
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Products
INSERT INTO products (name, slug, make, category_id, product_type, short_description, overview, price, weight, life_years, quantity, stock, images, key_features, specifications, best_for, safety_notes, usage_areas, is_featured) VALUES
(
    'GFO Baby Fire Ball 400 gms',
    'gfo-baby-fire-ball-400-gms',
    'GFO',
    '11111111-1111-1111-1111-111111111111',
    'Fire Extinguisher Ball',
    'Compact self-activating baby fire safety ball designed for vehicles, electrical panels, and tight spaces.',
    'The GFO Baby Fire Ball 400 gms is a compact automatic fire suppression product designed for small spaces, car engines, and home electrical cabinets. It activates instantly when it comes into contact with open flames, helping suppress fire before it can spread.',
    12.000,
    '400 gms',
    5,
    1,
    100,
    ARRAY['/products/image_1_gfo_main_image.png', '/products/image_2_gfro_kitchen_image.png', '/products/image_3_gfo_electrical_socket_image.png', '/products/image_4_gfo_car_image.png', '/products/image_5_gfo_server_room_image.png'],
    ARRAY['Self-activating fire suppression', 'Compact and ultra-lightweight', 'Suitable for vehicle and small-space use', 'No special training required', '5-year maintenance-free product life', 'Non-toxic extinguishing powder'],
    '{"Product Type": "Fire Extinguisher Ball", "Make": "GFO", "Weight": "400 gms", "Life": "5 years", "Activation": "Flame contact", "Use": "Automatic fire suppression", "Quantity": "1 unit"}'::jsonb,
    ARRAY['Cars', 'Small cabinets', 'Electrical panels', 'Kitchen corners', 'Compact high-risk spaces'],
    ARRAY['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure', 'Consult SAMS for proper placement guidance'],
    ARRAY['Vehicles', 'Electrical panels', 'Kitchens', 'Homes', 'Offices'],
    true
),
(
    'GFO Fire Ball Extinguisher 1.3 kg',
    'gfo-fire-ball-extinguisher-1-3-kg',
    'GFO',
    '11111111-1111-1111-1111-111111111111',
    'Fire Extinguisher Ball',
    'A versatile automatic fire safety ball ideal for homes, kitchens, and general fire-risk zones.',
    'The GFO Fire Ball Extinguisher 1.3 kg is an automatic fire safety solution suitable for homes, offices, kitchens, stores, and general fire-risk zones. It can be placed or mounted in areas where fast automatic fire response is needed.',
    15.000,
    '1.3 kgs',
    5,
    1,
    100,
    ARRAY['/products/gfc_ball_image_1.png', '/products/gfc_ball_image_2.png', '/products/gfc_ball_image_3.png', '/products/gfc_ball_image_4.png'],
    ARRAY['Activates automatically on flame contact', 'Fast fire suppression support', 'Lightweight and easy to position', 'Suitable for indoor and selected outdoor spaces', 'No manual operation required', '5-year product life', 'Non-toxic and eco-friendly design'],
    '{"Product Type": "Fire Extinguisher Ball", "Make": "GFO", "Weight": "1.3 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Automatic fire suppression", "Quantity": "1 unit"}'::jsonb,
    ARRAY['Homes', 'Offices', 'Kitchens', 'Shops', 'Small warehouses', 'Electrical areas'],
    ARRAY['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure', 'Consult SAMS for proper placement guidance'],
    ARRAY['Homes', 'Offices', 'Kitchens', 'Warehouses', 'Shops'],
    true
),
(
    'AFO Fire Ball Extinguisher 1.5 kg',
    'afo-fire-ball-extinguisher-1-5-kg',
    'AFO',
    '11111111-1111-1111-1111-111111111111',
    'Fire Extinguisher Ball',
    'An automatic fire extinguisher ball optimized for residential, commercial, and shop security.',
    'The AFO Fire Ball Extinguisher 1.5 kg is a practical automatic fire suppression product designed for quick activation during fire emergencies. It provides added protection in residential, commercial, and retail environments.',
    18.000,
    '1.5 kgs',
    5,
    1,
    100,
    ARRAY['/products/afo_image_1.png', '/products/afo_image_2.png', '/products/afo_image_3.png', '/products/afo_image_4.png', '/products/afo_image_5.png'],
    ARRAY['Automatic activation after flame contact', 'Simple placement and handling', 'Suitable for multiple fire-risk environments', '5-year product life', 'No special training required', 'Helps reduce response time during emergencies'],
    '{"Product Type": "Fire Extinguisher Ball", "Make": "AFO", "Weight": "1.5 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Automatic fire suppression", "Quantity": "1 unit"}'::jsonb,
    ARRAY['Homes', 'Offices', 'Retail shops', 'Electrical rooms', 'Kitchens', 'Storage areas'],
    ARRAY['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure', 'Consult SAMS for proper placement guidance'],
    ARRAY['Homes', 'Offices', 'Shops', 'Electrical panels', 'Kitchens'],
    true
),
(
    'GFO Green Fire Ball 1.3 kg',
    'gfo-green-fire-ball-1-3-kg',
    'GFO',
    '11111111-1111-1111-1111-111111111111',
    'Fire Extinguisher Ball',
    'Vibrant blue-green fire safety ball optimized for commercial shops and electrical panels.',
    'The GFO Green Fire Ball 1.3 kg provides passive automatic protection for spaces with active electrical or chemical risks. Features high-visibility green branding and robust rapid-fuse activation.',
    16.500,
    '1.3 kgs',
    5,
    1,
    100,
    ARRAY['/products/gfo_green_fire_ball_1.jpg', '/products/gfo_green_fire_ball_2_kitchen.jpg', '/products/gfo_green_fire_ball_3_electrical.jpg', '/products/gfo_green_fire_ball_4_car.jpg', '/products/gfo_green_fire_ball_5_server_room.jpg'],
    ARRAY['Special Green Fire Off branding', 'High visibility safety color', 'Activates within 3-5 seconds on flame contact', 'Suitable for indoor installations', 'Maintenance-free 5-year life'],
    '{"Product Type": "Fire Extinguisher Ball", "Make": "GFO", "Weight": "1.3 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Automatic fire suppression", "Quantity": "1 unit"}'::jsonb,
    ARRAY['Retail shops', 'Commercial buildings', 'Switchboards', 'Server racks'],
    ARRAY['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure'],
    ARRAY['Shops', 'Offices', 'Electrical panels', 'Homes'],
    false
),
(
    'GFO Fire Drum 5 kg',
    'gfo-fire-drum-5-kg',
    'GFO',
    '11111111-1111-1111-1111-111111111111',
    'Fire Drum',
    'Heavy-duty cylindrical fire suppression drum designed for passive industrial safety coverage.',
    'The GFO Fire Drum 5 kg is a heavy-duty automatic fire suppression cylindrical drum designed for larger industrial spaces, factories, and warehouses. It triggers automatically when exposed to open flame.',
    40.000,
    '5 kgs',
    5,
    1,
    100,
    ARRAY['/products/gfo_fire_drum_1.jpg', '/products/gfo_fire_drum_2_mall.jpg', '/products/gfo_fire_drum_3_industrial.jpg', '/products/gfo_fire_drum_4_warehouse.jpg', '/products/gfo_fire_drum_5_parking.jpg'],
    ARRAY['Cylindrical heavy-duty body', 'High capacity dry chemical charge', 'Self-activates on flame contact', 'Designed for passive industrial coverage', '5-year product life'],
    '{"Product Type": "Fire Safety Drum", "Make": "GFO", "Weight": "5 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Industrial automatic fire suppression", "Quantity": "1 unit"}'::jsonb,
    ARRAY['Factories', 'Warehouses', 'Large electrical rooms', 'Storage units', 'Industrial workshops'],
    ARRAY['Designed to support fire suppression in large zones', 'Can help contain industrial fires before spread', 'Consult SAMS for warehouse placement layouts'],
    ARRAY['Factories', 'Warehouses', 'Industrial spaces', 'Server rooms'],
    false
),
(
    'GFO Flowerpot Extinguisher 1.3 kg',
    'gfo-flowerpot-extinguisher-1-3-kg',
    'GFO',
    '22222222-2222-2222-2222-222222222222',
    'Fire Extinguisher Flower Pot',
    'An elegant, decorative automatic fire extinguishing pot matching room decor.',
    'The GFO Flowerpot Extinguisher 1.3 kg combines safety and decoration in one product. It is designed to look like a flower pot while functioning as an automatic fire suppression device when exposed to flames.',
    18.000,
    '1.3 kgs',
    5,
    1,
    100,
    ARRAY['/products/flower_image_1.png', '/products/flower_image_2_kitchen.png', '/products/flower_image_3_server_room.png'],
    ARRAY['Decorative fire safety product', 'Blends into home and office interiors', 'Self-activating fire suppression', 'Lightweight and easy to place', 'No special training required', '5-year product life', 'Suitable for visible indoor placement'],
    '{"Product Type": "Fire Extinguisher Flower Pot", "Make": "GFO", "Weight": "1.3 kgs", "Life": "5 years", "Activation": "Flame contact", "Use": "Decorative automatic fire suppression", "Quantity": "1 unit"}'::jsonb,
    ARRAY['Homes', 'Offices', 'Reception areas', 'Restaurants', 'Decorative indoor spaces'],
    ARRAY['Designed to support fire suppression', 'Helps provide automatic fire response', 'Can help reduce fire spread', 'Suitable as a supplementary safety measure', 'Consult SAMS for proper placement guidance'],
    ARRAY['Homes', 'Offices', 'Restaurants', 'Shops'],
    true
)
ON CONFLICT (slug) DO NOTHING;

-- 3. Seed FAQs
INSERT INTO faqs (question, answer, order_index) VALUES 
('What is the effectiveness of fire balls?', 'Fire balls are designed to provide an automatic fire-fighting response. They activate when they come into contact with flames, making them an effective supplementary safety measure for high-risk fire areas.', 1),
('How effective is a fire extinguisher ball?', 'A fire extinguisher ball is designed to suppress fire quickly after flame contact. When flames touch the ball, the fuse mechanism activates and releases extinguishing powder within seconds.', 2),
('What is a fire ball extinguisher?', 'A fire ball extinguisher is a spherical fire suppression device used during fire emergencies. It works similarly to traditional extinguishers but is designed for automatic activation and easy placement.', 3),
('Does the product require training?', 'No special training is required. The product is designed for simple use and automatic activation. Anyone can place it or throw it in case of an emergency.', 4),
('Where can it be placed?', 'It can be placed near kitchens, electrical panels, vehicles, warehouses, factories, server rooms, offices, homes, and other fire-prone areas.', 5),
('How long is the product life?', 'The active lifespan of both our automatic fire balls and decorative flower pots is 5 years. There is no maintenance or refilling required during this period.', 6),
('Can it be used in vehicles?', 'Yes, the 400 gms compact ball is specifically recommended for vehicles, engine compartments, and car trunks due to its lightweight and portable design.', 7),
('Can it be used near electrical panels?', 'Yes, placing it inside or directly above electrical panels is highly effective as it will automatically suppress electrical fires at the source before they can spread.', 8)
ON CONFLICT DO NOTHING;

-- 4. Seed Testimonials
INSERT INTO testimonials (name, position, company, message, rating) VALUES 
('Rahul Kumar', 'Safety Director', 'Oman Logistics', 'SAMS exceeded my expectations. Their fire safety products are top-notch, and their customer service is excellent. Highly recommended.', 5),
('Mohsin Abbas', 'Operations Manager', 'Muscat Residences', 'We have been using SAMS fire extinguishers for years, and they have never let us down. Reliable and easy to use.', 5),
('Ashutosh Rai', 'Facility Head', 'Industrial Hub Sohar', 'The effectiveness of SAMS fire suppression devices is impressive. They provide peace of mind knowing we are protected in emergencies.', 5)
ON CONFLICT DO NOTHING;

-- 5. Seed Certificates
INSERT INTO certificates (title, description, image_url, file_url, certificate_type) VALUES 
('MSDS Certificate', 'Material Safety Data Sheet confirming the non-toxic nature of the fire extinguishing agents.', '/hero_bg.png', '#', 'Safety Documentation'),
('Product Test Certificate', 'Official laboratory test document confirming the 3-5 seconds flame contact activation response.', '/hero_bg.png', '#', 'Performance Certificate'),
('UL Certificate DCP ABC', 'Underwriters Laboratories standard validation for dry chemical powder suppression agents.', '/hero_bg.png', '#', 'Quality Standard'),
('Certificate 4', 'Standard safety compliance documentation from SAMS.', '/hero_bg.png', '#', 'Compliance'),
('Certificate 5', 'Official quality assurance document from manufacturer.', '/hero_bg.png', '#', 'Compliance')
ON CONFLICT DO NOTHING;

-- 6. Seed Site Settings
INSERT INTO site_settings (key, value) VALUES 
('hero_headline', 'PROTECT WHAT  
MATTERS  
BEFORE FIRE  
SPREADS'),
('hero_subtitle', 'Explore automatic fire extinguishing solutions designed to activate quickly, help reduce fire spread, and provide peace of mind for homes, offices, vehicles, warehouses, and industrial spaces.'),
('contact_phone', '+968 24000000'),
('contact_whatsapp', '+968 90000000'),
('contact_email', 'info@sams-oman.com'),
('contact_address', 'Muscat, Sultanate of Oman'),
('currency', 'OMR')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
