import { Request, Response } from 'express';
import { getRooms, getLoggingCard } from '../app';
import { MAX_PLAYERS_PER_ROOM } from '../util';
import prisma from '../db';
import { logError } from '../log';

export const getRoomsAscii = (req: Request, res: Response) => {
    try {
        const rooms = getRooms();

        let ascii = '';
        ascii += '╔═══════════════════════════════════════════════════════════════════╗\n';
        ascii += '║                         BLACKJACK ROOMS                           ║\n';
        ascii += '╠═══════════════════════════════════════════════════════════════════╣\n';

        if (rooms.size === 0) {
            ascii += '║  No active rooms                                                  ║\n';
        } else {
            rooms.forEach((room, roomName) => {
                ascii += `║  ${roomName.padEnd(30)} Players: ${room.players.length}/${MAX_PLAYERS_PER_ROOM}${' '.repeat(21)}║\n`;
                ascii += '║  ─────────────────────────────────────────────────────────────  ║\n';

                if (room.dealerHand && room.dealerHand.length > 0) {
                    const dealerCards = room.dealerHand.map(c => getLoggingCard(c)).join(' ');
                    ascii += `║    DEALER: ${dealerCards.padEnd(50)}║\n`;
                    ascii += '║                                                                   ║\n';
                }

                room.players.forEach((player, index) => {
                    const flag = player.countryCode || '??';
                    const nickname = player.nickname.padEnd(20);
                    const cash = `$${player.cash}`.padStart(10);
                    const bet = player.bet ? `Bet: $${player.bet}`.padEnd(12) : ''.padEnd(12);
                    ascii += `║    ${(index + 1)}. [${flag}] ${nickname} ${cash} ${bet}║\n`;

                    if (player.hand && player.hand.length > 0) {
                        const playerCards = player.hand.map(c => getLoggingCard(c)).join(' ');
                        ascii += `║       Hand: ${playerCards.padEnd(52)}║\n`;
                    }
                });

                ascii += '║                                                                   ║\n';
            });
        }

        ascii += '╚═══════════════════════════════════════════════════════════════════╝\n';

        res.type('text/plain').send(ascii);
    } catch (error) {
        res.status(500).send('Failed to fetch rooms');
    }
};

export const getLogs = async (req: Request, res: Response) => {
    try {
        const { level, limit = '100', offset = '0' } = req.query;

        const whereClause = level && typeof level === 'string'
            ? { level: level.toLowerCase() }
            : undefined;

        const logs = await prisma.log.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            take: parseInt(limit as string),
            skip: parseInt(offset as string),
        });

        const totalCount = await prisma.log.count({
            where: whereClause,
        });

        res.json({
            logs,
            pagination: {
                total: totalCount,
                limit: parseInt(limit as string),
                offset: parseInt(offset as string),
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
};

export const getTopPlayers = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 5;

        // Get top authenticated users
        const authUsers = await prisma.user.findMany({
            select: {
                id: true,
                nickname: true,
                cash: true,
                image: true,
            },
            orderBy: { cash: 'desc' },
            take: limit * 2, // Get more to ensure we have enough after combining
        });

        // Get top anonymous users
        const tempUsers = await prisma.tempUser.findMany({
            select: {
                nickname: true,
                cash: true,
                countryCode: true,
            },
            orderBy: { cash: 'desc' },
            take: limit * 2,
        });

        // Combine and sort by cash
        const combined = [
            ...authUsers.map((u) => ({
                nickname: u.nickname || 'Anonymous',
                cash: u.cash,
                countryCode: 'XX', // Authenticated users don't have stored country code
                image: u.image || null,
                isAuthenticated: true,
            })),
            ...tempUsers.map((u) => ({
                nickname: u.nickname,
                cash: u.cash,
                countryCode: u.countryCode,
                image: null,
                isAuthenticated: false,
            })),
        ]
        .sort((a, b) => b.cash - a.cash)
        .slice(0, limit)
        .map((player, idx) => ({
            rank: idx + 1,
            ...player,
        }));

        return res.json({ leaderboard: combined });
    } catch (error) {
        logError('Error fetching leaderboard:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
