import express from 'express';
import { prisma } from '../index.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createMovieSchema = z.object({
  title: z.string().min(1).max(255),
  originalTitle: z.string().max(255).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  releaseDate: z.string().transform(str => new Date(str)).optional(),
  runtime: z.number().int().positive().optional(),
  tagline: z.string().optional(),
  overview: z.string().optional(),
  contentRating: z.string().max(10).optional(),
  budget: z.number().optional(),
  boxOffice: z.number().optional(),
  revenue: z.number().optional(),
  tmdbId: z.number().int().optional(),
  imdbId: z.string().max(20).optional(),
});

const updateMovieSchema = createMovieSchema.partial();

// GET /api/movies - List all movies with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const genre = req.query.genre as string;
    const year = req.query.year as string;
    
    const skip = (page - 1) * limit;
    
    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { originalTitle: { contains: search, mode: 'insensitive' } },
        { overview: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (year) {
      where.year = parseInt(year);
    }
    
    if (genre) {
      where.genres = {
        some: {
          genre: {
            name: { equals: genre, mode: 'insensitive' }
          }
        }
      };
    }
    
    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        skip,
        take: limit,
        include: {
          genres: {
            include: { genre: true }
          },
          cast: {
            include: { person: true },
            orderBy: { castOrder: 'asc' }
          },
          crew: {
            include: { person: true },
            where: { job: 'Director' }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.movie.count({ where })
    ]);
    
    res.json({
      movies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// GET /api/movies/:id - Get single movie with full details
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        genres: { include: { genre: true } },
        cast: { 
          include: { person: true },
          orderBy: { castOrder: 'asc' }
        },
        crew: { 
          include: { person: true },
          orderBy: { creditOrder: 'asc' }
        },
        studios: { include: { studio: true } },
        countries: { include: { country: true } },
        languages: { include: { language: true } },
        experiments: { 
          include: { experiment: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    res.json(movie);
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

// POST /api/movies - Create new movie
router.post('/', async (req, res) => {
  try {
    const validatedData = createMovieSchema.parse(req.body);
    
    const movie = await prisma.movie.create({
      data: {
        ...validatedData,
        slug: validatedData.title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      },
      include: {
        genres: { include: { genre: true } },
        cast: { include: { person: true } },
        crew: { include: { person: true } }
      }
    });
    
    res.status(201).json(movie);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating movie:', error);
    res.status(500).json({ error: 'Failed to create movie' });
  }
});

// PUT /api/movies/:id - Update movie
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = updateMovieSchema.parse(req.body);
    
    const movie = await prisma.movie.update({
      where: { id },
      data: validatedData,
      include: {
        genres: { include: { genre: true } },
        cast: { include: { person: true } },
        crew: { include: { person: true } }
      }
    });
    
    res.json(movie);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating movie:', error);
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// DELETE /api/movies/:id - Delete movie
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    await prisma.movie.delete({
      where: { id }
    });
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting movie:', error);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

// POST /api/movies/:id/cast - Add cast member to movie
router.post('/:id/cast', async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const { personId, characterName, castOrder } = req.body;
    
    const castMember = await prisma.movieCast.create({
      data: {
        movieId,
        personId: parseInt(personId),
        characterName,
        castOrder: castOrder ? parseInt(castOrder) : undefined
      },
      include: {
        person: true
      }
    });
    
    res.status(201).json(castMember);
  } catch (error) {
    console.error('Error adding cast member:', error);
    res.status(500).json({ error: 'Failed to add cast member' });
  }
});

// POST /api/movies/:id/crew - Add crew member to movie
router.post('/:id/crew', async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const { personId, job, department, creditOrder } = req.body;
    
    const crewMember = await prisma.movieCrew.create({
      data: {
        movieId,
        personId: parseInt(personId),
        job,
        department,
        creditOrder: creditOrder ? parseInt(creditOrder) : undefined
      },
      include: {
        person: true
      }
    });
    
    res.status(201).json(crewMember);
  } catch (error) {
    console.error('Error adding crew member:', error);
    res.status(500).json({ error: 'Failed to add crew member' });
  }
});

export default router;
