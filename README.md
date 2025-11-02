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

## Game features
### Streak
| Day  | Reward  |
| ---- | ------- |
| 1    | $10     |
| 2    | $12     |
| 3    | $15     |
| 4    | $18     |
| 5    | $20     |
| 6    | $25     |
| 7    | $40 + Spin wheel |
| 8    | $50     |
| 14   | $75 + exclusive table skin |
| 21   | $100 + “High Roller Streak” title |
| 30   | $150 + VIP chip bundle + profile badge |
| 31   | $50 + bonus XP |
| 32   | $50 + bonus ... |
| 33   | $50 + bonus ... |
| 34   | $60     |
| 35   | $60     |
| 36   | $70     |
| 37   | Jackpot wheel |

...then repeat but slightly strong each 7-day cycle.

Guests (not logged in users) only get up to 3 days streak max before they're prompted to login.

### Weekly spin wheel
| Price  | Probability  |
| ------ | ------------ |
| $500   | 40%          |
| $1000  | 30%          |
| $2500  | 20%          |
| $10000 | 9%           |
| $100000| 1%           |

### Leveling
| Level  | Title     |
| ------ | --------  |
| 1      | Recruit   |
| 5      | Cadet     |
| 10     | Ace       |
| 25     | Captain   |
| 50     | General   |
| 100    | Grandmaster |

XP comes from:
- Playing hands +2 XP
- Winning hand +3 XP
- Winning a double down +5 XP
- Winning both on a split +8 XP
- Getting a blackjack +4 XP
- Winning 3 hands in a row +5 XP bonus
- Winning 5 hands in a row +12 XP bonus
- Winning 8 hands in a row +20 XP bonus
- Winning 10 hands in a row +30 XP bonus

### Chip Packages
| Price  | Chips Given | Bonus Chips | Total Value | Label |
| ------ | ----------- | ----------- | ----------- | ----- |
| $0.99  | 150         | —           | 150         | Starter Pack |
| $2.99  | 450         | +50         | 500         | Quick Boost |
| $4.99  | 750         | +150        | 900         | Value Pack |
| $9.99  | 1,500       | +500        | 2,000       | Pro Pack |
| $19.99 | 3,500       | +1,000      | 4,500       | High Roller Pack |
| $49.99 | 10,000      | +2,500      | 12,500      | VIP Pack |
| $99.99 | 22,000      | +6,000      | 28,000      | Whale Pack |

### Free Chip Options
- **Bankruptcy Protection:** 75 chips (auto-granted next day after hitting $0)
- **Watch & Earn:** 25 chips per ad (max 3 ads/day = 75 chips/day)
- **Hourly Bonus:** 10 chips every 4 hours (max 60 chips/day)

### Profile card (shareable at /u/nickname)
- Nickname
- Win %
- Net worth
- Rank (e.g. #218 global)
- Badge
- Streak days

e.g. "Aldo · 💰 Net worth: $487 · ♠🔥 67% win streak · 🥇 Top 8% player"