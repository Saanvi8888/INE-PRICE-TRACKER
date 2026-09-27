# INE Price Tracker

A full-stack price tracking app built for the INE software engineering assignment. It lets you search products from the mock store, select a variant, track it, and scrape its current price and stock.

## Tech Stack

* React + Vite + Tailwind CSS
* Node.js + Express
* Playwright
* Supabase (PostgreSQL)

## Setup

Clone the repository and install the dependencies.

### Backend

```bash
cd backend
npm install
node server.js
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file inside `backend`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_supabase_secret_key
```

Create a `.env` file inside `frontend`:

```env
VITE_API_URL=http://localhost:5000
```

For the deployed frontend, `VITE_API_URL` is set to the deployed Render backend.

## Scraping Schedule

The scraper is intended to run **every 2 hours** for each tracked product.

An external cron service will trigger the backend endpoint:

```text
POST /api/run-scheduled-scrapes
```

The endpoint starts scraping the tracked products and saves the results in Supabase.

## Current Features

* Search products by name
* Select product variants
* Track products
* Store tracked products in Supabase
* Scrape dynamic prices using Playwright
* Extract price and stock
* Handle cookie consent and dynamic price loading
* Retry slow or failed price requests
* Store scrape results in Supabase

## Deployment

The frontend is deployed on Vercel and the backend is deployed on Render.
