import { Router } from 'express';
import { logPerformance, getPerformanceLogs } from '../controllers/performanceController';

const router = Router();

router.post('/perf', logPerformance);
router.get('/perf', getPerformanceLogs);

export default router;
