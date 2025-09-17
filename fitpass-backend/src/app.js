
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import enrolamientoRouter from './routes/enrolamiento.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/enrolamientos', enrolamientoRouter);

app.use(errorHandler);

export default app;
