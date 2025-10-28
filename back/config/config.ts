import dotenv from 'dotenv';

dotenv.config();

interface Config {
    port: number;
    nodeEnv: string;
    databaseUrl: string;
    frontendUrl: string;
    betterAuthSecret: string;
    googleClientId: string;
    googleClientSecret: string;
    polarAccessToken: string;
    polarProduct10Id: string;
    polarProductOwnId: string;
}

const config: Config = {
    port: Number(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    frontendUrl: process.env.CORS_ORIGIN || '',
    betterAuthSecret: process.env.BETTER_AUTH_SECRET || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    polarAccessToken: process.env.POLAR_ACCESS_TOKEN || '',
    polarProduct10Id: process.env.POLAR_PRODUCT_10_ID || '',
    polarProductOwnId: process.env.POLAR_PRODUCT_OWN_ID || '',
};

export default config;
