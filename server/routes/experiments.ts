import express from 'express';
import { prisma } from '../index.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createExperimentSchema = z.object({
  experimentNumber: z.string().max(50).optional(),
  eventDate: z.string().transform(str => new Date(str)).optional(),
  eventLocation: z.string().optional(),
  eventHost: z.string().max(255).optional(),
  experimentNotes: z.string().optional(),
  experimentImageUrl: z.string().url().optional(),
  participantCount: z.number().int().positive().optional()
});

const updateExperimentSchema = createExperimentSchema.partial();

// GET /api/experiments - List all experiments
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    
    const [experiments, total] = await Promise.all([
      prisma.experiment.findMany({
        skip,
        take: limit,
        include: {
          movies: {
            include: { movie: true },
            orderBy: { watchOrder: 'asc' }
          }
        },
        orderBy: { eventDate: 'desc' }
      }),
      prisma.experiment.count()
    ]);
    
    res.json({
      experiments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching experiments:', error);
    res.status(500).json({ error: 'Failed to fetch experiments' });
  }
});

// GET /api/experiments/:id - Get single experiment
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: {
        movies: {
          include: { 
            movie: {
              include: {
                genres: { include: { genre: true } },
                cast: { 
                  include: { person: true },
                  orderBy: { castOrder: 'asc' },
                  take: 5 // Limit cast for performance
                }
              }
            }
          },
          orderBy: { watchOrder: 'asc' }
        }
      }
    });
    
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }
    
    res.json(experiment);
  } catch (error) {
    console.error('Error fetching experiment:', error);
    res.status(500).json({ error: 'Failed to fetch experiment' });
  }
});

// POST /api/experiments - Create new experiment
router.post('/', async (req, res) => {
  try {
    const validatedData = createExperimentSchema.parse(req.body);
    
    const experiment = await prisma.experiment.create({
      data: validatedData,
      include: {
        movies: { include: { movie: true } }
      }
    });
    
    res.status(201).json(experiment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating experiment:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

// PUT /api/experiments/:id - Update experiment
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = updateExperimentSchema.parse(req.body);
    
    const experiment = await prisma.experiment.update({
      where: { id },
      data: validatedData,
      include: {
        movies: { include: { movie: true } }
      }
    });
    
    res.json(experiment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating experiment:', error);
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

// DELETE /api/experiments/:id - Delete experiment
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    await prisma.experiment.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting experiment:', error);
    res.status(500).json({ error: 'Failed to delete experiment' });
  }
});

// POST /api/experiments/:id/movies - Add movie to experiment
router.post('/:id/movies', async (req, res) => {
  try {
    const experimentId = parseInt(req.params.id);
    const { movieId, watchOrder, notes, rating } = req.body;
    
    const experimentMovie = await prisma.experimentMovie.create({
      data: {
        experimentId,
        movieId: parseInt(movieId),
        watchOrder: watchOrder ? parseInt(watchOrder) : undefined,
        notes,
        rating: rating ? parseInt(rating) : undefined
      },
      include: {
        movie: true
      }
    });
    
    res.status(201).json(experimentMovie);
  } catch (error) {
    console.error('Error adding movie to experiment:', error);
    res.status(500).json({ error: 'Failed to add movie to experiment' });
  }
});

// GET /api/experiments/stats - Get experiment statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalExperiments,
      totalMovies,
      avgRating,
      topGenres
    ] = await Promise.all([
      prisma.experiment.count(),
      prisma.experimentMovie.count(),
      prisma.experimentMovie.aggregate({
        _avg: { rating: true }
      }),
      prisma.movieGenre.groupBy({
        by: ['genreId'],
        _count: { genreId: true },
        orderBy: { _count: { genreId: 'desc' } },
        take: 5
      })
    ]);
    
    res.json({
      totalExperiments,
      totalMovies,
      averageRating: avgRating._avg.rating,
      topGenres
    });
  } catch (error) {
    console.error('Error fetching experiment stats:', error);
    res.status(500).json({ error: 'Failed to fetch experiment statistics' });
  }
});

export default router;
