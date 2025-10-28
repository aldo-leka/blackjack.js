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
                            productId: "ce2976b3-d38c-4b7b-9fe4-481d27a4034a",
                            slug: "Blackjack-10",
                        },
                        {
                            productId: "185d6bd6-3971-4ac4-a3ab-347ba558ae2d",
                            slug: "Blackjack-own",
                        }
                    ],
                    // successUrl: config.polarSuccessUrl,
                    authenticatedUsersOnly: true,
                }),
                portal(),
            ],
        })
    ]
});