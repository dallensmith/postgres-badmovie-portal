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

// GET /api/experiments - List all experiments
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const year = req.query.year as string || '';
    const sortBy = req.query.sortBy as string || 'date';
    const sortOrder = req.query.sortOrder as string || 'desc';
    
    // Build where clause for search and filters
    const whereClause: any = {};
    
    // Search filter - optimized two-step approach
    if (search) {
      // Step 1: Find experiment IDs that have movies with matching titles (fast separate query)
      const experimentIdsWithMatchingMovies = await prisma.movieExperiment.findMany({
        where: {
          movie: {
            movieTitle: { contains: search, mode: 'insensitive' }
          }
        },
        select: { experimentId: true },
        distinct: ['experimentId']
      });
      
      const matchingExperimentIds = experimentIdsWithMatchingMovies.map(me => me.experimentId);

      // Step 2: Main search includes both direct fields and matching experiment IDs
      whereClause.OR = [
        { experimentNumber: { contains: search, mode: 'insensitive' } },
        { eventHost: { contains: search, mode: 'insensitive' } },
        { eventLocation: { contains: search, mode: 'insensitive' } },
        { eventNotes: { contains: search, mode: 'insensitive' } },
        { eventAttendees: { contains: search, mode: 'insensitive' } },
        // Include experiments that have matching movies (much faster than nested join)
        ...(matchingExperimentIds.length > 0 ? [{ id: { in: matchingExperimentIds } }] : [])
      ];
    }
    
    // Year filter
    if (year) {
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);
      whereClause.eventDate = {
        gte: startOfYear,
        lte: endOfYear
      };
    }
    
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

    // Return experiments without expensive encore calculation for now
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

// GET /api/experiments/years - Get available years for filtering
router.get('/years', async (_req, res) => {
  try {
    const experiments = await prisma.experiment.findMany({
      select: {
        eventDate: true
      },
      orderBy: {
        eventDate: 'desc'
      }
    });

    // Extract years from dates and remove duplicates
    const years = Array.from(new Set(
      experiments
        .map(exp => exp.eventDate.getFullYear().toString())
        .filter(year => year && year.trim() !== '')
    )).sort((a, b) => parseInt(b) - parseInt(a));

    res.json(years);
  } catch (error) {
    console.error('Error fetching experiment years:', error);
    res.status(500).json({ error: 'Failed to fetch experiment years' });
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

    // Return experiment without expensive encore calculation
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
