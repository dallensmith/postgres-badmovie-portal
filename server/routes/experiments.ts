import express from 'express';
import { prisma } from '../index.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createExperimentSchema = z.object({
  experimentNumber: z.string().max(10),
  eventDate: z.string().transform(str => new Date(str)),
  eventLocation: z.string().max(255),
  eventHost: z.string().max(255),
  eventNotes: z.string().optional().nullable(),
  eventAttendees: z.string().optional().nullable(),
  eventEncore: z.boolean().optional().default(false),
  eventImage: z.string().optional().nullable(),
  postUrl: z.string().optional().nullable()
});

const updateExperimentSchema = createExperimentSchema.partial();

// Helper function to calculate encore status for movies
async function calculateEncoreStatus(experiments: any[]) {
  // Get all movie-experiment relationships ordered by experiment date
  const allMovieExperiments = await prisma.movieExperiment.findMany({
    include: {
      movie: true,
      experiment: true
    },
    orderBy: {
      experiment: {
        eventDate: 'asc'
      }
    }
  });

  // Track first appearance of each movie
  const movieFirstAppearance = new Map<number, string>();
  
  for (const me of allMovieExperiments) {
    if (!movieFirstAppearance.has(me.movieId)) {
      movieFirstAppearance.set(me.movieId, me.experiment.experimentNumber);
    }
  }

  // Mark encores in the experiments
  return experiments.map(experiment => ({
    ...experiment,
    movieExperiments: experiment.movieExperiments?.map((me: any) => ({
      ...me,
      isEncore: movieFirstAppearance.get(me.movie.id) !== experiment.experimentNumber
    }))
  }));
}

// GET /api/experiments - List all experiments
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const sortBy = req.query.sortBy as string || 'date';
    const sortOrder = req.query.sortOrder as string || 'desc';
    
    // Build where clause for search
    const whereClause = search ? {
      OR: [
        { experimentNumber: { contains: search, mode: 'insensitive' as const } },
        { eventHost: { contains: search, mode: 'insensitive' as const } },
        { eventLocation: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};
    
    // Build orderBy clause
    const orderByClause = sortBy === 'number' 
      ? { experimentNumber: sortOrder as 'asc' | 'desc' }
      : { eventDate: sortOrder as 'asc' | 'desc' };
    
    const [experiments, total] = await Promise.all([
      prisma.experiment.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          movieExperiments: {
            include: { movie: true },
            orderBy: { id: 'asc' }
          }
        },
        orderBy: orderByClause
      }),
      prisma.experiment.count({ where: whereClause })
    ]);

    // Calculate encore status for movies
    const experimentsWithEncores = await calculateEncoreStatus(experiments);
    
    res.json({
      experiments: experimentsWithEncores,
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

// GET /api/experiments/list - Get simple list for dropdowns
router.get('/list', async (_req, res) => {
  try {
    const experiments = await prisma.experiment.findMany({
      select: {
        id: true,
        experimentNumber: true,
        eventDate: true,
        eventHost: true,
        eventLocation: true
      },
      orderBy: [
        { experimentNumber: 'asc' }
      ]
    });
    
    res.json(experiments);
  } catch (error) {
    console.error('Error fetching experiments list:', error);
    res.status(500).json({ error: 'Failed to fetch experiments list' });
  }
});

// GET /api/experiments/:id - Get single experiment
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: {
        movieExperiments: {
          include: { movie: true },
          orderBy: { id: 'asc' }
        }
      }
    });
    
    if (!experiment) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    // Calculate encore status for this experiment
    const experimentWithEncores = await calculateEncoreStatus([experiment]);
    
    res.json(experimentWithEncores[0]);
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
        movieExperiments: { include: { movie: true } }
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
        movieExperiments: { include: { movie: true } }
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
    const { movieId } = req.body;
    
    const movieExperiment = await prisma.movieExperiment.create({
      data: {
        experimentId,
        movieId: parseInt(movieId)
      },
      include: {
        movie: true
      }
    });
    
    res.status(201).json(movieExperiment);
  } catch (error) {
    console.error('Error adding movie to experiment:', error);
    res.status(500).json({ error: 'Failed to add movie to experiment' });
  }
});

// GET /api/experiments/stats - Get experiment statistics
router.get('/stats', async (_req, res) => {
  try {
    const [
      totalExperiments,
      totalMovieExperiments
    ] = await Promise.all([
      prisma.experiment.count(),
      prisma.movieExperiment.count()
    ]);
    
    res.json({
      totalExperiments,
      totalMovieExperiments
    });
  } catch (error) {
    console.error('Error fetching experiment stats:', error);
    res.status(500).json({ error: 'Failed to fetch experiment statistics' });
  }
});

// POST /api/experiments/:id/movies/:movieId - Link movie to experiment
router.post('/:id/movies/:movieId', async (req, res) => {
  try {
    const experimentId = parseInt(req.params.id);
    const movieId = parseInt(req.params.movieId);
    
    // Check if relationship already exists
    const existing = await prisma.movieExperiment.findFirst({
      where: {
        experimentId,
        movieId
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Movie is already linked to this experiment' });
    }
    
    const movieExperiment = await prisma.movieExperiment.create({
      data: {
        experimentId,
        movieId
      },
      include: {
        experiment: true,
        movie: {
          select: {
            movieTitle: true
          }
        }
      }
    });
    
    res.json(movieExperiment);
  } catch (error) {
    console.error('Error linking movie to experiment:', error);
    res.status(500).json({ error: 'Failed to link movie to experiment' });
  }
});

// DELETE /api/experiments/:id/movies/:movieId - Unlink movie from experiment
router.delete('/:id/movies/:movieId', async (req, res) => {
  try {
    const experimentId = parseInt(req.params.id);
    const movieId = parseInt(req.params.movieId);
    
    const movieExperiment = await prisma.movieExperiment.findFirst({
      where: {
        experimentId,
        movieId
      }
    });
    
    if (!movieExperiment) {
      return res.status(404).json({ error: 'Movie-experiment relationship not found' });
    }
    
    await prisma.movieExperiment.delete({
      where: { id: movieExperiment.id }
    });
    
    res.json({ message: 'Movie unlinked from experiment successfully' });
  } catch (error) {
    console.error('Error unlinking movie from experiment:', error);
    res.status(500).json({ error: 'Failed to unlink movie from experiment' });
  }
});

export default router;
