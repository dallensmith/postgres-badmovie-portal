import express from 'express';
import { prisma } from '../index.js';

const router = express.Router();

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (_req, res) => {
  try {
    // Get basic counts
    const [movieCount, experimentCount] = await Promise.all([
      prisma.movie.count(),
      prisma.experiment.count()
    ]);

    // Get unique people count (approximate from JSON arrays)
    const moviesWithActors = await prisma.movie.findMany({
      where: { 
        movieActors: { 
          not: { equals: null }
        }
      },
      select: { movieActors: true }
    });

    const uniqueActors = new Set<string>();
    moviesWithActors.forEach(movie => {
      if (Array.isArray(movie.movieActors)) {
        movie.movieActors.forEach((actor) => {
          if (typeof actor === 'string') {
            uniqueActors.add(actor);
          }
        });
      }
    });

    // Get average TMDB rating
    const moviesWithRatings = await prisma.movie.findMany({
      where: { 
        movieTmdbRating: { 
          not: { equals: null }
        }
      },
      select: { movieTmdbRating: true }
    });

    let avgRating = 0;
    if (moviesWithRatings.length > 0) {
      const validRatings = moviesWithRatings
        .map(m => parseFloat(m.movieTmdbRating || '0'))
        .filter(r => !isNaN(r) && r > 0);
      
      if (validRatings.length > 0) {
        avgRating = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
      }
    }

    // Get recent activity
    const recentMovies = await prisma.movie.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        movieTitle: true,
        movieYear: true,
        moviePoster: true,
        createdAt: true
      }
    });

    // Get recent experiments with their movies
    const rawRecentExperiments = await prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        experimentNumber: true,
        eventDate: true,
        eventHost: true,
        eventLocation: true,
        eventImage: true,
        createdAt: true,
        movieExperiments: {
          select: {
            movie: {
              select: {
                id: true,
                movieTitle: true,
                movieYear: true,
                moviePoster: true
              }
            }
          }
        }
      }
    });

    // Transform experiments to match frontend expectations
    const recentExperiments = rawRecentExperiments.map(experiment => ({
      id: experiment.id,
      experimentNumber: experiment.experimentNumber,
      eventDate: experiment.eventDate,
      eventImage: experiment.eventImage,
      createdAt: experiment.createdAt,
      experimentMovies: experiment.movieExperiments.map(me => me.movie.movieTitle)
    }));

    res.json({
      stats: {
        totalMovies: movieCount,
        totalExperiments: experimentCount,
        totalPeople: uniqueActors.size,
        averageRating: Number(avgRating.toFixed(1))
      },
      recentActivity: {
        recentMovies,
        recentExperiments
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
