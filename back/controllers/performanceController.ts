import { Request, Response } from 'express';
import prisma from '../db';
import { logInfo } from '../log';

interface PerformanceLogData {
    fps: number;
    avgFrameTime: number;
    longTasks: number;
    memoryUsage?: number;
    url: string;
    userNickname?: string;
    deviceType?: string;
}

export const logPerformance = async (req: Request, res: Response) => {
    try {
        const data: PerformanceLogData = req.body;
        const userAgent = req.headers['user-agent'];

        if (!data.fps || !data.avgFrameTime || data.longTasks === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const perfLog = await prisma.performanceLog.create({
            data: {
                userAgent,
                fps: data.fps,
                avgFrameTime: data.avgFrameTime,
                longTasks: data.longTasks,
                memoryUsage: data.memoryUsage,
                url: data.url,
                userNickname: data.userNickname,
                deviceType: data.deviceType,
            },
        });

        logInfo(`Performance logged: ${data.fps} fps, ${data.avgFrameTime}ms avg frame time`);

        return res.status(201).json({ success: true, id: perfLog.id });
    } catch (error) {
        console.error('Error logging performance:', error);
        return res.status(500).json({ error: 'Failed to log performance' });
    }
};

export const getPerformanceLogs = async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const minFps = req.query.minFps ? parseInt(req.query.minFps as string) : undefined;
        const maxFps = req.query.maxFps ? parseInt(req.query.maxFps as string) : undefined;

        const where: any = {};
        if (minFps !== undefined || maxFps !== undefined) {
            where.fps = {};
            if (minFps !== undefined) where.fps.gte = minFps;
            if (maxFps !== undefined) where.fps.lte = maxFps;
        }

        const logs = await prisma.performanceLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit,
        });

        // Format for easy reading
        const formatted = logs.map(log => ({
            id: log.id,
            timestamp: log.timestamp.toISOString(),
            fps: log.fps,
            avgFrameTime: `${log.avgFrameTime.toFixed(2)}ms`,
            longTasks: log.longTasks,
            memoryUsage: log.memoryUsage ? `${log.memoryUsage.toFixed(1)}MB` : 'N/A',
            device: log.deviceType || 'Unknown',
            user: log.userNickname || 'Anonymous',
            url: log.url,
            userAgent: log.userAgent?.slice(0, 100) + '...' || 'Unknown',
        }));

        return res.json({
            count: logs.length,
            logs: formatted,
        });
    } catch (error) {
        console.error('Error fetching performance logs:', error);
        return res.status(500).json({ error: 'Failed to fetch performance logs' });
    }
};
