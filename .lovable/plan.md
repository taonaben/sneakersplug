

# SneakersPlug MVP E-Commerce Store

A minimal, Yeezy Supply-inspired sneaker storefront with built-in admin panel, powered by Supabase.

## Design
- **Clean, minimal white background** with black text — inspired by the reference image
- **"SNEAKERSPLUG" wordmark** top-left, cart icon top-right
- **Product grid** with toggleable layout (6-col ↔ 3-col) via "+" button
- Product cards: square image, uppercase name, price underneath
- Sans-serif font stack (Inter)

## Database (Supabase)
- **products**: name, price, category, image_url, stock, created_at
- **categories**: name, slug, sort_order
- **delivery_zones**: name, active (boolean)
- **orders**: customer_name, phone, city, address, items (jsonb), total, status (pending/confirmed/delivered), created_at

## Customer Storefront Pages
1. **Home** (`/`) — Category filter pills + product grid with layout toggle
2. **Product Detail** (`/product/$id`) — Large image, name, price, "ADD TO CART" button
3. **Cart** (`/cart`) — Item list with quantity controls, subtotal, checkout button
4. **Checkout** (`/checkout`) — Name, phone, city dropdown (from active delivery zones), address → submits order to Supabase → opens WhatsApp with formatted message to +263781830006 → clears cart

## Cart
- React Context with localStorage persistence
- Add, remove, update quantity, clear

## Admin Panel (`/admin/*`)
- Simple email/password auth via Supabase Auth (admin-only)
- **Products**: CRUD with image upload to Supabase Storage
- **Orders**: View list, update status (pending → confirmed → delivered)
- **Categories**: Add/edit/remove, set sort order
- **Delivery Zones**: Toggle active/inactive

## Seed Data
- 5 delivery zones: Harare, Bulawayo, Mutare, Gweru, Masvingo
- 3 starter categories: Shoes, Jackets, Accessories

