import { Request, Response } from 'express';
import { getRooms } from '../app';
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

                room.players.forEach((player, index) => {
                    const flag = player.countryCode || '??';
                    const nickname = player.nickname.padEnd(20);
                    const cash = `$${player.cash}`.padStart(10);
                    ascii += `║    ${(index + 1)}. [${flag}] ${nickname} ${cash}${' '.repeat(14)}║\n`;
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
