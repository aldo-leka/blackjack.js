import express from 'express';
import itemRoutes from './routes/itemRoutes';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './middlewares/errorHandler';
import cors from "cors";
import config from './config/config';
import { createServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { logInfo, logWarning } from './log';
import { IpApiResponse } from './models/ip-api';

const app = express();

app.use(
    cors({
        origin: config.frontendUrl,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true, // Allow credentials (cookies, authorization headers, etc.)
    })
);

app.all('/api/auth/*', toNodeHandler(auth));

app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/users', userRoutes);

// Global error handler (should be after routes)
app.use(errorHandler);

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: config.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true,
    }
});

/** key: nickname, value: { socketId, countryCode, room, etc. } */
let users = new Map();
users.set("aldo", {}); // todo remove after testing...

/** key: nickname, value: timer id */
let disconnects = new Map();

io.on('connection', async (socket) => {
    socket.on("register nickname", async (nickname) => {
        const existing = users.get(nickname)

        if (existing && existing.socketId !== socket.id) {
            if (!disconnects.has(nickname)) {
                socket.emit('nickname unavailable');
                return;
            }

            clearTimeout(disconnects.get(nickname));
            disconnects.delete(nickname);

            logInfo(`${nickname} from ${existing.countryCode} reconnected before timeout`);
        }

        socket.data.nickname = nickname;

        const ip = getIp(socket);
        const countryCode = existing?.countryCode || await getCountryCodeFromIP(ip);

        users.set(nickname, {
            ...(existing || {}),
            socketId: socket.id,
            countryCode: countryCode
        });

        logInfo(`on nickname handshake: ${nickname} from ${countryCode} (ip: ${ip})`);

        socket.emit('nickname accepted');
    });

    socket.on('disconnect', () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            return;
        }

        const timeoutId = setTimeout(() => {
            const countryCode = users.get(nickname).countryCode;
            users.delete(nickname);
            disconnects.delete(nickname);
            logInfo(`${nickname} from ${countryCode} (ip: ${socket.handshake.address}) removed after timeout`);
        }, 30_000);

        disconnects.set(nickname, timeoutId);

        logInfo(`${nickname} marked as a disconnect`);
    })
});

function getIp(socket: Socket) {
    const forwardedForHeaderValue = socket.handshake.headers['x-forwarded-for'];
    if (forwardedForHeaderValue && typeof forwardedForHeaderValue === 'string') {
        return forwardedForHeaderValue.split(',')[0].trim()
            || socket.handshake.address;
    }
    else if (forwardedForHeaderValue && Array.isArray(forwardedForHeaderValue)) {
        return forwardedForHeaderValue[0].trim() || socket.handshake.address;
    }

    return socket.handshake.address;
}

async function getCountryCodeFromIP(ip: string) {
    try {
        const res = await fetch(`http://ip-api.com/json/${ip}`);
        const data = await res.json() as IpApiResponse;
        if (data.status === 'success') return data.countryCode;
    } catch (err) {
        logWarning("Geo lookup failed", err);
    }
    return null;
}

export default server;
