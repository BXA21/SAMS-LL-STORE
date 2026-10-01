# SWIFT ADVANCED MANAGEMENT SOLUTIONS LLC (SAMS) — Fire Safety E-Commerce Website

A premium, modern, responsive e-commerce web application built for SAMS LLC (Oman), featuring self-activating fire safety solutions (extinguisher balls and decorative flower pots). It serves as a public store catalog, checkout portal, and administrative content management system (CMS).

## 🚀 Tech Stack
- **Frontend**: Next.js (App Router, React, TypeScript)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Database & Auth**: Supabase (PostgreSQL, Supabase Auth)
- **Payment Gateway**: Paymob (Card payments in Omani Rial - OMR)

---

## 🛠️ Getting Started

### 1. Environment Variables Setup
Copy the `.env.example` file to `.env` (or `.env.local` for Next.js) and fill in your Supabase and Paymob credentials:
```bash
cp .env.example .env
```
Default fallback settings are pre-configured to allow the project to run immediately even if you don't have active keys.

### 2. Local Database & Seed Data
Execute the SQL statements inside `db/schema.sql` in your Supabase Project SQL Editor to set up:
- Table structures (`products`, `categories`, `orders`, `inquiries`, `certificates`, etc.)
- Database relationships & Indexes
- Row Level Security (RLS) policies
- Predefined seed data for SAMS products, site settings, testimonials, FAQs, and certificates.

### 3. Local Development Startup
Install dependencies (already complete) and run the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## 🔒 Security & Admin Access
The admin panel is accessible at `/admin`.
- Staff sign in with their own Supabase Auth account. Access is granted only by a row in `public.staff_profiles` with role `owner` (everything, including costs and profit reports) or `sales` (orders, quotations, CRM).
- Public sign-up is disabled. New staff are created by the owner in the Supabase dashboard (Authentication → Users) and then given a `staff_profiles` row.
- No credentials are stored in this repository or in `NEXT_PUBLIC_*` variables.

---

## 💳 Paymob Integration & Webhook Testing
This project implements a secure checkout containing two flows:
1. **Online Card Payment**: the server prices the cart from the database (`create_checkout_order`), creates a Paymob **Unified Intention** and sends the customer to Paymob's hosted Unified Checkout. Card details never touch this site.
2. **Quotation Request**: saved server-side for the sales team; payment is arranged offline.

An order becomes **Paid only through the server-to-server webhook** (`/api/paymob/webhook`): HMAC-SHA512 verified, amount and currency checked against the order, replays ignored, and a paid order is never downgraded. The browser redirect (`/api/paymob/return`) is display-only.

### Local testing
Paymob cannot reach `localhost`, so set `PAYMOB_CALLBACK_BASE_URL` to a publicly reachable URL of the running app (preview deployment or tunnel) and use Paymob's test card in test mode. See `.env.example` for every variable. Database schema and policies live in `supabase/migrations/`.

---

## 📦 Deployment on Vercel
1. Create a new repository on GitHub and push the codebase.
2. Import the repository in your Vercel Dashboard.
3. Add the environment variables from your `.env` file to Vercel's Environment Variables section.
4. Deploy the project. The build pipeline will optimize all routes and compiles cleanly.
