import { Router } from 'express';
import {
  googleCallback,
  googleStart,
  login,
  me,
  register,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/me', requireAuth, me);
authRouter.get('/google', googleStart);
authRouter.get('/google/callback', googleCallback);
