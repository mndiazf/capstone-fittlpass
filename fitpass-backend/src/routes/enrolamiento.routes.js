import { Router } from 'express';
import { enrolarOneShot } from '../controllers/enrolamiento.controller.js';

const router = Router();

// JSON one-shot (lo que tu UI puede enviar directamente)
router.post('/one-shot', enrolarOneShot);

export default router;
