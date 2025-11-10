import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db";
import config from "./config/config";
import { polarClient } from "./polar";
import { checkout, polar, webhooks } from "@polar-sh/better-auth";
import { logError, logInfo } from "./log";

export const auth = betterAuth({
    trustedOrigins: [config.frontendUrl],
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        autoSignIn: true,
    },
    socialProviders: {
        google: {
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
        }
    },
    plugins: [
        polar({
            client: polarClient,
            createCustomerOnSignUp: true,
            use: [
                checkout({
                    products: [
                        {
                            productId: config.polarProductStarterId,
                            slug: "Blackjack-Starter",
                        },
                        {
                            productId: config.polarProductQuickBoostId,
                            slug: "Blackjack-Quick-Boost",
                        },
                        {
                            productId: config.polarProductValuePackId,
                            slug: "Blackjack-Value-Pack",
                        },
                        {
                            productId: config.polarProductProPackId,
                            slug: "Blackjack-Pro-Pack",
                        },
                        {
                            productId: config.polarProductHighRollerId,
                            slug: "Blackjack-High-Roller-Pack",
                        },
                        {
                            productId: config.polarProductVipPackId,
                            slug: "Blackjack-VIP-Pack",
                        },
                        {
                            productId: config.polarProductWhalePackId,
                            slug: "Blackjack-Whale-Pack",
                        }
                    ],
                    successUrl: `${config.frontendUrl}/game`,
                    authenticatedUsersOnly: true,
                }),
                webhooks({
                    secret: config.polarWebhookSecret,
                    onOrderPaid: async (payload) => {
                        const order = payload.data;
                        const userId = order.customer?.externalId;
                        const productId = order.productId;

                        if (!userId) {
                            logError("No external_id in order payload customer:", order.customer);
                            return;
                        }

                        // Map product IDs to chip amounts
                        const productChipMapping: Record<string, number> = {
                            [config.polarProductStarterId]: 150,
                            [config.polarProductQuickBoostId]: 500,
                            [config.polarProductValuePackId]: 900,
                            [config.polarProductProPackId]: 2000,
                            [config.polarProductHighRollerId]: 4500,
                            [config.polarProductVipPackId]: 12500,
                            [config.polarProductWhalePackId]: 28000,
                        };

                        const cashToAdd = productChipMapping[productId];

                        if (!cashToAdd) {
                            logError(`Unknown product ID: ${productId}`);
                            return;
                        }

                        try {
                            await prisma.user.update({
                                where: { id: userId },
                                data: {
                                    cash: {
                                        increment: cashToAdd
                                    }
                                }
                            });
                            logInfo(`Added ${cashToAdd} cash to user ${userId} for product ${productId}`);
                        } catch (error) {
                            logError(`Failed to add cash to user ${userId}:`, error);
                        }
                    }
                })
            ],
        })
    ]
});