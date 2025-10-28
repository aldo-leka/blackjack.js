import { Polar } from "@polar-sh/sdk";
import config from "./config/config";

export const polarClient = new Polar({
    accessToken: config.polarAccessToken,
    server: "sandbox",
});