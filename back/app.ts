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
import { UserData } from './models/user-data';
import { MAX_PLAYERS_PER_ROOM, MAX_ROOM_ID } from './constants';

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
        const countryCode = existing?.countryCode || await getCountryCodeFromIP(ip);

        users.set(nickname, {
            ...(existing || {}),
            socketId: socket.id,
            countryCode: countryCode || undefined
        });

        logInfo(`on nickname handshake: ${nickname} from ${countryCode} (ip: ${ip})`);

        socket.emit('nickname accepted');
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

        let rooms = new Map<string, UserData[]>();
        for (let [userNickname, userData] of users) {
            if (userData.room) {
                const roomUsers = rooms.get(userData.room);
                if (roomUsers) {
                    rooms.set(userData.room, [...roomUsers, userData]);
                }
                else {
                    rooms.set(userData.room, [userData]);
                }
            }
        }

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
        users.set(nickname, {...user, room: roomFoundName});
        socket.join(roomFoundName);
        socket.emit("joined room");
        socket.to(roomFoundName).emit("user joined", nickname);
    });
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
