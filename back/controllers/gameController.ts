import { Request, Response } from 'express';
import { getRooms, getLoggingCard } from '../app';
import { MAX_PLAYERS_PER_ROOM } from '../util';

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
