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
import {
    CHIPS,
    REFILL_VALUE,
    DECK, NUM_DECKS,
    MAX_PLAYERS_PER_ROOM,
    MAX_ROOM_ID, ROOM_NAME_FORMAT,
    BET_TIME,
    TOTAL_CARDS,
    DECK_PENETRATION,
    shuffle,
    Card,
    DEAL_TIME,
    SHORT_WAIT,
    PLAY_TIME,
    PLAYER_TIMEOUT,
    DEALER_CHECK_BLACKJACK_TIME,
    HandResult
} from './util';
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
let rooms = new Map<string, Room>();
let currentRoomId = 0;

io.on('connection', async (socket) => {
    socket.on("register nickname", async (data) => {
        let nickname = typeof data === 'string' ? data : data.nickname;
        const sessionToken = typeof data === 'object' ? data.sessionToken : null;

        logInfo(`register nickname: handshake - '${nickname}' (token: ${sessionToken ? 'yes' : 'no'})`);

        let authenticatedUser = null;
        let isAuthenticated = false;
        if (sessionToken) {
            try {
                const session = await prisma.session.findUnique({
                    where: { token: sessionToken },
                    include: { user: true }
                });

                if (session && session.expiresAt > new Date()) {
                    authenticatedUser = session.user;
                    isAuthenticated = true;
                    logInfo(`register nickname: authenticated as user ${authenticatedUser.id} (${authenticatedUser.email})`);

                    // For authenticated users, use their DB nickname if it exists
                    if (authenticatedUser.nickname) {
                        if (authenticatedUser.nickname !== nickname) {
                            logInfo(`register nickname: overriding '${nickname}' with DB nickname '${authenticatedUser.nickname}' for user ${authenticatedUser.id}`);
                            nickname = authenticatedUser.nickname;
                        }
                    } else {
                        // If user doesn't have a nickname yet, save the one they provided
                        await prisma.user.update({
                            where: { id: authenticatedUser.id },
                            data: { nickname }
                        });
                        logInfo(`register nickname: saved nickname '${nickname}' for user ${authenticatedUser.id}`);
                    }
                }
                else {
                    logWarning(`register nickname: invalid or expired session token`);
                }
            }
            catch (error) {
                logError(`register nickname: error verifying session`, error);
            }
        }

        // For anonymous users, check if nickname belongs to an authenticated user in DB
        if (!isAuthenticated) {
            const userWithNickname = await prisma.user.findFirst({
                where: { nickname }
            });

            if (userWithNickname) {
                logWarning(`register nickname: anonymous user tried to use authenticated user's nickname '${nickname}'`);
                socket.emit('nickname unavailable');
                return;
            }
        }

        const existing = users.get(nickname);

        if (existing) {
            if (!existing.disconnected && existing.socketId != socket.id) {
                // For authenticated users, verify it's the same user
                if (isAuthenticated && existing.userId === authenticatedUser!.id) {
                    // Same authenticated user reconnecting from different socket, allow it
                    logInfo(`register nickname: authenticated user ${authenticatedUser!.id} reconnecting`);
                } else {
                    logInfo(`register nickname: '${nickname}' unavailable`);
                    socket.emit('nickname unavailable');
                    return;
                }
            }

            clearTimeout(existing.disconnectedTimer);
            existing.disconnected = false;
            logInfo(`register nickname: ${nickname} reconnected before timeout`);
        }

        socket.data.nickname = nickname;
        socket.data.userId = authenticatedUser?.id;

        const ip = getIp(socket);
        const countryCode = existing?.countryCode || await getCountryCodeFromIP(ip) || "somewhere";

        let cash: number;
        let lastRefillAt: Date;
        if (isAuthenticated) {
            cash = authenticatedUser!.cash;
            lastRefillAt = authenticatedUser!.lastRefillAt;
        } else {
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
                    cash: REFILL_VALUE,
                }
            });
            cash = tempUser.cash;
            lastRefillAt = tempUser.lastRefillAt;
        }

        if (existing) {
            existing.socketId = socket.id;
            existing.countryCode = countryCode;
            existing.userId = authenticatedUser?.id;
            existing.isAuthenticated = isAuthenticated;
            existing.cash = cash;
            existing.lastRefillAt = lastRefillAt;
        }
        else {
            users.set(nickname, {
                socketId: socket.id,
                nickname,
                countryCode,
                userId: authenticatedUser?.id,
                isAuthenticated,
                cash,
                lastRefillAt,
                disconnected: false,
            });
        }

        logInfo(`register nickname: handshake complete - '${nickname}' from ${countryCode} (ip: ${ip}, auth: ${isAuthenticated})`);
        socket.emit('nickname accepted', {
            nickname: nickname,
            isAuthenticated: isAuthenticated
        });
    });

    socket.on("disconnect", async () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("disconnect: no nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`disconnect: no user for nickname '${nickname}'`);
            return;
        }

        if (user.roomName) {
            socket.to(user.roomName).emit("user disconnected", nickname);
        }

        const timeoutId = setTimeout(async () => {
            clearTimeout(user.disconnectedTimer);

            const countryCode = user.countryCode;
            if (user.roomName) {
                const room = user.room!;
                const wasCurrentPlayer = room.phase === "players_turn" &&
                    room.currentPlayerIndex !== undefined &&
                    room.currentPlayerIndex >= 0 &&
                    room.players[room.currentPlayerIndex]?.nickname === nickname;

                room.players = room.players.filter(player => player.nickname !== nickname);

                if (wasCurrentPlayer) {
                    clearInterval(room.timer);
                    await nextPlayer(room);
                }

                if (room.players.length === 0) {
                    clearInterval(room.timer);
                    rooms.delete(room.name);
                }
                else {
                    io.to(room.name).emit("user removed", nickname);
                }
            }

            users.delete(nickname);

            logInfo(`'${nickname}' from ${countryCode} (ip: ${socket.handshake.address}) removed after timeout`);
        }, PLAYER_TIMEOUT * 1000);

        user.disconnected = true;
        user.disconnectedTimer = timeoutId;
        logInfo(`disconnect: ${nickname} marked as a disconnect`);
    });

    socket.on("join room", () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("join room: no nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning("join room: no user");
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
                    socket.emit("timer update", room!.timeLeft, BET_TIME);
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
            rooms.set(roomFoundName, {
                name: roomFoundName,
                players: [user],
                phase: "bet",
                shoe: buildShoe(),
                cardsDealt: 0,
                needsReshuffle: false,
            });

            const room = rooms.get(roomFoundName)!;
            setRoomTimer(room, BET_TIME, async () => await dealInitialCards(room));
        }
        else {
            const room = rooms.get(roomFoundName)!;
            room.players.push(user);

            socket.emit("timer update", rooms.get(roomFoundName)!.timeLeft, BET_TIME);
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
            socket.emit("disconnected");
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

    socket.on("remove bet", () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("remove bet: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`remove bet: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.roomName) {
            logWarning(`remove bet: no room for user '${nickname}'`);
            return;
        }

        if (user.room?.phase !== "bet") {
            logWarning(`remove bet: room is not in bet phase`);
            return;
        }

        if (!user.cash) {
            logWarning(`remove bet: no cash found for user ${nickname}`);
        }

        user.bet = 0;
        socket.to(user.roomName).emit("user change bet", nickname, user.bet);
    });

    socket.on("repeat bet", () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("repeat bet: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`repeat bet: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.roomName) {
            logWarning(`repeat bet: no room for user '${nickname}'`);
            return;
        }

        if (user.room?.phase !== "bet") {
            logWarning(`repeat bet: room is not in bet phase`);
            return;
        }

        if (!user.cash) {
            logWarning(`repeat bet: no cash found for user ${nickname}`);
            return;
        }

        if (!user.betBefore) {
            logWarning(`repeat bet: no bet before found for user ${nickname}`);
            return;
        }

        if (user.cash < user.betBefore) {
            logWarning(`repeat bet: insufficient funds to repeat the bet for ${nickname}`);
            return;
        }

        user.bet = user.betBefore;
        socket.to(user.roomName).emit("user change bet", nickname, user.bet);
    });

    socket.on("double bet", () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("double bet: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`double bet: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.roomName) {
            logWarning(`double bet: no room for user '${nickname}'`);
            return;
        }

        if (user.room?.phase !== "bet") {
            logWarning(`double bet: room is not in bet phase`);
            return;
        }

        if (!user.cash) {
            logWarning(`double bet: no cash found for user ${nickname}`);
            return;
        }

        if (!user.betBefore) {
            logWarning(`double bet: no bet before found for user ${nickname}`);
            return;
        }

        if (user.cash < user.betBefore * 2) {
            logWarning(`double bet: insufficient funds to repeat the bet for ${nickname}`);
            return;
        }

        user.bet = user.betBefore * 2;
        socket.to(user.roomName).emit("user change bet", nickname, user.bet);
    });

    socket.on("check", () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
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
        let totalPlayers = 0;
        room.players.forEach(player => {
            totalPlayers++;
            if (player.check === true) {
                checkCount++;
            }
        });

        const allChecked = checkCount === totalPlayers && totalPlayers > 0;
        if (allChecked) {
            clearInterval(room.timer);
            dealInitialCards(room);
            return;
        }

        socket.to(room.name).emit("user check", nickname);
    });

    socket.on("hit", async () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("hit: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`hit: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.roomName) {
            logWarning(`hit: no room for user '${nickname}'`);
            return;
        }

        const room = user.room!;
        if (room.phase !== "players_turn") {
            logWarning(`hit: room is not in players_turn phase`);
            return;
        }

        if (room.currentPlayerIndex === undefined || (room.currentPlayerIndex >= 0 && room.players[room.currentPlayerIndex].nickname !== nickname)) {
            logWarning(`hit: not current player's turn (current: ${room.players[room.currentPlayerIndex!]?.nickname}, requested: ${nickname})`);
            return;
        }

        if (user.currentHand === 0) {
            if (!user.hand) {
                logWarning(`hit: no hand for user '${nickname}'`);
                return;
            }

            if (user.stand === true) {
                logWarning(`hit: user '${nickname}' is standing`);
                return;
            }

            const handValue = getHandValue(user.hand);
            if (handValue >= 21) {
                logWarning(`hit: user '${nickname}' has already 21 or busted, hand value: ${handValue}`);
                return;
            }
        }

        if (user.currentHand === 1) {
            if (!user.hand2) {
                logWarning(`hit: no hand for user '${nickname}'`);
                return;
            }

            if (user.stand2 === true) {
                logWarning(`hit: user '${nickname}' is standing`);
                return;
            }

            const handValue = getHandValue(user.hand2);
            if (handValue >= 21) {
                logWarning(`hit: user '${nickname}' has already 21 or busted, hand value: ${handValue}`);
                return;
            }
        }

        const card = dealCard(room);
        if (user.currentHand === 0) {
            user.hand!.push(card);
        }
        else {
            user.hand2!.push(card);
        }

        io.to(room.name).emit("deal player card", getUserMap(user), getCardMap(card));
        logInfo(`hit: dealt ${getLoggingCard(card)} to ${nickname}`);

        const handValue = getHandValue(user.currentHand === 0 ? user.hand : user.hand2);
        if (handValue > 21) {
            logInfo(`hit: ${nickname} busted with ${handValue} with current hand: ${user.currentHand}`);
            await wait(SHORT_WAIT);
            await nextPlayer(room);
        } else if (handValue === 21) {
            logInfo(`hit: ${nickname} reached 21 with current hand: ${user.currentHand}`);
            await wait(SHORT_WAIT);
            await nextPlayer(room);
        }
    });

    socket.on("stand", async () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("stand: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`stand: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.roomName) {
            logWarning(`stand: no room for user '${nickname}'`);
            return;
        }

        const room = user.room!;
        if (room.phase !== "players_turn") {
            logWarning(`stand: room is not in players_turn phase`);
            return;
        }

        if (room.currentPlayerIndex === undefined || (room.currentPlayerIndex >= 0 && room.players[room.currentPlayerIndex].nickname !== nickname)) {
            logWarning(`stand: not current player's turn (current: ${room.players[room.currentPlayerIndex!]?.nickname}, requested: ${nickname})`);
            return;
        }

        if (user.currentHand === 0 && user.stand === true) {
            logWarning(`stand: '${nickname}' is already marked as stand`);
            return;
        }

        if (user.currentHand === 1 && user.stand2 === true) {
            logWarning(`stand: '${nickname}' is already marked as stand 2`);
            return;
        }

        user.stand = true;
        if (user.currentHand === 1) {
            user.stand2 = true;
        }

        logInfo(`stand: ${nickname} stands with ${getHandValue(user.hand)}`);
        await nextPlayer(room);
    });

    socket.on("split", async () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("split: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`split: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.roomName) {
            logWarning(`split: no room for user '${nickname}'`);
            return;
        }

        const room = user.room!;
        if (room.phase !== "players_turn") {
            logWarning(`split: room is not in players_turn phase`);
            return;
        }

        if (room.currentPlayerIndex === undefined || (room.currentPlayerIndex >= 0 && room.players[room.currentPlayerIndex].nickname !== nickname)) {
            logWarning(`split: not current player's turn (current: ${room.players[room.currentPlayerIndex!]?.nickname}, requested: ${nickname})`);
            return;
        }

        if (user.stand === true) {
            logWarning(`split: '${nickname}' is already marked as stand`);
            return;
        }

        if (!user.hand || user.hand.length < 2) {
            logWarning(`split: '${nickname}' doesn't have a valid hand`);
            return;
        }

        if (!user.hand[0].value.some(v => user.hand![1].value.includes(v))) {
            logWarning(`split: '${nickname}' can't split as the cards don't share the same value`);
            return;
        }

        if (user.hand2 !== undefined) {
            logWarning(`split: '${nickname}' already has splitted`);
            return;
        }

        if (user.bet! > user.cash!) {
            logWarning(`split: '${nickname}' doesn't have enough cash to cover the split`);
            return;
        }

        const card1 = user.hand[0];
        const card2 = user.hand[1];

        user.hand = [card1];
        user.hand2 = [card2];
        user.currentHand = 0;
        user.cash! -= user.bet!;
        user.bet2 = user.bet;

        logInfo(`split: ${nickname} splitted ${card1.rank}s`);
        io.to(room.name).emit("user splitted", getUserMap(user));
        setRoomTimer(room, PLAY_TIME, async () => await nextPlayer(room));
    });

    socket.on("double", async () => {
        const nickname = socket.data.nickname;
        if (!nickname) {
            socket.emit("disconnected");
            logWarning("double: no socket nickname");
            return;
        }

        const user = users.get(nickname);
        if (!user) {
            logWarning(`double: no user for nickname '${nickname}'`);
            return;
        }

        if (!user.roomName) {
            logWarning(`double: no room for user '${nickname}'`);
            return;
        }

        const room = user.room!;
        if (room.phase !== "players_turn") {
            logWarning(`double: room is not in players_turn phase`);
            return;
        }

        if (room.currentPlayerIndex === undefined || (room.currentPlayerIndex >= 0 && room.players[room.currentPlayerIndex].nickname !== nickname)) {
            logWarning(`double: not current player's turn (current: ${room.players[room.currentPlayerIndex!]?.nickname}, requested: ${nickname})`);
            return;
        }

        if (user.currentHand === 0 && user.hand!.length !== 2) {
            logWarning(`double: '${nickname}' can only double on initial 2-card hand`);
            return;
        }

        if (user.currentHand === 1 && user.hand2!.length !== 2) {
            logWarning(`double: '${nickname}' can only double on initial 2-card hand (hand2)`);
            return;
        }

        if (user.currentHand === 0 && user.stand === true) {
            logWarning(`double: '${nickname}' has already stood`);
            return;
        }

        if (user.currentHand === 1 && user.stand2 === true) {
            logWarning(`double: '${nickname}' has already stood on hand2`);
            return;
        }

        const betToDouble = user.currentHand === 1 ? user.bet2! : user.bet!;
        if (betToDouble > user.cash!) {
            logWarning(`double: '${nickname}' doesn't have enough cash to cover the double`);
            return;
        }

        user.cash! -= betToDouble;
        const card = dealCard(room);
        if (user.currentHand === 1) {
            user.bet2! *= 2;
            user.hand2!.push(card);
            user.stand2 = true;
        }
        else {
            user.bet! *= 2;
            user.hand!.push(card);
            user.stand = true;
        }

        io.to(room.name).emit("deal player card", getUserMap(user), getCardMap(card));
        await wait(SHORT_WAIT);
        await nextPlayer(room);
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

    if (room.needsReshuffle) {
        logInfo(`dealInitialCards: reshuffling shoe for ${room.name} (${room.cardsDealt} cards were dealt)`);
        room.shoe = buildShoe();
        room.cardsDealt = 0;
        room.needsReshuffle = false;
    }

    // Confirm (deduct) the bets
    room.players.forEach(player => {
        if (player.bet && player.bet > 0) {
            player.cash = Math.max(player.cash! - player.bet, 0);
            player.currentHand = 0;
        }
    });

    room.phase = "deal_initial_cards";
    io.to(room.name).emit("deal initial cards", getRoomMap(room));

    let anyPlayerBet = false;

    // Create a copy of players array to avoid issues if players are removed during iteration
    const playersCopy = [...room.players];
    for (const player of playersCopy) {
        if (!room.players.find(p => p.nickname === player.nickname)) {
            continue;
        }

        if (player.bet && player.bet > 0) {
            player.betBefore = player.bet;
            anyPlayerBet = true;

            if (room.shoe!.length === 0) {
                logError("dealInitialCards: shoe is empty!", getLoggingRoom(room));
                return;
            }

            const card = dealCard(room);
            player.hand = [card];
            io.to(room.name).emit("deal player card", getUserMap(player), getCardMap(card));
            await wait(DEAL_TIME);

            logInfo(`dealInitialCards: dealt ${getLoggingCard(card)} to ${player.nickname}`);
        }
    };

    if (!anyPlayerBet) {
        restartGame(room);
        return;
    }

    let card = dealCard(room);
    room.dealerHand = [card];
    io.to(room.name).emit("deal dealer facedown card");
    await wait(DEAL_TIME);

    logInfo(`dealInitialCards: dealt ${getLoggingCard(card)} facedown to dealer`);

    for (const player of playersCopy) {
        if (!room.players.find(p => p.nickname === player.nickname)) {
            continue;
        }

        if (player.bet && player.bet > 0) {
            const card = dealCard(room);
            player.hand!.push(card);
            io.to(room.name).emit("deal player card", getUserMap(player), getCardMap(card));

            logInfo(`dealInitialCards: dealt ${getLoggingCard(card)} to ${player.nickname}`);

            await wait(DEAL_TIME);
        }
    };

    card = dealCard(room);
    room.dealerHand.push(card);
    io.to(room.name).emit("deal dealer card", getCardMap(card), getHandValueDisplay([card]));
    await wait(DEAL_TIME);
    logInfo(`dealInitialCards: dealt ${getLoggingCard(card)} to dealer`);

    // check for dealer blackjack
    if (card.value[0] === 10 || card.value.length > 1) {
        io.to(room.name).emit("dealer check blackjack");
        await wait(DEALER_CHECK_BLACKJACK_TIME);
        const handValue = getHandValue(room.dealerHand);
        if (handValue === 21) {
            io.to(room.name).emit("reveal dealer card", getCardMap(room.dealerHand![0]), getHandValueDisplay(room.dealerHand));
            await wait(DEALER_CHECK_BLACKJACK_TIME);
            await determinePayout(room);
            return;
        }
    }

    // check for players' blackjack
    const dealerValue = getHandValue(room.dealerHand);
    const dealerBusted = dealerValue > 21;
    for (const player of playersCopy) {
        const handValue = getHandValue(player.hand);
        if (handValue === 21 && player.hand!.length === 2) {
            let change = 0;
            let winnings = 0;
            let handResult = getHandResult(player.hand!, dealerValue, dealerBusted, player.bet!);
            change += handResult.change;
            winnings += handResult.winnings;
            player.cash = Math.max(player.cash! + change, 0);
            player.winningsThisRound = winnings;
            player.handResult = handResult;
            player.stand = true;
            player.bet = undefined;
            updateDbCash(player);
        }
    }

    io.to(room.name).emit("player result", getRoomMap(room));

    for (const player of playersCopy) {
        const handValue = getHandValue(player.hand);
        if (handValue === 21 && player.hand!.length === 2) {
            player.winningsThisRound = undefined;
            player.handResult = undefined;
        }
    }

    await wait(SHORT_WAIT);

    startPlayerTurns(room);
}

async function startPlayerTurns(room: Room) {
    room.phase = "players_turn";
    room.currentPlayerIndex = -1;
    io.to(room.name).emit("players turn", getRoomMap(room));

    await wait(SHORT_WAIT);
    await nextPlayer(room);
}

async function nextPlayer(room: Room) {
    clearInterval(room.timer);

    if (!rooms.has(room.name)) {
        return;
    }

    // first deal with the player's split situation
    if (room.currentPlayerIndex! >= 0) {
        const currentPlayer = room.players[room.currentPlayerIndex!];
        if (currentPlayer.hand2 && currentPlayer.currentHand === 0) {
            currentPlayer.currentHand = 1;
            currentPlayer.stand = true;
            io.to(room.name).emit("player turn", getUserMap(currentPlayer));
            setRoomTimer(room, PLAY_TIME, async () => await nextPlayer(room));
            return;
        }
    }

    let nextPlayerIndex = -1;
    for (let i = room.currentPlayerIndex! + 1; i < room.players.length; i++) {
        const handValue = getHandValue(room.players[i].hand);
        // handled already...
        const isBlackjack = handValue === 21 && room.players[i].hand!.length === 2;
        if (room.players[i].bet && room.players[i].bet! > 0 && !isBlackjack) {
            nextPlayerIndex = i;
            break;
        }
    }

    if (nextPlayerIndex === -1) {
        await wait(SHORT_WAIT);
        dealerPlays(room);
        return;
    }

    room.currentPlayerIndex = nextPlayerIndex;
    const currentPlayer = room.players[room.currentPlayerIndex];
    io.to(room.name).emit("player turn", getUserMap(currentPlayer));
    setRoomTimer(room, PLAY_TIME, async () => await nextPlayer(room));
}

async function dealerPlays(room: Room) {
    room.currentPlayerIndex = undefined;
    room.phase = "dealers_turn";
    io.to(room.name).emit("dealer plays", getRoomMap(room));
    io.to(room.name).emit("reveal dealer card", getCardMap(room.dealerHand![0]), getHandValueDisplay(room.dealerHand));
    await wait(DEAL_TIME);

    logInfo(`dealerPlays: revealed ${getLoggingCard(room.dealerHand![0])}`);

    // Check if any players are still in the game (not busted)
    const activePlayers = room.players.filter(player =>
        player.bet && player.bet > 0 && (
            getHandValue(player.hand) <= 21 ||
            (player.hand2 && getHandValue(player.hand2) <= 21)
        )
    );

    // If all players busted, no need for dealer to play
    if (activePlayers.length === 0) {
        logInfo("dealerPlays: all players busted, skipping dealer play");
        await wait(DEAL_TIME);
        determinePayout(room);
        return;
    }

    // Dealer plays according to standard blackjack rules:
    // - Must hit on 16 or below
    // - Must stand on 17 or above (including soft 17)
    let dealerValue = getHandValue(room.dealerHand);

    while (dealerValue < 17) {
        const card = dealCard(room);
        room.dealerHand!.push(card);

        io.to(room.name).emit("deal dealer card", getCardMap(card), getHandValueDisplay(room.dealerHand));
        await wait(DEAL_TIME);

        logInfo(`dealerPlays: dealt ${getLoggingCard(card)} to dealer`);

        dealerValue = getHandValue(room.dealerHand);

        if (dealerValue > 21) {
            logInfo("dealerPlays: dealer busted");
            break;
        }
    }

    logInfo(`dealerPlays: dealer stands at ${dealerValue}`);
    await wait(DEAL_TIME);
    await determinePayout(room);
}

async function determinePayout(room: Room) {
    room.phase = "payout";

    const dealerValue = getHandValue(room.dealerHand);
    const dealerBusted = dealerValue > 21;

    logInfo(`determinePayout: dealer final value: ${dealerValue}${dealerBusted ? " (bust)" : ""}`);

    // Create a copy to avoid issues if players disconnect during payout
    const playersCopy = [...room.players];
    for (const player of playersCopy) {
        // Skip if player was removed from room during iteration
        if (!room.players.find(p => p.nickname === player.nickname)) {
            continue;
        }

        // Blackjack player already paid out
        const handValue = getHandValue(player.hand);
        const isBlackjack = handValue === 21
            && player.hand!.length === 2
            && player.hand2 === undefined; // checks for split (no blackjack there)
        if (!player.bet || player.bet === 0 || isBlackjack) {
            continue;
        }

        let totalChange = 0;
        let totalWinnings = 0;
        let hand1Result = getHandResult(player.hand!, dealerValue, dealerBusted, player.bet, !!player.hand2);
        let hand2Result = undefined;
        totalChange += hand1Result.change;
        totalWinnings += hand1Result.winnings;
        if (player.hand2) {
            hand2Result = getHandResult(player.hand2, dealerValue, dealerBusted, player.bet2!, !!player.hand2);
            totalChange += hand2Result.change;
            totalWinnings += hand2Result.winnings;
        }

        player.winningsThisRound = totalWinnings;
        player.cash = Math.max(player.cash! + totalChange, 0);
        player.handResult = hand1Result;
        player.hand2Result = hand2Result;
        updateDbCash(player);

        logInfo(`determinePayout: ${player.nickname} (bet: ${player.bet}, won: ${totalWinnings}, new cash: ${player.cash})`);
    }

    io.to(room.name).emit("player result", getRoomMap(room));
    await wait(SHORT_WAIT);

    restartGame(room);
}

function updateDbCash(player: UserData) {
    if (player.isAuthenticated && player.userId) {
        prisma.user.update({
            where: { id: player.userId },
            data: { cash: player.cash }
        })
        .catch(err => {
            logError(`Failed to update cash for authenticated user ${player.nickname} (${player.userId})`, err);
        });
    } else {
        prisma.tempUser.update({
            where: {
                nickname_countryCode: {
                    nickname: player.nickname,
                    countryCode: player.countryCode
                }
            },
            data: {
                cash: player.cash
            }
        })
        .catch(err => {
            logError(`Failed to update cash for anonymous user ${player.nickname}`, err);
        });
    }
}

function getHandResult(hand: Card[], dealerValue: number, dealerBusted: boolean, bet: number, splitted: boolean = false) {
    const handValue = getHandValue(hand);
    const playerBusted = handValue > 21;
    const isBlackjack = handValue === 21 && hand.length === 2 && !splitted;

    let change = 0;
    let winnings = 0;
    let result: "win" | "lose" | "push" | "blackjack" = "lose";

    if (playerBusted) {
        result = "lose";
        winnings = -bet;
    }
    else if (dealerBusted) {
        if (isBlackjack) {
            result = "blackjack";
            change = Math.ceil(bet * 2.5);
            winnings = Math.ceil(bet * 1.5);
        } else {
            result = "win";
            change = bet * 2;
            winnings = bet;
        }
    }
    else if (handValue > dealerValue) {
        if (isBlackjack) {
            result = "blackjack";
            change = Math.ceil(bet * 2.5);
            winnings = Math.ceil(bet * 1.5);
        } else {
            result = "win";
            change = bet * 2;
            winnings = bet;
        }
    }
    else if (handValue === dealerValue) {
        result = "push";
        change = bet;
    }
    else {
        result = "lose";
        winnings = -bet;
    }

    return { change, winnings, result };
}

function restartGame(room: Room) {
    if (!rooms.has(room.name)) {
        return;
    }

    room.players.forEach(player => {
        player.bet = undefined;
        player.bet2 = undefined;
        player.check = undefined;
        player.stand = undefined;
        player.stand2 = undefined;
        player.hand = undefined;
        player.hand2 = undefined;
        player.currentHand = undefined;
        player.winningsThisRound = undefined;
        player.handResult = undefined;
        player.hand2Result = undefined;
    });

    room.dealerHand = undefined;
    room.phase = "bet";

    io.to(room.name).emit("restart", getRoomMap(room));

    setRoomTimer(room, BET_TIME, async () => await dealInitialCards(room));
}

async function setRoomTimer(room: Room, totalTime: number, next: () => void) {
    clearInterval(room.timer);

    room.timeLeft = totalTime;
    room.timer = setInterval(() => {
        room.timeLeft!--;
        io.to(room.name).emit("timer update", room.timeLeft, totalTime);

        if (room.timeLeft! <= 0) {
            room.timeLeft = 0;
            clearInterval(room.timer);
            next();
        }
    }, 1000);

    io.to(room.name).emit("timer update", totalTime, totalTime);
}

function dealCard(room: Room) {
    const card = room.shoe!.shift()!;
    room.cardsDealt = (room.cardsDealt ?? 0) + 1;

    if (shouldReshuffle(room.cardsDealt)) {
        room.needsReshuffle = true;
        logInfo(`Reshuffle threshold reached (${room.cardsDealt} cards dealt)`);
    }

    return card;
}

function buildShoe() {
    return shuffle(Array(NUM_DECKS).fill(null).flatMap(() => [...DECK]));
}

function shouldReshuffle(cardsDealt: number): boolean {
    const dealCardsBeforeShuffle = Math.floor(TOTAL_CARDS * DECK_PENETRATION); // ~234
    return cardsDealt >= dealCardsBeforeShuffle;
}

async function wait(seconds: number) {
    await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

function getHandValue(hand?: Card[]) {
    if (!hand || hand.length === 0) return 0;

    let value = 0;
    let numAces = 0;

    for (const card of hand) {
        value += card.value[0];
        if (card.value.length > 1) numAces++;
    }

    while (numAces > 0 && value + 10 <= 21) {
        value += 10;
        numAces--;
    }

    return value;
}

function getHandValueDisplay(hand?: Card[], allowBlackjack: boolean = true) {
    if (!hand || hand.length === 0) return { value: 0, status: null };

    let low = 0;
    let numAces = 0;

    for (const card of hand) {
        low += card.value[0];
        if (card.value.length > 1) numAces++;
    }

    const bestValue = numAces > 0 && low + 10 <= 21 ? low + 10 : low;
    let status: "Blackjack!" | "Bust!" | null = null;
    if (bestValue === 21 && hand.length === 2 && allowBlackjack) {
        status = "Blackjack!";
        return { value: 21, status };
    } else if (bestValue > 21) {
        status = "Bust!";
    }

    if (numAces > 0 && low + 10 <= 21) {
        return { value: { low, high: low + 10 }, status };
    }

    return { value: low, status };
}

function getUserMap(user: UserData) {
    return {
        nickname: user.nickname,
        countryCode: user.countryCode,
        cash: user.cash,
        lastRefillAt: user.lastRefillAt?.toISOString(),
        bet: user.bet,
        bet2: user.bet2,
        totalBet: user.bet
            ? user.bet2
                ? user.bet + user.bet2
                : user.bet
            : undefined,
        betBefore: user.betBefore,
        check: user.check,
        stand: user.stand,
        stand2: user.stand2,
        hand: user.hand?.map(c => getCardMap(c)),
        hand2: user.hand2?.map(c => getCardMap(c)),
        handValue: getHandValueDisplay(user.hand, user.hand2 === undefined),
        hand2Value: getHandValueDisplay(user.hand2, user.hand2 === undefined),
        currentHand: user.currentHand,
        winningsThisRound: user.winningsThisRound,
        handResult: user.handResult,
        hand2Result: user.hand2Result,
        disconnected: user.disconnected,
    }
}

function getRoomMap(room: Room) {
    return {
        name: room.name,
        players: room.players.map(p => getUserMap(p)),
        timeLeft: room.timeLeft,
        phase: room.phase,
        dealerHand: room.dealerHand?.map(c => getCardMap(c)),
        currentPlayer: room.currentPlayerIndex && room.currentPlayerIndex >= 0 ?
            getUserMap(room.players[room.currentPlayerIndex]) :
            undefined,
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

export function getLoggingCard(card: Card): string {
    const SUIT_EMOJI: Record<string, string> = {
        spades: "♠",
        hearts: "♥",
        clubs: "♣",
        diamonds: "♦",
    };

    return `${card.rank}${SUIT_EMOJI[card.suit]}`;
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
        logInfo("Geo lookup failed", err);
    }
    return null;
}

export function getRooms() {
    return rooms;
}

export function getUsers() {
    return users;
}

export function getIo() {
    return io;
}

export default server;
