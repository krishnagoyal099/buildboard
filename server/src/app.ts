// server/src/app.ts
import express from 'express';
import cors from 'cors';

const app = express();

// Configure CORS to allow requests from the frontend (typically localhost:5173 in dev)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST']
}));

app.use(express.json());

// Simple health check route
app.get('/health', (req, res) => {
  res.status(200).send('BuildBoard Server is running');
});

export default app;