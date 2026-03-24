# blackjack.js

Christmas-themed online blackjack with a Next.js frontend and an Express + Socket.IO backend.

Production:
- Frontend: `https://blackjack.aldo.al`
- Backend: `https://blackjackapi.aldo.al`

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4
- Backend: Express, Socket.IO, TypeScript
- Auth: Better Auth with Google sign-in
- Payments: Polar
- Database: PostgreSQL with Prisma
- Deployment: GitHub Actions, GHCR, self-hosted runner on VPS

## Repository layout

```text
front/                     Next.js app
back/                      Express API, auth, Socket.IO server, Prisma schema
.github/workflows/         Frontend and backend deploy workflows
docker-compose.yml         Production runtime compose file
scripts/deploy-front.sh    VPS frontend deploy script
scripts/deploy-back.sh     VPS backend deploy script
```

## Features

- Browser-based blackjack table
- Real-time multiplayer state over Socket.IO
- Guest nicknames and authenticated users
- Google login
- Polar-powered chip top-ups
- Leaderboard and in-game chat
- Cron-based refill endpoint for chip refills

## Local development

### 1. Install dependencies

```bash
cd front && npm ci
cd ../back && npm ci
```

### 2. Create local env files

Frontend expects standard Next.js env vars, usually in `front/.env.local`:

```env
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Backend expects env vars in `back/.env`:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/blackjack
CORS_ORIGIN=http://localhost:3000
BETTER_AUTH_SECRET=replace-me
CRON_SECRET=replace-me
GOOGLE_CLIENT_ID=replace-me
GOOGLE_CLIENT_SECRET=replace-me
POLAR_ACCESS_TOKEN=replace-me
POLAR_WEBHOOK_SECRET=replace-me
POLAR_PRODUCT_STARTER_ID=replace-me
POLAR_PRODUCT_QUICK_BOOST_ID=replace-me
POLAR_PRODUCT_VALUE_PACK_ID=replace-me
POLAR_PRODUCT_PRO_PACK_ID=replace-me
POLAR_PRODUCT_HIGH_ROLLER_ID=replace-me
POLAR_PRODUCT_VIP_PACK_ID=replace-me
POLAR_PRODUCT_WHALE_PACK_ID=replace-me
```

### 3. Start the apps

Run the backend:

```bash
cd back
npm run dev
```

Run the frontend:

```bash
cd front
npm run dev
```

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:3001`.

## Prisma and database

Common Prisma commands from the `back/` directory:

```bash
npx prisma migrate dev
npx prisma migrate deploy
npx prisma generate
npx prisma db push
npx prisma studio
npx prisma migrate reset
```

Production deploys run `npm run migrate:deploy` automatically before the backend container is updated.

## API shape

Main backend entrypoints are mounted in [`back/app.ts`](./back/app.ts):

- `/api/auth/*` for Better Auth
- `/api/users/*` for user lookups
- `/api/items/*` for item routes
- `/api/cron/*` for internal cron jobs
- `/api/leaderboard`, `/api/logs`, `/api/rooms`

Socket.IO is served from the same backend origin as the API.

## Deployment

This repo no longer uses the old Coolify webhook flow.

Current production deployment works like this:

1. Push to `main`.
2. GitHub Actions builds the changed app image on GitHub-hosted runners.
3. The image is pushed to GitHub Container Registry:
   - `ghcr.io/aldo-leka/blackjack.js-frontend`
   - `ghcr.io/aldo-leka/blackjack.js-backend`
4. A self-hosted runner on the VPS pulls the new image and deploys it.
5. Backend deploys run Prisma migrations before restarting the backend service.

Workflows:

- [`frontend.yml`](./.github/workflows/frontend.yml)
- [`backend.yml`](./.github/workflows/backend.yml)

Deploy scripts:

- [`scripts/deploy-front.sh`](./scripts/deploy-front.sh)
- [`scripts/deploy-back.sh`](./scripts/deploy-back.sh)

The production `docker-compose.yml` in the repo is VPS-oriented. It expects:

- a backend env file at `back/.env.production`
- an external ingress network already present on the server
- an external Docker network that connects the app to the production Postgres container

## Game rule note

If a split hand reaches 21 with Ace + 10, it pays `1:1`, not `3:2`.
