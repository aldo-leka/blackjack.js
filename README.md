# Prisma commands
## to create and apply migrations
npx prisma migrate dev

## to generate the prisma client
npx prisma generate

## to update the database schema without creating migration files
npx prisma db push

## to open the db gui
npx prisma studio

## drop the development db
prisma migrate reset