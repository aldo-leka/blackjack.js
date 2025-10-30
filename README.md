# Useful stuff

## CI / CD
### Need to know
Builds / deployments / dockerization crashed my server many times.
Therefore I offloaded the work to GitHub Actions and used Container Registry (ghcr) for the Docker images.

I needed to enable API access on Coolify so that GitHub Actions
could notify my Coolify environment for new deployments.

Steps:
1. In Coolify: Go to Keys & Tokens / API Tokens
2. Create an API_TOKEN with permissions: deploy & read
3. In GitHub: Go to repo Settings / Secrets and variables / Actions
4. Add Repository secrets:
   - COOLIFY_API_TOKEN (from step 2)
   - COOLIFY_WEBHOOK_FRONTEND (from Coolify frontend resource / Webhooks tab)
   - COOLIFY_WEBHOOK_BACKEND (from Coolify backend resource / Webhooks tab)

FYI: When creating the resource for an app, select Docker Based /
Docker Image and set the image to the URL of the package from ghcr.
- Frontend: ghcr.io/aldo-leka/blackjack.js-frontend:latest
- Backend: ghcr.io/aldo-leka/blackjack.js-backend:latest

For clarification (from Claude):
1. GitHub Actions builds the Docker image (on GitHub's servers)
2. Pushes to GHCR (GitHub Container Registry - a storage for Docker images)
3. Coolify pulls from GHCR when you trigger deployment
4. Image stays in GHCR (it's not deleted - it's stored there)

## Prisma commands
### to create and apply migrations
```npx prisma migrate dev```

### to generate the prisma client
```npx prisma generate```

### to update the database schema without creating migration files
```npx prisma db push```

### to open the db gui
```npx prisma studio```

### drop the development db
```prisma migrate reset```