import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import config from "./config/config";
import { polarClient } from "./polar";
import { checkout, polar, portal } from "@polar-sh/better-auth";

const prisma = new PrismaClient();

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
                portal(),
            ],
        })
    ]
});