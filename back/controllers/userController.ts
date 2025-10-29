import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logError, logWarning } from '../log';

const prisma = new PrismaClient();

export const getUserCash = async (req: Request, res: Response) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({ error: 'User email is required' });
        }

        const user = await prisma.user.findUnique({
            where: { email: email },
            select: { cash: true, id: true, name: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({ cash: user.cash, userId: user.id, name: user.name });
    } catch (error) {
        logError('Error fetching user cash:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
