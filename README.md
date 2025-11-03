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

## TODO: Game economy
## Streak

### Cycle 1: Days 1-7
| Day | Reward |
| --- | ------ |
| 1   | $10    |
| 2   | $12    |
| 3   | $15    |
| 4   | $18    |
| 5   | $20    |
| 6   | $25    |
| 7   | $40 + Spin Wheel |

### Cycle 2: Days 8-14
| Day | Reward |
| --- | ------ |
| 8   | $15    |
| 9   | $18    |
| 10  | $22    |
| 11  | $27    |
| 12  | $30    |
| 13  | $38    |
| 14  | $60 + Spin Wheel + Exclusive Table Skin |

### Cycle 3: Days 15-21
| Day | Reward |
| --- | ------ |
| 15  | $22    |
| 16  | $27    |
| 17  | $33    |
| 18  | $40    |
| 19  | $45    |
| 20  | $57    |
| 21  | $90 + Spin Wheel + "High Roller Streak" Title |

### Cycle 4: Days 22-28
| Day | Reward |
| --- | ------ |
| 22  | $33    |
| 23  | $40    |
| 24  | $50    |
| 25  | $60    |
| 26  | $68    |
| 27  | $86    |
| 28  | $135 + Spin Wheel + Profile Badge |

### Cycle 5+: Days 29-35, 36-42, etc.
| Day Pattern | Reward Formula |
| ----------- | -------------- |
| Day 1 of cycle | Previous cycle Day 1 × 1.5 |
| Day 2 of cycle | Previous cycle Day 2 × 1.5 |
| Day 3 of cycle | Previous cycle Day 3 × 1.5 |
| Day 4 of cycle | Previous cycle Day 4 × 1.5 |
| Day 5 of cycle | Previous cycle Day 5 × 1.5 |
| Day 6 of cycle | Previous cycle Day 6 × 1.5 |
| Day 7 of cycle | Previous cycle Day 7 × 1.5 + Spin Wheel + Rotating Cosmetic |

**Multiplier:** Each 7-day cycle multiplies the previous cycle's rewards by **1.5x**

**Special Milestones:**
- Day 30: $200 + VIP Chip Bundle + Platinum Badge
- Day 60: $500 + Exclusive Avatar Frame
- Day 90: $1,000 + "Legendary Dedication" Title
- Day 180: $2,500 + Golden Card Deck Skin
- Day 365: $10,000 + "Annual Champion" Title + Special Animation

**Guest Limit:** Unregistered users capped at 7-day streak (Cycle 1 only)

### Weekly Spin Wheel
| Prize   | Probability |
| ------- | ----------- |
| $50     | 45%         |
| $100    | 30%         |
| $250    | 15%         |
| $500    | 7%          |
| $2,500  | 2.5%        |
| $10,000 | 0.5%        |

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

### Profile card (shareable at /u/nickname)
- Nickname
- Win %
- Net worth
- Rank (e.g. #218 global)
- Badge
- Streak days

e.g. "Aldo · 💰 Net worth: $487 · ♠🔥 67% win streak · 🥇 Top 8% player"

### Table Stakes (maybe)
| Table Type  | Min Bet | Max Bet | Unlock Level |
| ----------- | ------- | ------- | ------------ |
| Beginner    | $5      | $50     | Level 1      |
| Standard    | $25     | $500    | Level 10     |
| High Roller | $100    | $5,000  | Level 25     |
| VIP         | $500    | $50,000 | Level 50     |
