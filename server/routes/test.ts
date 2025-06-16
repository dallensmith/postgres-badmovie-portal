import express from 'express';
import { prisma } from '../index.js';

const router = express.Router();

// GET /api/test/experiment-grouping - Test experiment grouping
router.get('/experiment-grouping', async (_req, res) => {
  try {
    // Get experiment 002 specifically to test grouping
    const exp002Records = await prisma.experiment.findMany({
      where: { experimentNumber: '002' },
      select: {
        id: true,
        experimentNumber: true,
        eventDate: true,
        experimentMovies: true,
        createdAt: true
      }
    });

    // Group them
    const experimentGroups = new Map();
    exp002Records.forEach(exp => {
      const key = exp.experimentNumber || 'unknown';
      if (!experimentGroups.has(key)) {
        experimentGroups.set(key, {
          id: exp.id,
          experimentNumber: exp.experimentNumber,
          eventDate: exp.eventDate,
          experimentMovies: [],
          createdAt: exp.createdAt
        });
      }
      const group = experimentGroups.get(key);
      if (Array.isArray(exp.experimentMovies)) {
        group.experimentMovies.push(...exp.experimentMovies);
      }
    });

    const grouped = Array.from(experimentGroups.values());

    res.json({
      message: 'Experiment grouping test',
      rawRecords: exp002Records,
      grouped: grouped
    });

  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
