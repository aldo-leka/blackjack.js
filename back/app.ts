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
import { logError, logInfo, logWarning } from './log';
import { IpApiResponse } from './models/ip-api';
import { UserData } from './models/user-data';
import { CHIPS, DAILY_REFILL_VALUE, DECK, NUM_DECKS, MAX_PLAYERS_PER_ROOM, MAX_ROOM_ID, ROOM_NAME_FORMAT, TIMER, TOTAL_CARDS, DECK_PENETRATION, shuffle, Card, DEAL_TIME } from './util';
import prisma from './db';
import { Room } from './models/room';

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
app.use('/api', gameRoutes);

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
let rooms = new Map<string, Room>();

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

        if (existing) {
            existing.socketId = socket.id;
            existing.countryCode = countryCode;
            existing.cash = tempUser.cash;
        }
        else {
            users.set(nickname, {
                nickname,
                socketId: socket.id,
                countryCode,
                cash: tempUser.cash
            });
        }

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

        if (user.roomName) {
            socket.to(user.roomName).emit("user disconnected", nickname);
        }

        const timeoutId = setTimeout(() => {
            const countryCode = user.countryCode;
            const roomName = user.roomName;

            users.delete(nickname);
            disconnects.delete(nickname);

            if (roomName) {
                const room = rooms.get(roomName)!;
                room.players = room.players.filter(player => player.nickname !== nickname);
                if (room.players.length === 0) {
                    clearInterval(room.timer);
                    rooms.delete(roomName);
                }

                io.to(roomName).emit("user removed", nickname);
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

        // user already has a room aka is reconnecting
        if (user.roomName) {
            socket.join(user.roomName); // sanity check
            socket.emit("already in room", getUserMap(user), getRoomMap(user.room!));
            socket.to(user.roomName).emit("user reconnected", nickname);

            const room = rooms.get(user.roomName);
            switch (room!.phase) {
                case "bet":
                    socket.emit("timer update", room!.timeLeft, TIMER);
                    break;
            }

            return;
        }

        let roomFound = false;
        let roomFoundName = "";
        rooms.forEach(room => {
            if (!roomFound && room.players.length < MAX_PLAYERS_PER_ROOM) {
                roomFound = true;
                roomFoundName = room.name;
            }
        });

        if (!roomFound) {
            if (currentRoomId > MAX_ROOM_ID) {
                currentRoomId = 0;
            }

            currentRoomId += 1;
            roomFoundName = ROOM_NAME_FORMAT.replace("{id}", currentRoomId.toString());
        }

        socket.join(roomFoundName);

        if (!roomFound) {
            const timer = setInterval(() => {
                const room = rooms.get(roomFoundName);
                if (room) {
                    room.timeLeft!--;

                    logInfo(room.timeLeft);

                    io.to(roomFoundName).emit("timer update", room.timeLeft, TIMER);

                    if (room.timeLeft! <= 0) {
                        room.timeLeft = 0;
                        clearInterval(timer);
                        dealInitialCards(room);
                    }
                }
            }, 1000);

            rooms.set(roomFoundName, {
                name: roomFoundName,
                players: [user],
                timer,
                timeLeft: TIMER,
                phase: "bet"
            });

            socket.emit("timer update", TIMER, TIMER);

            const room = rooms.get(roomFoundName)!;
            room.shoe = buildShoe();
        }
        else {
            const room = rooms.get(roomFoundName)!;
            room.players.push(user);

            socket.emit("timer update", rooms.get(roomFoundName)!.timeLeft, TIMER);
        }

        const room = rooms.get(roomFoundName)!;

        user.room = room;
        user.roomName = roomFoundName;

        socket.emit("joined room", getUserMap(user), getRoomMap(room));
        socket.to(roomFoundName).emit("user joined", getUserMap(user));
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

        if (!user.roomName) {
            logWarning(`change bet: no room for user '${nickname}'`);
            return;
        }

        if (user.room?.phase !== "bet") {
            logWarning(`change bet: room is not in bet phase`);
            return;
        }

        if (chipIndex >= CHIPS.length) {
            logWarning(`change bet: invalid chip index from user ${nickname}`);
            return;
        }

        if (!user.cash) {
            logWarning(`change bet: no cash found for user ${nickname}`);
        }

        let chipValue = CHIPS[chipIndex];
        if (action === "add") {
            const availableCash = user.cash! - (user.bet ?? 0);
            if (availableCash < chipValue) {
                logWarning(`add bet: invalid bet for user ${nickname} (chipValue: ${chipValue}, cash: ${user.cash})`);
                return;
            }

            user.bet = (user.bet ?? 0) + chipValue;
        }
        else if (action === "remove") {
            if (!user.bet || user.bet < chipValue) {
                logWarning(`remove bet: invalid bet for user ${nickname} (chipValue: ${chipValue}, bet: ${user.bet})`);
                return;
            }

            user.bet = user.bet! - chipValue;
        }

        socket.to(user.roomName).emit("user change bet", nickname, user.bet);
    });

    socket.on("check", () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            logWarning("check: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`check: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.roomName) {
            logWarning(`check: no room for user '${nickname}'`);
            return;
        }

        const room = user.room!;
        if (room.phase !== "bet") {
            logWarning(`check: room is not in bet phase`);
            return;
        }

        if (user.check === true) {
            logWarning(`check: '${nickname}' is already checked`);
            return;
        }

        user.check = true;
        let checkCount = 0;
        room.players.forEach(player => {
            if (player.check) {
                checkCount++;
            }
        });

        const allChecked = checkCount === room.players.length;
        if (allChecked) {
            clearInterval(room.timer);
            dealInitialCards(room);
        }
    });
});

/**
 * As seen in PokerStars VR:
 * https://www.youtube.com/watch?v=u0K2BvyKTXU
 * 1. Deal 1st face up card for each player
 * 2. Deal 1st face down card for the dealer
 * 3. Deal 2nd face up card for each player
 * 4. Deal 2nd face up card for the dealer
 */
async function dealInitialCards(room: Room) {
    if (!room.shoe) {
        logError("dealInitialCards: no shoe!", room);
        return;
    }

    room.phase = "deal_initial_cards";
    io.to(room.name).emit("deal initial cards");

    let anyPlayerBet = false;
    for (const player of room.players) {
        if (player.bet && player.bet > 0) {
            anyPlayerBet = true;

            await wait(DEAL_TIME);

            if (room.shoe!.length === 0) {
                logError("dealInitialCards: shoe is empty!", getLoggingRoom(room));
                return;
            }

            const card = dealCard(room.shoe!);
            player.hand = [card];
            io.to(room.name).emit("deal player card", player.nickname, getCardMap(card));

            logInfo(`dealInitialCards: dealt ${getLoggingCard(card)} to ${player.nickname}`);
        }
    };

    if (!anyPlayerBet) {
        restartGame(room);
        return;
    }

    await wait(DEAL_TIME);
    let card = dealCard(room.shoe!);
    room.dealerHand = [card];
    io.to(room.name).emit("deal dealer facedown card");

    logInfo(`dealInitialCards: dealt facedown ${getLoggingCard(card)} to dealer`);

    for (const player of room.players) {
        if (player.bet && player.bet > 0) {
            await wait(DEAL_TIME);

            const card = dealCard(room.shoe!);
            player.hand!.push(card);
            io.to(room.name).emit("deal player card", player.nickname, getCardMap(card));

            logInfo(`dealInitialCards: dealt ${getLoggingCard(card)} to ${player.nickname}`);
        }
    };

    await wait(DEAL_TIME);
    card = dealCard(room.shoe!);
    room.dealerHand.push(card);
    io.to(room.name).emit("deal dealer card", card);
    logInfo(`dealInitialCards: dealt ${getLoggingCard(card)} to dealer`);

    startPlayerTurns(room);
}

async function startPlayerTurns(room: Room) {
    room.currentPlayerIndex = 0;
    io.to(room.name).emit("player turn", room.players[0].nickname);

    room.timeLeft = TIMER;
    room.timer = setInterval(() => {
        room.timeLeft!--;

        logInfo(room.timeLeft);

        io.to(room.name).emit("timer update", room.timeLeft, TIMER);

        if (room.timeLeft! <= 0) {
            room.timeLeft = 0;
            clearInterval(room.timer);
        }
    }, 1000);

    io.to(room.name).emit("timer update", TIMER, TIMER);
}

async function wait(seconds: number) {
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function restartGame(room: Room) {
    room.players.forEach(player => {
        player.bet = undefined;
        player.check = undefined;
        player.hand = undefined;
    });

    room.dealerHand = undefined;
    clearInterval(room.timer);
    room.timeLeft = TIMER;
    room.phase = "bet";

    io.to(room.name).emit("restart", getRoomMap(room));

    room.timer = setInterval(() => {
        room.timeLeft!--;

        logInfo(room.timeLeft);

        io.to(room.name).emit("timer update", room.timeLeft, TIMER);

        if (room.timeLeft! <= 0) {
            room.timeLeft = 0;
            clearInterval(room.timer);
            dealInitialCards(room);
        }
    }, 1000);

    io.to(room.name).emit("timer update", TIMER, TIMER);
}

function dealCard(shoe: Card[]) {
    return shoe.shift()!;
}

function buildShoe() {
    return shuffle(Array(NUM_DECKS).fill(null).flatMap(() => [...DECK]));
}

function shouldReshuffle(cardsDealt: number): boolean {
    const dealCardsBeforeShuffle = Math.floor(TOTAL_CARDS * DECK_PENETRATION); // ~234
    return cardsDealt >= dealCardsBeforeShuffle;
}

export function getLoggingCard(card: Card): string {
    const SUIT_EMOJI: Record<string, string> = {
        spades: "♠",
        hearts: "♥",
        clubs: "♣",
        diamonds: "♦",
    };

    return `${card.rank}${SUIT_EMOJI[card.suit]}`;
}

function getUserMap(user: UserData) {
    return {
        nickname: user.nickname,
        countryCode: user.countryCode,
        cash: user.cash,
        bet: user.bet,
        check: user.check,
        hand: user.hand?.map(c => getCardMap(c)),
    }
}

function getRoomMap(room: Room) {
    return {
        name: room.name,
        players: room.players.map(p => getUserMap(p)),
        timeLeft: room.timeLeft,
        phase: room.phase,
        dealerHand: room.dealerHand?.map(c => getCardMap(c)),
        currentPlayerIndex: room.currentPlayerIndex,
    };
}

function getCardMap(card: Card) {
    return {
        rank: card.rank,
        suit: card.suit,
    }
}

function getLoggingRoom(room: Room) {
    return {
        name: room.name,
        players: room.players,
        timeLeft: room.timeLeft,
        phase: room.phase,
        dealerHand: room.dealerHand,
    };
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

export function getRooms() {
    return rooms;
}

export default server;
