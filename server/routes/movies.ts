import express from 'express';
import { prisma } from '../index.js';

const router = express.Router();

// GET /api/movies - List movies with search, filters, and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      year = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for filtering
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { movieTitle: { contains: search as string, mode: 'insensitive' } },
        { movieOriginalTitle: { contains: search as string, mode: 'insensitive' } },
        { movieOverview: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Year filter
    if (year) {
      where.movieYear = year as string;
    }

    // Get total count for pagination
    const totalCount = await prisma.movie.count({ where });

    // Get movies with filters and pagination
    const movies = await prisma.movie.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
      include: {
        movieExperiments: {
          include: {
            experiment: true
          }
        }
      }
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      movies,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// GET /api/movies/years - Get available years for filtering
router.get('/years', async (_req, res) => {
  try {
    const years = await prisma.movie.findMany({
      where: {
        movieYear: {
          not: null
        }
      },
      select: {
        movieYear: true
      },
      distinct: ['movieYear'],
      orderBy: {
        movieYear: 'desc'
      }
    });

    const yearList = years
      .map(y => y.movieYear)
      .filter((y): y is string => y !== null && y.trim() !== '')
      .sort((a, b) => parseInt(b) - parseInt(a));

    res.json(yearList);
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: 'Failed to fetch years' });
  }
});

// GET /api/movies/stats - Get movie statistics
router.get('/stats', async (_req, res) => {
  try {
    const totalMovies = await prisma.movie.count();
    
    const moviesByYear = await prisma.movie.groupBy({
      by: ['movieYear'],
      _count: {
        id: true
      },
      where: {
        movieYear: {
          not: null
        }
      },
      orderBy: {
        movieYear: 'desc'
      },
      take: 10
    });

    // Calculate average TMDb rating manually since it's stored as string
    const moviesWithRatings = await prisma.movie.findMany({
      where: {
        movieTmdbRating: {
          not: null
        }
      },
      select: {
        movieTmdbRating: true
      }
    });

    let averageRating = 0;
    if (moviesWithRatings.length > 0) {
      const validRatings = moviesWithRatings
        .map(m => parseFloat(m.movieTmdbRating || '0'))
        .filter(r => !isNaN(r) && r > 0);
      
      if (validRatings.length > 0) {
        averageRating = validRatings.reduce((sum, rating) => sum + rating, 0) / validRatings.length;
      }
    }

    res.json({
      totalMovies,
      moviesByYear: moviesByYear.map(item => ({
        year: item.movieYear,
        count: item._count.id
      })),
      averageRating: Number(averageRating.toFixed(1))
    });
  } catch (error) {
    console.error('Error fetching movie stats:', error);
    res.status(500).json({ error: 'Failed to fetch movie stats' });
  }
});

// GET /api/movies/:id - Get a specific movie
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        movieExperiments: {
          include: {
            experiment: true
          }
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

// POST /api/movies - Create a new movie
router.post('/', async (req, res) => {
  try {
    const movieData = req.body;
    
    // Debug logging
    console.log('📝 Movie creation request received');
    console.log('Request body keys:', Object.keys(movieData));
    console.log('Movie title:', movieData.movieTitle);
    console.log('Movie year:', movieData.movieYear);
    
    // Handle date conversion for movieReleaseDate
    const processedData = { ...movieData };
    console.log('MovieReleaseDate received:', processedData.movieReleaseDate);
    
    // The frontend already converts dates to ISO format, so we just need to handle nulls
    if (!processedData.movieReleaseDate || processedData.movieReleaseDate === '') {
      processedData.movieReleaseDate = null;
      console.log('Set movieReleaseDate to null');
    } else {
      console.log('Using movieReleaseDate as provided:', processedData.movieReleaseDate);
    }
    
    console.log('Processed data ready for database insertion');
    
    // Create movie
    const movie = await prisma.movie.create({
      data: {
        ...processedData,
        syncStatus: 'pending'
      }
    });

    console.log('✅ Movie created successfully with ID:', movie.id);
    res.status(201).json(movie);
  } catch (error: any) {
    console.error('❌ Error creating movie:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    });
    res.status(500).json({ error: 'Failed to create movie' });
  }
});

// PUT /api/movies/:id - Update a movie
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const movieData = req.body;

    const movie = await prisma.movie.update({
      where: { id },
      data: {
        ...movieData,
        updatedAt: new Date()
      }
    });

    res.json(movie);
  } catch (error: any) {
    console.error('Error updating movie:', error);
    
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Movie not found' });
    }
    
    // Return more detailed error information
    res.status(500).json({ 
      error: 'Failed to update movie',
      details: error?.message || 'Unknown error',
      code: error?.code
    });
  }
});

// DELETE /api/movies/:id - Delete a movie
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.movie.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting movie:', error);
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

// POST /api/movies/batch-sync-tmdb - Sync all movies with TMDb data
router.post('/batch-sync-tmdb', async (_req, res) => {
  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

    if (!TMDB_API_KEY) {
      return res.status(500).json({ error: 'TMDb API key not configured' });
    }

    // Get all movies that have TMDb IDs
    const movies = await prisma.movie.findMany({
      where: {
        movieTmdbId: {
          not: null
        },
        NOT: {
          movieTmdbId: ''
        }
      },
      select: {
        id: true,
        movieTmdbId: true,
        movieTitle: true
      }
    });

    if (movies.length === 0) {
      return res.json({ 
        message: 'No movies with TMDb IDs found to sync',
        updated: 0,
        failed: 0,
        results: []
      });
    }

    interface SyncResult {
      id: number;
      title: string;
      status: 'success' | 'error';
      message: string;
    }

    const results: SyncResult[] = [];
    let updated = 0;
    let failed = 0;

    // Helper function for TMDb API requests
    const tmdbRequest = async (endpoint: string) => {
      const url = `${TMDB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`TMDb API error: ${response.status} ${response.statusText}`);
      }
      
      return response.json();
    };

    // Process movies in batches to avoid overwhelming the API
    const BATCH_SIZE = 5;
    const DELAY_MS = 500; // Delay between batches to respect rate limits

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (movie) => {
          try {
            // Get fresh data from TMDb
            const tmdbData = await tmdbRequest(`/movie/${movie.movieTmdbId}?append_to_response=credits`);

            // Transform TMDb data to our format
            const updateData: any = {
              movieTitle: tmdbData.title,
              movieOriginalTitle: tmdbData.original_title || '',
              movieYear: tmdbData.release_date ? new Date(tmdbData.release_date).getFullYear().toString() : '',
              movieReleaseDate: tmdbData.release_date ? new Date(tmdbData.release_date) : null,
              movieRuntime: tmdbData.runtime ? tmdbData.runtime : null,
              movieTagline: tmdbData.tagline || '',
              movieOverview: tmdbData.overview || '',
              movieBudget: tmdbData.budget ? tmdbData.budget.toString() : '',
              movieBoxOffice: tmdbData.revenue ? tmdbData.revenue.toString() : '',
              moviePoster: tmdbData.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : '',
              movieBackdrop: tmdbData.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdbData.backdrop_path}` : '',
              movieTmdbUrl: `https://www.themoviedb.org/movie/${tmdbData.id}`,
              movieTmdbRating: tmdbData.vote_average ? tmdbData.vote_average.toString() : '',
              movieTmdbVotes: tmdbData.vote_count ? tmdbData.vote_count.toString() : '',
              movieImdbId: tmdbData.imdb_id || '',
              movieImdbUrl: tmdbData.imdb_id ? `https://www.imdb.com/title/${tmdbData.imdb_id}` : '',
              movieGenres: tmdbData.genres ? tmdbData.genres.map((g: any) => g.name) : [],
              movieCountries: tmdbData.production_countries ? tmdbData.production_countries.map((c: any) => c.name) : [],
              movieLanguages: tmdbData.spoken_languages ? tmdbData.spoken_languages.map((l: any) => l.english_name) : [],
              movieStudios: tmdbData.production_companies ? tmdbData.production_companies.map((c: any) => c.name) : [],
              lastTmdbFetch: new Date().toISOString()
            };

            // Extract cast and crew
            if (tmdbData.credits) {
              if (tmdbData.credits.cast) {
                updateData.movieActors = tmdbData.credits.cast
                  .slice(0, 10) // Top 10 actors
                  .map((actor: any) => actor.name);
              }

              if (tmdbData.credits.crew) {
                const directors = tmdbData.credits.crew
                  .filter((member: any) => member.job === 'Director')
                  .map((director: any) => director.name);
                updateData.movieDirectors = directors;

                const writers = tmdbData.credits.crew
                  .filter((member: any) => 
                    member.job === 'Writer' || 
                    member.job === 'Screenplay' || 
                    member.job === 'Story'
                  )
                  .map((writer: any) => writer.name);
                updateData.movieWriters = [...new Set(writers)]; // Remove duplicates
              }
            }

            // Update the movie in database
            await prisma.movie.update({
              where: { id: movie.id },
              data: updateData
            });

            results.push({
              id: movie.id,
              title: movie.movieTitle || 'Unknown Title',
              status: 'success',
              message: 'Successfully updated from TMDb'
            });
            updated++;

          } catch (error) {
            console.error(`Error syncing movie ${movie.id} (${movie.movieTitle}):`, error);
            results.push({
              id: movie.id,
              title: movie.movieTitle || 'Unknown Title',
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            });
            failed++;
          }
        })
      );

      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < movies.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    res.json({
      message: `Batch sync completed. Updated: ${updated}, Failed: ${failed}`,
      updated,
      failed,
      total: movies.length,
      results
    });

  } catch (error: any) {
    console.error('Batch sync error:', error);
    res.status(500).json({ 
      error: 'Failed to perform batch sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/movies/batch-omdb-sync - Fill missing movie data with OMDb
router.post('/batch-omdb-sync', async (_req, res) => {
  try {
    // Get all movies that have IMDb IDs
    const movies = await prisma.movie.findMany({
      where: {
        movieImdbId: {
          not: null
        },
        NOT: {
          movieImdbId: ''
        }
      },
      select: {
        id: true,
        movieImdbId: true,
        movieTitle: true,
        // Select current values to check what's missing
        movieOriginalTitle: true,
        movieYear: true,
        movieReleaseDate: true,
        movieRuntime: true,
        movieTagline: true,
        movieOverview: true,
        movieContentRating: true,
        movieBudget: true,
        movieBoxOffice: true,
        moviePoster: true,
        movieBackdrop: true,
        movieActors: true,
        movieDirectors: true,
        movieWriters: true,
        movieGenres: true,
        movieCountries: true,
        movieLanguages: true,
        movieStudios: true,
        rottenTomatoesRating: true,
        rottenTomatoesUrl: true,
        imdbRating: true,
        imdbVotes: true,
        metacriticRating: true,
        awards: true,
        dvdRelease: true,
        websiteUrl: true,
        boxOfficeEnhanced: true,
        plotEnhanced: true
      }
    });

    if (movies.length === 0) {
      return res.json({ 
        message: 'No movies with IMDb IDs found to sync',
        updated: 0,
        failed: 0,
        skipped: 0,
        results: []
      });
    }

    interface SyncResult {
      id: number;
      title: string;
      status: 'success' | 'error' | 'skipped';
      message: string;
    }

    const results: SyncResult[] = [];
    let updated = 0;
    let failed = 0;
    let skipped = 0;

    // Helper function to check if a field is missing/empty
    const isEmpty = (value: any): boolean => {
      return value === null || value === undefined || value === '' || 
             (Array.isArray(value) && value.length === 0);
    };

    // Helper function to get OMDb data
    const getOMDbData = async (imdbId: string) => {
      const response = await fetch(`http://localhost:3007/api/tmdb/omdb/movie/${imdbId}`);
      if (!response.ok) {
        throw new Error(`OMDb API error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    };

    // Process movies in batches to avoid overwhelming the API
    const BATCH_SIZE = 3; // Smaller batches for OMDb to respect rate limits
    const DELAY_MS = 1000; // Longer delay between batches

    for (let i = 0; i < movies.length; i += BATCH_SIZE) {
      const batch = movies.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (movie) => {
          try {
            // Get OMDb data
            const omdbData = await getOMDbData(movie.movieImdbId!);

            // Build update object with only missing fields
            const updateData: any = {};
            let hasUpdates = false;

            // Only fill missing basic info
            if (isEmpty(movie.movieTitle) && omdbData.title) {
              updateData.movieTitle = omdbData.title;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieYear) && omdbData.year) {
              updateData.movieYear = omdbData.year;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieReleaseDate) && omdbData.releaseDate) {
              updateData.movieReleaseDate = new Date(omdbData.releaseDate);
              hasUpdates = true;
            }
            if (isEmpty(movie.movieRuntime) && omdbData.runtime) {
              updateData.movieRuntime = omdbData.runtime;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieOverview) && omdbData.plot) {
              updateData.movieOverview = omdbData.plot;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieContentRating) && omdbData.contentRating) {
              updateData.movieContentRating = omdbData.contentRating;
              hasUpdates = true;
            }
            if (isEmpty(movie.moviePoster) && omdbData.poster) {
              updateData.moviePoster = omdbData.poster;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieBoxOffice) && omdbData.boxOffice) {
              updateData.movieBoxOffice = omdbData.boxOffice;
              hasUpdates = true;
            }

            // Only fill missing cast/crew
            if (isEmpty(movie.movieActors) && omdbData.actors) {
              updateData.movieActors = omdbData.actors;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieDirectors) && omdbData.directors) {
              updateData.movieDirectors = omdbData.directors;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieWriters) && omdbData.writers) {
              updateData.movieWriters = omdbData.writers;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieGenres) && omdbData.genres) {
              updateData.movieGenres = omdbData.genres;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieCountries) && omdbData.countries) {
              updateData.movieCountries = omdbData.countries;
              hasUpdates = true;
            }
            if (isEmpty(movie.movieLanguages) && omdbData.languages) {
              updateData.movieLanguages = omdbData.languages;
              hasUpdates = true;
            }

            // Only fill missing OMDb-specific fields
            if (isEmpty(movie.rottenTomatoesRating) && omdbData.rottenTomatoesRating) {
              updateData.rottenTomatoesRating = omdbData.rottenTomatoesRating;
              hasUpdates = true;
            }
            if (isEmpty(movie.rottenTomatoesUrl) && omdbData.rottenTomatoesUrl) {
              updateData.rottenTomatoesUrl = omdbData.rottenTomatoesUrl;
              hasUpdates = true;
            }
            if (isEmpty(movie.imdbRating) && omdbData.imdbRating) {
              updateData.imdbRating = omdbData.imdbRating;
              hasUpdates = true;
            }
            if (isEmpty(movie.imdbVotes) && omdbData.imdbVotes) {
              updateData.imdbVotes = omdbData.imdbVotes;
              hasUpdates = true;
            }
            if (isEmpty(movie.metacriticRating) && omdbData.metacriticRating) {
              updateData.metacriticRating = omdbData.metacriticRating;
              hasUpdates = true;
            }
            if (isEmpty(movie.awards) && omdbData.awards) {
              updateData.awards = omdbData.awards;
              hasUpdates = true;
            }
            if (isEmpty(movie.dvdRelease) && omdbData.dvdRelease) {
              updateData.dvdRelease = omdbData.dvdRelease;
              hasUpdates = true;
            }
            if (isEmpty(movie.websiteUrl) && omdbData.websiteUrl) {
              updateData.websiteUrl = omdbData.websiteUrl;
              hasUpdates = true;
            }
            if (isEmpty(movie.boxOfficeEnhanced) && omdbData.boxOfficeEnhanced) {
              updateData.boxOfficeEnhanced = omdbData.boxOfficeEnhanced;
              hasUpdates = true;
            }
            if (isEmpty(movie.plotEnhanced) && omdbData.plotEnhanced) {
              updateData.plotEnhanced = omdbData.plotEnhanced;
              hasUpdates = true;
            }

            if (!hasUpdates) {
              results.push({
                id: movie.id,
                title: movie.movieTitle || 'Unknown Title',
                status: 'skipped',
                message: 'No missing fields to fill'
              });
              skipped++;
              return;
            }

            // Update the movie in database with only missing fields
            await prisma.movie.update({
              where: { id: movie.id },
              data: updateData
            });

            const updatedFields = Object.keys(updateData);
            results.push({
              id: movie.id,
              title: movie.movieTitle || 'Unknown Title',
              status: 'success',
              message: `Filled ${updatedFields.length} missing fields: ${updatedFields.join(', ')}`
            });
            updated++;

          } catch (error) {
            console.error(`Error syncing movie ${movie.id} (${movie.movieTitle}):`, error);
            results.push({
              id: movie.id,
              title: movie.movieTitle || 'Unknown Title',
              status: 'error',
              message: error instanceof Error ? error.message : 'Unknown error'
            });
            failed++;
          }
        })
      );

      // Add delay between batches (except for the last batch)
      if (i + BATCH_SIZE < movies.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    res.json({
      message: `Batch OMDb sync completed. Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`,
      updated,
      failed,
      skipped,
      total: movies.length,
      results
    });

  } catch (error: any) {
    console.error('Batch OMDb sync error:', error);
    res.status(500).json({ 
      error: 'Failed to perform batch OMDb sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
