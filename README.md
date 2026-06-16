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
- **Supabase Connected Mode**: Log in using your configured Supabase Auth administrator account.
- **Local Sandbox Fallback Mode**: If Supabase environment keys are not configured or are placeholders, you can test the dashboard immediately using these credentials:
  - **Email**: `admin@sams-oman.com`
  - **Password**: `SAMSAdmin2026!`

---

## 💳 Paymob Integration & Webhook Testing
This project implements a secure checkout containing two flows:
1. **Online Card Payment**: Processes order totals securely on the server (fetching actual prices from the database to prevent client-side price tampering) and initializes a Paymob credit card iframe session.
2. **Offline Quote Inquiry**: Submits inquiry orders straight to the admin dashboard database, useful for bulk requests.

### Local Testing (Payment Simulator)
When Paymob keys are not set up or are placeholders, the payment flow generates a simulated sandbox checkout URL:
1. Add items to the cart and proceed to checkout.
2. Under "Select Order Type", choose "Online Credit Card" and fill in your details.
3. Click "Confirm Order & Pay Now" — you will be redirected to our local Sandbox Simulator at `/paymob-simulate`.
4. Click "Pay Successfully" to simulate a validated transaction callback. The simulator fires the `/api/paymob/webhook` POST endpoint (updating the database order status to `paid`) and redirects you back to the `/checkout/result` confirmation page.

---

## 📦 Deployment on Vercel
1. Create a new repository on GitHub and push the codebase.
2. Import the repository in your Vercel Dashboard.
3. Add the environment variables from your `.env` file to Vercel's Environment Variables section.
4. Deploy the project. The build pipeline will optimize all routes and compiles cleanly.
