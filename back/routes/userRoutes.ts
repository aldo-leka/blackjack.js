import { Router } from 'express';
import { getUserCash } from '../controllers/userController';

const router = Router();

router.get('/:email/cash', getUserCash);

export default router;
