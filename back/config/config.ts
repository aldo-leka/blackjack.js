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
    polarWebhookSecret: string;
    polarProductStarterId: string;
    polarProductQuickBoostId: string;
    polarProductValuePackId: string;
    polarProductProPackId: string;
    polarProductHighRollerId: string;
    polarProductVipPackId: string;
    polarProductWhalePackId: string;
    cronSecret: string;
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
    polarWebhookSecret: process.env.POLAR_WEBHOOK_SECRET || '',
    polarProductStarterId: process.env.POLAR_PRODUCT_STARTER_ID || '',
    polarProductQuickBoostId: process.env.POLAR_PRODUCT_QUICK_BOOST_ID || '',
    polarProductValuePackId: process.env.POLAR_PRODUCT_VALUE_PACK_ID || '',
    polarProductProPackId: process.env.POLAR_PRODUCT_PRO_PACK_ID || '',
    polarProductHighRollerId: process.env.POLAR_PRODUCT_HIGH_ROLLER_ID || '',
    polarProductVipPackId: process.env.POLAR_PRODUCT_VIP_PACK_ID || '',
    polarProductWhalePackId: process.env.POLAR_PRODUCT_WHALE_PACK_ID || '',
    cronSecret: process.env.CRON_SECRET || '',
};

export default config;
