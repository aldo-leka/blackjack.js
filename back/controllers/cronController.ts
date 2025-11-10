import { Request, Response } from 'express';
import prisma from '../db';
import { logInfo, logError } from '../log';
import { REFILL_VALUE, REFILL_INTERVAL } from '../util';
import config from '../config/config';
import { getIo, getUsers } from '../app';

export const refillUsers = async (req: Request, res: Response) => {
    try {
        const authToken = req.headers['authorization'];
        if (authToken !== `Bearer ${config.cronSecret}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const intervalAgo = new Date();
        intervalAgo.setSeconds(intervalAgo.getSeconds() - REFILL_INTERVAL);

        const tempUsersToRefill = await prisma.tempUser.findMany({
            where: {
                cash: 0,
                lastRefillAt: {
                    lt: intervalAgo
                }
            }
        });

        const tempResult = await prisma.tempUser.updateMany({
            where: {
                cash: 0,
                lastRefillAt: {
                    lt: intervalAgo
                }
            },
            data: {
                cash: REFILL_VALUE,
                lastRefillAt: new Date()
            }
        });

        const authUsersToRefill = await prisma.user.findMany({
            where: {
                cash: 0,
                lastRefillAt: {
                    lt: intervalAgo
                }
            }
        });

        const authResult = await prisma.user.updateMany({
            where: {
                cash: 0,
                lastRefillAt: {
                    lt: intervalAgo
                }
            },
            data: {
                cash: REFILL_VALUE,
                lastRefillAt: new Date()
            }
        });

        const io = getIo();
        const users = getUsers();

        for (const user of tempUsersToRefill) {
            // Update in-memory user cash
            const socketUser = users.get(user.nickname);
            if (socketUser) {
                socketUser.cash = REFILL_VALUE;
                socketUser.lastRefillAt = new Date();
            }

            io.emit('user refilled', user.nickname, REFILL_VALUE);
            logInfo(`Refilled temp user ${user.nickname} with ${REFILL_VALUE} cash`);
        }

        for (const user of authUsersToRefill) {
            if (user.nickname) {
                // Update in-memory user cash
                const socketUser = users.get(user.nickname);
                if (socketUser) {
                    socketUser.cash = REFILL_VALUE;
                    socketUser.lastRefillAt = new Date();
                }

                io.emit('user refilled', user.nickname, REFILL_VALUE);
                logInfo(`Refilled authenticated user ${user.nickname} with ${REFILL_VALUE} cash`);
            }
        }

        return res.json({
            success: true,
            refilled: tempResult.count + authResult.count,
            message: `Successfully refilled ${tempResult.count} temp users and ${authResult.count} authenticated users`
        });
    } catch (error) {
        logError('Error during refill:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
