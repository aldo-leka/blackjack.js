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
                            productId: config.polarProduct10Id,
                            slug: "Blackjack-10",
                        },
                        {
                            productId: config.polarProductOwnId,
                            slug: "Blackjack-Own",
                        }
                    ],
                    successUrl: config.frontendUrl,
                    authenticatedUsersOnly: true,
                }),
                webhooks({
                    secret: config.polarWebhookSecret,
                    onOrderPaid: async (payload) => {
                        const order = payload.data;
                        const userId = order.customer?.externalId;
                        const subtotalAmount = order.subtotalAmount; // Amount in cents (before tax)
                        const productId = order.productId;

                        if (!userId) {
                            logError("No external_id in order payload customer:", order.customer);
                            return;
                        }

                        // Calculate cash to add based on product
                        // Default: $1 = 10 in-game cash
                        let cashToAdd = 0;

                        if (productId === config.polarProduct10Id) {
                            // Package 1: Fixed amount
                            cashToAdd = 10;
                        } else if (productId === config.polarProductOwnId) {
                            // Package 2 (Pay what you want): Convert amount to cash
                            // subtotalAmount is in cents, so divide by 100 to get dollars, then multiply by 10
                            cashToAdd = Math.floor((subtotalAmount / 100) * 10);
                        } else {
                            // Unknown product, use default conversion
                            cashToAdd = Math.floor((subtotalAmount / 100) * 10);
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
                            logInfo(`Added ${cashToAdd} cash to user ${userId}`);
                        } catch (error) {
                            logError(`Failed to add cash to user ${userId}:`, error);
                        }
                    }
                })
            ],
        })
    ]
});