# HomeStox

A shared home inventory and shopping list app for families and roommates. Track what you have, what you need, and where to get the best prices.

## Features

- **Inventory Tracking** — Monitor stock levels across your household items
- **Smart Shopping List** — Auto-generated from items running low
- **Purchase Analytics** — Price history with unit price comparison across stores
- **Multi-user Homes** — Invite family or roommates and manage together
- **Push Notifications** — Get notified when housemates update items or make purchases
- **Dark Mode** — System-aware theming with manual override

## Tech Stack

- React Native + Expo 54
- Supabase (Auth, PostgreSQL, Edge Functions)
- React Native Paper (Material Design 3)
- Zustand + TanStack Query
- TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- A Supabase project

### Setup

```bash
git clone https://github.com/karthikeyanp-dev/homestox.git
cd homestox
npm install
```

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Run the migration files from `supabase/migrations/` in your Supabase SQL Editor, then deploy the Edge Function:

```bash
supabase functions deploy send-home-notification
```

Start the dev server:

```bash
npm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run android` | Run on Android |
| `npm run ios` | Run on iOS |
| `npm run validate` | TypeScript type check |
| `npm test` | Run unit tests |
| `npm run build:preview` | EAS Android preview build |
| `npm run build:prod` | EAS Android production build |

## License

MIT
