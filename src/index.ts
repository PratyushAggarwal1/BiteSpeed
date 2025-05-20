import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import identityRoutes from './routes/identityRoutes';

dotenv.config(); // Load environment variables from .env file

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Middleware to parse JSON bodies

// Routes
app.use('/api', identityRoutes); // Prefix all identity routes with /api

// Simple root route
app.get('/', (req: Request, res: Response) => {
  res.send('Bitespeed Identity Reconciliation Service');
});

// Error handling middleware (simple example)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!', message: err.message });
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});