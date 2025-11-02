import { Request, Response } from 'express';
import prisma from '../db';
import { logInfo, logError } from '../log';
import { DAILY_REFILL_VALUE } from '../util';
import config from '../config/config';

export const dailyRefillTempUsers = async (req: Request, res: Response) => {
    try {
        const authToken = req.headers['authorization'];
        if (authToken !== `Bearer ${config.cronSecret}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const twentyFourHoursAgo = new Date();
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

        const result = await prisma.tempUser.updateMany({
            where: {
                lastRefillAt: {
                    lt: twentyFourHoursAgo
                }
            },
            data: {
                cash: DAILY_REFILL_VALUE,
                lastRefillAt: new Date()
            }
        });

        return res.json({
            success: true,
            refilled: result.count,
            message: `Successfully refilled ${result.count} temp users`
        });
    } catch (error) {
        logError('Error during daily refill:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
