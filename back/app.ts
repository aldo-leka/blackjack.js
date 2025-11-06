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
    DAILY_REFILL_VALUE,
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
    DEALER_CHECK_BLACKJACK_TIME
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
    socket.on("register nickname", async (nickname) => {
        logInfo(`register nickname: handshake - '${nickname}'`);
        const existing = users.get(nickname);

        if (existing) {
            if (!existing.disconnected && existing.socketId != socket.id) {
                logInfo(`register nickname: '${nickname}' unavailable`);
                socket.emit('nickname unavailable');
                return;
            }

            clearTimeout(existing.disconnectedTimer);
            existing.disconnected = false;
            logInfo(`register nickname: ${nickname} from ${existing.countryCode} reconnected before timeout`);
        }

        socket.data.nickname = nickname;

        const ip = getIp(socket);
        const countryCode = existing?.countryCode || await getCountryCodeFromIP(ip) || "somewhere";

        // Don't allow users to get a refill if same nickname & country
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
                socketId: socket.id,
                nickname,
                countryCode,
                cash: tempUser.cash,
                disconnected: false,
            });
        }

        logInfo(`register nickname: handshake complete - '${nickname}' from ${countryCode} (ip: ${ip})`);
        socket.emit('nickname accepted');
    });

    socket.on("disconnect", () => {
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

        const timeoutId = setTimeout(() => {
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
                    nextPlayer(room);
                }

                if (room.players.length === 0) {
                    clearInterval(room.timer);
                    rooms.delete(room.name);
                } else {
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
            const timer = setInterval(() => {
                const room = rooms.get(roomFoundName);
                if (room) {
                    room.timeLeft!--;
                    io.to(roomFoundName).emit("timer update", room.timeLeft, BET_TIME);

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
                timeLeft: BET_TIME,
                phase: "bet"
            });

            socket.emit("timer update", BET_TIME, BET_TIME);

            const room = rooms.get(roomFoundName)!;
            room.shoe = buildShoe();
            room.cardsDealt = 0;
            room.needsReshuffle = false;
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

        if (!user.hand) {
            logWarning(`hit: no hand for user '${nickname}'`);
            return;
        }

        if (user.stand === true) {
            logWarning(`hit: user '${nickname}' is standing`);
            return;
        }

        let handValue = getHandValue(user.hand);
        if (handValue >= 21) {
            logWarning(`hit: user '${nickname}' has already 21 or busted, hand value: ${handValue}`);
            return;
        }

        const card = dealCard(room);
        user.hand.push(card);

        io.to(room.name).emit("deal player card", getUserMap(user), getCardMap(card));
        logInfo(`hit: dealt ${getLoggingCard(card)} to ${nickname}`);

        handValue = getHandValue(user.hand);
        if (handValue > 21) {
            logInfo(`hit: ${nickname} busted with ${handValue}`);
            await wait(2);
            nextPlayer(room);
        } else if (handValue === 21) {
            logInfo(`hit: ${nickname} reached 21`);
            await wait(2);
            nextPlayer(room);
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

        if (user.stand === true) {
            logWarning(`stand: '${nickname}' is already marked as stand`);
            return;
        }

        user.stand = true;
        logInfo(`stand: ${nickname} stands with ${getHandValue(user.hand)}`);
        nextPlayer(room);
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

    startPlayerTurns(room);
}

async function startPlayerTurns(room: Room) {
    room.phase = "players_turn";
    room.currentPlayerIndex = -1;
    io.to(room.name).emit("players turn", getRoomMap(room));

    await wait(SHORT_WAIT);

    nextPlayer(room);
}

async function nextPlayer(room: Room) {
    clearInterval(room.timer);

    if (!rooms.has(room.name)) {
        return;
    }

    let nextPlayerIndex = -1;
    for (let i = room.currentPlayerIndex! + 1; i < room.players.length; i++) {
        if (room.players[i].bet && room.players[i].bet! > 0) {
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

    const handValue = getHandValue(currentPlayer.hand);
    if (handValue === 21 && currentPlayer.hand!.length === 2) {
        logInfo(`nextPlayer: ${currentPlayer.nickname} has blackjack!`);
        currentPlayer.stand = true;
        io.to(room.name).emit("player turn", getUserMap(currentPlayer));
        await wait(SHORT_WAIT);
        nextPlayer(room);
        return;
    }

    io.to(room.name).emit("player turn", getUserMap(currentPlayer));

    room.timeLeft = PLAY_TIME;
    room.timer = setInterval(() => {
        room.timeLeft!--;
        io.to(room.name).emit("timer update", room.timeLeft, PLAY_TIME);

        if (room.timeLeft! <= 0) {
            room.timeLeft = 0;
            clearInterval(room.timer);
            currentPlayer.stand = true;
            logInfo(`nextPlayer: ${currentPlayer.nickname} timed out, auto-standing`);
            nextPlayer(room);
        }
    }, 1000);

    io.to(room.name).emit("timer update", PLAY_TIME, PLAY_TIME);
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
        player.bet && player.bet > 0 && getHandValue(player.hand) <= 21
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

        if (!player.bet || player.bet === 0) {
            continue;
        }

        const playerHandValue = getHandValue(player.hand);
        const playerBusted = playerHandValue > 21;
        const isBlackjack = playerHandValue === 21 && player.hand!.length === 2;

        let winAmount = 0;
        let result: "win" | "lose" | "push" | "blackjack" = "lose";

        if (playerBusted) {
            result = "lose";
            winAmount = -player.bet;
        } else if (dealerBusted) {
            if (isBlackjack) {
                result = "blackjack";
                winAmount = Math.floor(player.bet * 1.5); // Blackjack pays 3:2
            } else {
                result = "win";
                winAmount = player.bet;
            }
        } else if (playerHandValue > dealerValue) {
            if (isBlackjack) {
                result = "blackjack";
                winAmount = Math.floor(player.bet * 1.5);
            } else {
                result = "win";
                winAmount = player.bet;
            }
        } else if (playerHandValue === dealerValue) {
            result = "push";
            winAmount = 0;
        } else {
            result = "lose";
            winAmount = -player.bet;
        }

        player.cash = Math.max(player.cash! + winAmount, 0);

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
        }).catch(err => {
            logError(`Failed to update cash for ${player.nickname}`, err);
        });

        logInfo(`determinePayout: ${player.nickname} ${result} (hand value: ${playerHandValue}, bet: ${player.bet}, won: ${winAmount}, new cash: ${player.cash})`);

        io.to(room.name).emit("player result", player.nickname, result, winAmount, player.cash);
    }

    await wait(SHORT_WAIT);
    restartGame(room);
}

function restartGame(room: Room) {
    if (!rooms.has(room.name)) {
        return;
    }

    room.players.forEach(player => {
        player.bet = undefined;
        player.check = undefined;
        player.stand = undefined;
        player.hand = undefined;
    });

    room.dealerHand = undefined;
    clearInterval(room.timer);
    room.timeLeft = BET_TIME;
    room.phase = "bet";

    io.to(room.name).emit("restart", getRoomMap(room));

    room.timer = setInterval(() => {
        room.timeLeft!--;
        io.to(room.name).emit("timer update", room.timeLeft, BET_TIME);

        if (room.timeLeft! <= 0) {
            room.timeLeft = 0;
            clearInterval(room.timer);
            dealInitialCards(room);
        }
    }, 1000);

    io.to(room.name).emit("timer update", BET_TIME, BET_TIME);
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

function getHandValueDisplay(hand?: Card[]) {
    if (!hand || hand.length === 0) return { value: 0, status: null };

    let low = 0;
    let numAces = 0;

    for (const card of hand) {
        low += card.value[0];
        if (card.value.length > 1) numAces++;
    }

    const bestValue = numAces > 0 && low + 10 <= 21 ? low + 10 : low;
    let status: "Blackjack!" | "Bust!" | null = null;
    if (bestValue === 21 && hand.length === 2) {
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
        bet: user.bet,
        betBefore: user.betBefore,
        check: user.check,
        stand: user.stand,
        hand: user.hand?.map(c => getCardMap(c)),
        handValue: getHandValueDisplay(user.hand),
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

export default server;
