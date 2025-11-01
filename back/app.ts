import express from 'express';
import itemRoutes from './routes/itemRoutes';
import userRoutes from './routes/userRoutes';
import cronRoutes from './routes/cronRoutes';
import gameRoutes from './routes/gameRoutes';
import { errorHandler } from './middlewares/errorHandler';
import cors from "cors";
import config from './config/config';
import { createServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import { logInfo, logWarning } from './log';
import { IpApiResponse } from './models/ip-api';
import { UserData } from './models/user-data';
import { CHIPS, DAILY_REFILL_VALUE, MAX_PLAYERS_PER_ROOM, MAX_ROOM_ID } from './constants';
import prisma from './db';

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
app.use('/api/cron', cronRoutes);
app.use('/api/game', gameRoutes);

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

let users = new Map<string, UserData>();
let currentRoomId = 0;
let disconnects = new Map<string, NodeJS.Timeout>();

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

            if (existing.room) {
                socket.join(existing.room);
                socket.to(existing.room).emit("user reconnected", nickname);
            }

            logInfo(`${nickname} from ${existing.countryCode} reconnected before timeout`);
        }

        socket.data.nickname = nickname;

        const ip = getIp(socket);
        const countryCode = existing?.countryCode || await getCountryCodeFromIP(ip) || "somewhere";

        /** Don't allow users to get a refill if same nickname & country */
        const tempUser = await prisma.tempUser.upsert({
            where: {
                nickname_countryCode: { nickname, countryCode }
            },
            update: {
                ip,
                updatedAt: new Date()
            },
            create: {
                nickname,
                ip,
                countryCode,
                cash: DAILY_REFILL_VALUE,
            }
        });

        users.set(nickname, {
            ...(existing || {}),
            nickname,
            socketId: socket.id,
            countryCode,
            cash: tempUser.cash
        });

        logInfo(`on nickname handshake: ${nickname} from ${countryCode} (ip: ${ip})`);

        socket.emit('nickname accepted', { cash: tempUser.cash });
    });

    socket.on("disconnect", () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            return;
        }

        if (user.room) {
            socket.to(user.room).emit("user disconnected", nickname);
        }

        const timeoutId = setTimeout(() => {
            const countryCode = user.countryCode;
            const room = user.room;

            users.delete(nickname);
            disconnects.delete(nickname);

            if (room) {
                io.to(room).emit("user removed", nickname);
            }

            logInfo(`${nickname} from ${countryCode} (ip: ${socket.handshake.address}) removed after timeout`);
        }, 30_000);

        disconnects.set(nickname, timeoutId);
        logInfo(`${nickname} marked as a disconnect`);
    });

    socket.on("join room", () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            logInfo("join room: no nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logInfo("join room: no user");
            return;
        }

        // TODO What should happen if a user is already in a room?
        // e.g. if they refresh the page?
        // They should get fresh game data, thas' it. 
        // if (user.room) {
        //     socket.emit("already in room", user.room);
        //     return;
        // }

        const rooms = getRooms();
        let roomFound = false;
        let roomFoundName = "";
        rooms.forEach((roomUsers, roomName) => {
            if (!roomFound && roomUsers.length < MAX_PLAYERS_PER_ROOM) {
                roomFound = true;
                roomFoundName = roomName;
            }
        });

        if (!roomFound) {
            if (currentRoomId > MAX_ROOM_ID) {
                currentRoomId = 0;
            }

            currentRoomId += 1;
            roomFoundName = `ROOM_${currentRoomId}`;
        }

        // update user data with found room
        users.set(nickname, { ...user, room: roomFoundName });

        socket.join(roomFoundName);

        const otherPlayers = Array.from(users.values())
            .filter(u => u.room === roomFoundName && u.nickname !== nickname)
            .map(u => ({
                nickname: u.nickname,
                countryCode: u.countryCode,
                cash: u.cash,
                bet: u.bet
            }));

        logInfo(JSON.stringify(otherPlayers));

        socket.emit("joined room", user.cash, otherPlayers);
        socket.to(roomFoundName).emit("user joined", nickname, user.countryCode, user.cash, user.bet);
    });

    socket.on("change bet", (chipIndex: number, action: "add" | "remove") => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            logWarning("change bet: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`change bet: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.room) {
            logWarning(`change bet: no room for user '${nickname}'`);
            return;
        }

        if (chipIndex > CHIPS.length) {
            logWarning(`change bet: invalid chip index from user ${nickname}`);
            return;
        }

        if (!user.cash) {
            logWarning(`change bet: no cash found for user ${nickname}`);
        }

        let chipValue = CHIPS[chipIndex];
        if (action === "add") {
            if (user.cash! < chipValue) {
                logWarning(`add bet: invalid bet for user ${nickname} (chipValue: ${chipValue}, cash: ${user.cash})`);
            }

            user.bet = (user.bet ?? 0) + chipValue;
        }
        else if (action === "remove") {
            if (!user.bet || user.bet < chipValue) {
                logWarning(`remove bet: invalid bet for user ${nickname} (chipValue: ${chipValue}, bet: ${user.bet})`);
            }

            user.bet = user.bet! - chipValue;
        }

        socket.to(user.room).emit("user change bet", nickname, user.bet);
    });
});

export function getRooms() {
    let rooms = new Map<string, UserData[]>();
    for (let [, user] of users) {
        if (user.room) {
            const roomUsers = rooms.get(user.room);
            if (roomUsers) {
                rooms.set(user.room, [...roomUsers, user]);
            }
            else {
                rooms.set(user.room, [user]);
            }
        }
    }

    return rooms;
}

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
