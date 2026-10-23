import { Router } from 'express';
import documentRoutes from './document.routes';

const router = Router();

router.use('/', documentRoutes);

export default router;
