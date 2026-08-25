-- ============================================
-- CommerceAI — Seed Data SQL
-- ============================================

-- 1. Insert Merchant
INSERT INTO merchants (id, name, email, description)
VALUES ('e1111111-1111-1111-1111-111111111111', 'CommerceAI Tech Hub', 'partner@commerceai.tech', 'Primary retail merchant partner for premium tech products.')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Products & Inventory
-- Helper CTE to reference the merchant
-- Laptop 1: MacBook Pro 16
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'e1111111-1111-1111-1111-111111111111',
  'Apple MacBook Pro 16 (M3 Max)',
  'Premium laptop with Apple M3 Max chip (16-core CPU, 40-core GPU), 36GB unified memory, and 1TB SSD. Liquid Retina XDR display.',
  349900.00,
  'laptops',
  '{"brand": "Apple", "cpu": "M3 Max", "ram": "36GB", "storage": "1TB SSD", "screen_size": "16.2 inch"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 15)
ON CONFLICT (id) DO NOTHING;

-- Laptop 2: Dell XPS 15
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111112',
  'e1111111-1111-1111-1111-111111111111',
  'Dell XPS 15 9530',
  'High-performance laptop featuring Intel Core i9-13900H, 32GB DDR5 RAM, 1TB NVMe SSD, and NVIDIA GeForce RTX 4070 GPU.',
  249999.00,
  'laptops',
  '{"brand": "Dell", "cpu": "Intel Core i9", "ram": "32GB", "storage": "1TB SSD", "gpu": "RTX 4070"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111112', 'a1111111-1111-1111-1111-111111111112', 20)
ON CONFLICT (id) DO NOTHING;

-- Laptop 3: ThinkPad X1 Carbon
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111113',
  'e1111111-1111-1111-1111-111111111111',
  'Lenovo ThinkPad X1 Carbon Gen 11',
  'Ultra-light business laptop with Intel Core i7-1355U, 16GB RAM, 512GB NVMe SSD, and 14-inch IPS display with privacy guard.',
  189999.00,
  'laptops',
  '{"brand": "Lenovo", "cpu": "Intel Core i7", "ram": "16GB", "storage": "512GB SSD", "screen_size": "14 inch"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111113', 'a1111111-1111-1111-1111-111111111113', 25)
ON CONFLICT (id) DO NOTHING;

-- Laptop 4: ASUS ROG Zephyrus G14
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111114',
  'e1111111-1111-1111-1111-111111111111',
  'ASUS ROG Zephyrus G14 OLED',
  'Slim and powerful gaming laptop with AMD Ryzen 9 8945HS, 16GB LPDDR5X RAM, 1TB PCIe 4.0 SSD, and NVIDIA RTX 4060 GPU.',
  149999.00,
  'laptops',
  '{"brand": "ASUS", "cpu": "AMD Ryzen 9", "ram": "16GB", "storage": "1TB SSD", "gpu": "RTX 4060"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111114', 'a1111111-1111-1111-1111-111111111114', 12)
ON CONFLICT (id) DO NOTHING;

-- Laptop 5: HP Pavilion 15
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111115',
  'e1111111-1111-1111-1111-111111111111',
  'HP Pavilion 15',
  'Reliable everyday laptop powered by AMD Ryzen 5 5625U, 8GB DDR4 RAM, and 512GB PCIe NVMe SSD. Full HD micro-edge display.',
  54999.00,
  'laptops',
  '{"brand": "HP", "cpu": "AMD Ryzen 5", "ram": "8GB", "storage": "512GB SSD"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111115', 'a1111111-1111-1111-1111-111111111115', 50)
ON CONFLICT (id) DO NOTHING;

-- Smartphone 1: iPhone 15 Pro Max
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111121',
  'e1111111-1111-1111-1111-111111111111',
  'Apple iPhone 15 Pro Max',
  'Latest flagship iPhone with a strong, lightweight titanium design, A17 Pro chip, 48MP primary camera, and 256GB storage.',
  159900.00,
  'smartphones',
  '{"brand": "Apple", "chipset": "A17 Pro", "storage": "256GB", "color": "Natural Titanium"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111121', 'a1111111-1111-1111-1111-111111111121', 30)
ON CONFLICT (id) DO NOTHING;

-- Smartphone 2: Galaxy S24 Ultra
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111122',
  'e1111111-1111-1111-1111-111111111111',
  'Samsung Galaxy S24 Ultra',
  'Ultimate Android smartphone with Snapdragon 8 Gen 3, integrated S Pen, 200MP camera system, 12GB RAM, and 512GB storage.',
  139999.00,
  'smartphones',
  '{"brand": "Samsung", "chipset": "Snapdragon 8 Gen 3", "storage": "512GB", "ram": "12GB"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111122', 'a1111111-1111-1111-1111-111111111122', 40)
ON CONFLICT (id) DO NOTHING;

-- Smartphone 3: Google Pixel 8 Pro
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111123',
  'e1111111-1111-1111-1111-111111111111',
  'Google Pixel 8 Pro',
  'Advanced Google phone with Tensor G3 chip, AI-first camera features, 120Hz Super Actua display, and 128GB storage.',
  106999.00,
  'smartphones',
  '{"brand": "Google", "chipset": "Tensor G3", "storage": "128GB", "ram": "12GB"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111123', 'a1111111-1111-1111-1111-111111111123', 18)
ON CONFLICT (id) DO NOTHING;

-- Smartphone 4: OnePlus 12
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111124',
  'e1111111-1111-1111-1111-111111111111',
  'OnePlus 12 5G',
  'High-end smartphone featuring Snapdragon 8 Gen 3, Hasselblad Camera for Mobile, 100W SUPERVOOC charging, and 256GB storage.',
  64999.00,
  'smartphones',
  '{"brand": "OnePlus", "chipset": "Snapdragon 8 Gen 3", "storage": "256GB", "ram": "12GB"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111124', 'a1111111-1111-1111-1111-111111111124', 35)
ON CONFLICT (id) DO NOTHING;

-- Smartphone 5: Galaxy A54
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111125',
  'e1111111-1111-1111-1111-111111111111',
  'Samsung Galaxy A54 5G',
  'Mid-range smartphone with 120Hz Super AMOLED display, 50MP triple-camera setup, and IP67 dust/water resistance. 128GB storage.',
  35499.00,
  'smartphones',
  '{"brand": "Samsung", "chipset": "Exynos 1380", "storage": "128GB", "ram": "8GB"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111125', 'a1111111-1111-1111-1111-111111111125', 50)
ON CONFLICT (id) DO NOTHING;

-- Headphone 1: Sony WH-1000XM5
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111131',
  'e1111111-1111-1111-1111-111111111111',
  'Sony WH-1000XM5 Noise Cancelling Headphones',
  'Industry-leading active noise cancelling wireless over-ear headphones with 30-hour battery life and exceptional call quality.',
  29990.00,
  'headphones',
  '{"brand": "Sony", "battery_life": "30 hours", "type": "Over-Ear", "anc": true}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111131', 'a1111111-1111-1111-1111-111111111131', 80)
ON CONFLICT (id) DO NOTHING;

-- Headphone 2: Bose QC Ultra
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111132',
  'e1111111-1111-1111-1111-111111111111',
  'Bose QuietComfort Ultra Headphones',
  'Flagship wireless headphones from Bose featuring spatial audio, custom tune technology, and world-class noise cancellation.',
  35999.00,
  'headphones',
  '{"brand": "Bose", "battery_life": "24 hours", "type": "Over-Ear", "anc": true}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111132', 'a1111111-1111-1111-1111-111111111132', 65)
ON CONFLICT (id) DO NOTHING;

-- Headphone 3: AirPods Max
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111133',
  'e1111111-1111-1111-1111-111111111111',
  'Apple AirPods Max',
  'Premium over-ear wireless headphones with custom high-fidelity audio driver, active noise cancellation, and transparency mode.',
  59900.00,
  'headphones',
  '{"brand": "Apple", "battery_life": "20 hours", "type": "Over-Ear", "anc": true}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111133', 'a1111111-1111-1111-1111-111111111133', 25)
ON CONFLICT (id) DO NOTHING;

-- Headphone 4: Sennheiser HD 660S2
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111134',
  'e1111111-1111-1111-1111-111111111111',
  'Sennheiser HD 660S2',
  'Open-back audiophile dynamic headphones offering exceptional detail, spatial accuracy, and extended sub-bass performance.',
  42990.00,
  'headphones',
  '{"brand": "Sennheiser", "type": "Open-Back Over-Ear", "impedance": "300 Ohm"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111134', 'a1111111-1111-1111-1111-111111111134', 15)
ON CONFLICT (id) DO NOTHING;

-- Headphone 5: Audio-Technica ATH-M50x
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111135',
  'e1111111-1111-1111-1111-111111111111',
  'Audio-Technica ATH-M50x Professional Studio Monitor Headphones',
  'Critically acclaimed closed-back professional monitor headphones featuring detailed sound, clear highs, and robust bass response.',
  11999.00,
  'headphones',
  '{"brand": "Audio-Technica", "type": "Closed-Back Over-Ear", "impedance": "38 Ohm"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111135', 'a1111111-1111-1111-1111-111111111135', 120)
ON CONFLICT (id) DO NOTHING;

-- Keyboard 1: Keychron Q1 Pro
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111141',
  'e1111111-1111-1111-1111-111111111111',
  'Keychron Q1 Pro Wireless Mechanical Keyboard',
  'Full aluminum custom wireless mechanical keyboard with 75% layout, hot-swappable Keychron K Pro red linear switches, and RGB backlighting.',
  17999.00,
  'keyboards',
  '{"brand": "Keychron", "layout": "75%", "switches": "Linear Red", "connectivity": "Bluetooth/Wired"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111141', 'a1111111-1111-1111-1111-111111111141', 40)
ON CONFLICT (id) DO NOTHING;

-- Keyboard 2: MX Keys S
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111142',
  'e1111111-1111-1111-1111-111111111111',
  'Logitech MX Keys S Advanced Wireless Keyboard',
  'Sleek, low-profile wireless keyboard featuring smart backlighting, programmable keys, and quiet tactile typing keycaps.',
  12995.00,
  'keyboards',
  '{"brand": "Logitech", "layout": "Full size", "type": "Membrane Scissor", "connectivity": "Logi Bolt/Bluetooth"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111142', 'a1111111-1111-1111-1111-111111111142', 90)
ON CONFLICT (id) DO NOTHING;

-- Keyboard 3: SteelSeries Apex Pro
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111143',
  'e1111111-1111-1111-1111-111111111111',
  'SteelSeries Apex Pro Mechanical Gaming Keyboard',
  'High-speed gaming keyboard featuring OmniPoint 2.0 adjustable mechanical switches, smart OLED display, and premium magnetic wrist rest.',
  21999.00,
  'keyboards',
  '{"brand": "SteelSeries", "layout": "Full size", "switches": "Adjustable OmniPoint", "connectivity": "Wired"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111143', 'a1111111-1111-1111-1111-111111111143', 25)
ON CONFLICT (id) DO NOTHING;

-- Keyboard 4: BlackWidow V4
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111144',
  'e1111111-1111-1111-1111-111111111111',
  'Razer BlackWidow V4',
  'Premium full-sized mechanical gaming keyboard with Razer Green clicky switches, 6 dedicated macro keys, and plush wrist rest.',
  15999.00,
  'keyboards',
  '{"brand": "Razer", "layout": "Full size", "switches": "Clicky Green", "connectivity": "Wired"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111144', 'a1111111-1111-1111-1111-111111111144', 30)
ON CONFLICT (id) DO NOTHING;

-- Keyboard 5: Royal Kludge RK61
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111145',
  'e1111111-1111-1111-1111-111111111111',
  'Royal Kludge RK61 Wireless Mechanical Keyboard',
  'Compact 60% layout mechanical keyboard with hot-swappable RK brown tactile switches, dual-mode wireless, and yellow backlighting.',
  4499.00,
  'keyboards',
  '{"brand": "Royal Kludge", "layout": "60%", "switches": "Tactile Brown", "connectivity": "Bluetooth/Wired"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111145', 'a1111111-1111-1111-1111-111111111145', 110)
ON CONFLICT (id) DO NOTHING;

-- Monitor 1: LG UltraGear OLED
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111151',
  'e1111111-1111-1111-1111-111111111111',
  'LG UltraGear 27GR95QE-B 27" OLED Gaming Monitor',
  'Stunning 27-inch QHD OLED gaming monitor featuring a blazingly fast 240Hz refresh rate, 0.03ms response time, and custom RGB lighting.',
  79999.00,
  'monitors',
  '{"brand": "LG", "size": "27 inch", "panel": "OLED", "refresh_rate": "240Hz", "resolution": "2560x1440"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111151', 'a1111111-1111-1111-1111-111111111151', 14)
ON CONFLICT (id) DO NOTHING;

-- Monitor 2: Dell UltraSharp 27 4K
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111152',
  'e1111111-1111-1111-1111-111111111111',
  'Dell UltraSharp U2723QE 27" 4K USB-C Hub Monitor',
  'Premium 4K monitor with IPS Black technology for high contrast, daisy-chaining, 90W USB-C power delivery, and built-in RJ45 hub.',
  52499.00,
  'monitors',
  '{"brand": "Dell", "size": "27 inch", "panel": "IPS Black", "refresh_rate": "60Hz", "resolution": "3840x2160"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111152', 'a1111111-1111-1111-1111-111111111152', 22)
ON CONFLICT (id) DO NOTHING;

-- Monitor 3: Samsung Odyssey G9
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111153',
  'e1111111-1111-1111-1111-111111111111',
  'Samsung Odyssey G9 49" Curved Gaming Monitor',
  'Massive 49-inch curved dual-QHD screen with 1000R curvature, 240Hz refresh rate, 1ms response time, and Quantum Mini-LED technology.',
  135000.00,
  'monitors',
  '{"brand": "Samsung", "size": "49 inch", "panel": "VA Mini-LED", "refresh_rate": "240Hz", "resolution": "5120x1440"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111153', 'a1111111-1111-1111-1111-111111111153', 8)
ON CONFLICT (id) DO NOTHING;

-- Monitor 4: Gigabyte M27Q
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111154',
  'e1111111-1111-1111-1111-111111111111',
  'Gigabyte M27Q 27" Gaming Monitor',
  'Highly-rated QHD monitor featuring a 170Hz refresh rate IPS panel, 0.5ms response time, built-in KVM switch, and HDR400 support.',
  24499.00,
  'monitors',
  '{"brand": "Gigabyte", "size": "27 inch", "panel": "IPS", "refresh_rate": "170Hz", "resolution": "2560x1440"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111154', 'a1111111-1111-1111-1111-111111111154', 45)
ON CONFLICT (id) DO NOTHING;

-- Monitor 5: BenQ GW2480
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111155',
  'e1111111-1111-1111-1111-111111111111',
  'BenQ GW2480 24" IPS Monitor',
  'Affordable Full HD eye-care monitor with slim bezel, built-in speakers, and brightness intelligence technology.',
  9499.00,
  'monitors',
  '{"brand": "BenQ", "size": "23.8 inch", "panel": "IPS", "refresh_rate": "60Hz", "resolution": "1920x1080"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111155', 'a1111111-1111-1111-1111-111111111155', 85)
ON CONFLICT (id) DO NOTHING;

-- Mouse 1: MX Master 3S
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111161',
  'e1111111-1111-1111-1111-111111111111',
  'Logitech MX Master 3S Wireless Mouse',
  'Ergonomic wireless mouse with 8000 DPI sensor, quiet click buttons, and MagSpeed electromagnetic scroll wheel.',
  10995.00,
  'mice',
  '{"brand": "Logitech", "sensor": "8000 DPI", "type": "Ergonomic", "connectivity": "Logi Bolt/Bluetooth"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111161', 'a1111111-1111-1111-1111-111111111161', 95)
ON CONFLICT (id) DO NOTHING;

-- Mouse 2: DeathAdder V3 Pro
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111162',
  'e1111111-1111-1111-1111-111111111111',
  'Razer DeathAdder V3 Pro Wireless',
  'Ultra-lightweight wireless gaming mouse with 63g form factor, Focus Pro 30K optical sensor, and Gen-3 optical mouse switches.',
  13999.00,
  'mice',
  '{"brand": "Razer", "sensor": "30000 DPI", "type": "Ultra-lightweight Gaming", "connectivity": "Wireless"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111162', 'a1111111-1111-1111-1111-111111111162', 50)
ON CONFLICT (id) DO NOTHING;

-- Mouse 3: Logitech G502 X Plus
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111163',
  'e1111111-1111-1111-1111-111111111111',
  'Logitech G502 X Plus Wireless Gaming Mouse',
  'Advanced gaming mouse featuring LIGHTFORCE hybrid optical-mechanical switches, LIGHTSYNC RGB lighting, and HERO 25K gaming sensor.',
  14995.00,
  'mice',
  '{"brand": "Logitech", "sensor": "25600 DPI", "type": "Gaming", "connectivity": "LIGHTSPEED Wireless"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111163', 'a1111111-1111-1111-1111-111111111163', 60)
ON CONFLICT (id) DO NOTHING;

-- Accessory 1: Anker Prime 100W
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111171',
  'e1111111-1111-1111-1111-111111111111',
  'Anker Prime 100W GaN Charger',
  'Compact 3-port wall charger (2 USB-C, 1 USB-A) featuring power allocation technology to fast-charge laptops, tablets, and phones simultaneously.',
  6499.00,
  'accessories',
  '{"brand": "Anker", "wattage": "100W", "ports": "3 (2x USB-C, 1x USB-A)"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111171', 'a1111111-1111-1111-1111-111111111171', 150)
ON CONFLICT (id) DO NOTHING;

-- Accessory 2: SanDisk Extreme SSD 1TB
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111172',
  'e1111111-1111-1111-1111-111111111111',
  'SanDisk Extreme Portable SSD 1TB',
  'Rugged portable NVMe solid state drive with up to 1050MB/s read speeds, IP55 water/dust resistance, and 2-meter drop protection.',
  9999.00,
  'accessories',
  '{"brand": "SanDisk", "capacity": "1TB", "read_speed": "1050MB/s", "interface": "USB 3.2 Gen 2"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111172', 'a1111111-1111-1111-1111-111111111172', 100)
ON CONFLICT (id) DO NOTHING;

-- Accessory 3: Logitech Brio 4K
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111173',
  'e1111111-1111-1111-1111-111111111111',
  'Logitech Brio 4K Webcam',
  'Ultra-HD webcam for video conferencing and streaming, featuring HDR, auto light correction, RightLight 3, and dual noise-cancelling mics.',
  18995.00,
  'accessories',
  '{"brand": "Logitech", "resolution": "4K UHD at 30fps", "field_of_view": "Adjustable 65/78/90 degrees"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111173', 'a1111111-1111-1111-1111-111111111173', 45)
ON CONFLICT (id) DO NOTHING;

-- Accessory 4: Elgato Stream Deck MK.2
INSERT INTO products (id, merchant_id, name, description, price, category, specifications)
VALUES (
  'a1111111-1111-1111-1111-111111111174',
  'e1111111-1111-1111-1111-111111111111',
  'Elgato Stream Deck MK.2',
  'Studio controller with 15 customizable LCD keys to trigger actions, launch apps, post to social media, and adjust audio in real time.',
  13999.00,
  'accessories',
  '{"brand": "Elgato", "keys": "15 customization LCD keys", "connectivity": "USB 2.0"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory (id, product_id, stock_count)
VALUES ('b1111111-1111-1111-1111-111111111174', 'a1111111-1111-1111-1111-111111111174', 35)
ON CONFLICT (id) DO NOTHING;
