# ApnaFit

ApnaFit is a premium e-commerce web application focused on luxury clothing. It features a modern, immersive user interface with 3D product visualization, smooth scroll animations, and an interactive shopping experience.

## Features

- **3D Product Visualization:** Interactive 3D models of clothing items for a detailed look.
- **Immersive UI/UX:** Powered by GSAP for seamless parallax effects and scroll animations.
- **Dynamic Cart & Wishlist:** Real-time cart management and wishlist functionality.
- **Detailed Sizing Guides:** Size charts with both metric and imperial measurements.
- **Responsive Design:** Optimized for both desktop and mobile devices.
- **Admin Ledger Console:** Built-in admin panel (UI) for managing store data.

## Tech Stack & Architecture

### Architecture Overview
The application is built on a monolithic structure for simplicity and rapid deployment:
- **Frontend:** A React 19 application powered by Vite, providing an immersive UI utilizing Tailwind CSS v4, GSAP, and Framer Motion. 
- **Backend:** A unified Express server (`server.ts`) that handles API requests, serves the frontend in production, and manages data.
- **Database:** A lightweight, file-based JSON database (`db.json`) used for persistent storage of products, orders, coupons, reviews, and CMS configurations.
- **Integrations:** Supports UPI deep-link generation for seamless Indian payments and uses the Gmail API to send real-time order and newsletter notifications.

### Application Workflow

1. **User Workflow:**
   - **Discovery:** Users browse luxury items via a highly animated, parallax-scrolling catalog with 3D pedestal previews.
   - **Shopping:** Items can be added to the bag with specific size and quantity constraints based on warehouse stock.
   - **Checkout:** Users apply coupons, provide shipping details, and proceed to a seamless UPI-based payment checkout.
   - **Notifications:** Upon order placement, an automated notification is sent via Gmail API, and stock is decremented in `db.json`.

2. **Admin Workflow:**
   - **Ledger Console:** Admins authenticate using an `ADMIN_API_KEY` to access the console.
   - **Management:** Admins can create, update, and delete products, monitor active orders, update shipping/payment statuses, manage CMS content, and generate discount coupons.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Setup Details

1. Clone the repository and navigate to the project directory.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Set up the environment variables. Rename `.env.example` to `.env.local` (or `.env`) and configure the following keys:
   - `ADMIN_API_KEY`: Secret key used to access the Admin Ledger Console (default: `dev-admin-key`).
   - `UPI_ID` and `UPI_MERCHANT_NAME`: Configures the UPI payment gateway deep link details.
   - `GMAIL_FROM`, `GMAIL_TO`, `GMAIL_ACCESS_TOKEN`: Configures the Gmail API for sending automated order and newsletter notifications.

### Development

Start the development server (runs both frontend and backend concurrently via `tsx`):
```bash
npm run dev
```

### Production Build

Build the frontend (Vite) and bundle the backend (esbuild) for production:
```bash
npm run build
```

Start the compiled production server:
```bash
npm start
```
