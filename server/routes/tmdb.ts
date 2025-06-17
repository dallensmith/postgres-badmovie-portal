import express from 'express';
import { omdbService, EnrichedMovieData } from '../services/omdbService.js';

const router = express.Router();

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.warn('⚠️ TMDB_API_KEY not set in environment variables');
}

// Helper function to make TMDb API requests
async function tmdbRequest(endpoint: string) {
  if (!TMDB_API_KEY) {
    throw new Error('TMDb API key not configured');
  }

  const url = `${TMDB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`TMDb API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Search movies by title
router.get('/search/movie', async (req, res) => {
  try {
    const { query, page = 1 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const data = await tmdbRequest(`/search/movie?query=${encodeURIComponent(query as string)}&page=${page}`);
    
    // Transform TMDb results to our format
    const movies = data.results.map((movie: any) => ({
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : null,
      releaseDate: movie.release_date,
      overview: movie.overview,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
      rating: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
      adult: movie.adult,
      originalLanguage: movie.original_language
    }));

    res.json({
      results: movies,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    });
    
  } catch (error) {
    console.error('TMDb search error:', error);
    res.status(500).json({ 
      error: 'Failed to search movies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get detailed movie information by TMDb ID
router.get('/movie/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get basic movie details
    const movie = await tmdbRequest(`/movie/${id}`);
    
    // Get credits (cast and crew)
    const credits = await tmdbRequest(`/movie/${id}/credits`);
    
    // Get videos (trailers)
    const videos = await tmdbRequest(`/movie/${id}/videos`);
    
    // Transform to our format
    const transformedMovie = {
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : null,
      releaseDate: movie.release_date,
      runtime: movie.runtime,
      overview: movie.overview,
      tagline: movie.tagline,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      backdrop: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null,
      budget: movie.budget ? `$${movie.budget.toLocaleString()}` : null,
      boxOffice: movie.revenue ? `$${movie.revenue.toLocaleString()}` : null,
      rating: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity,
      adult: movie.adult,
      originalLanguage: movie.original_language,
      status: movie.status,
      
      // External URLs
      tmdbUrl: `https://www.themoviedb.org/movie/${movie.id}`,
      imdbId: movie.imdb_id,
      imdbUrl: movie.imdb_id ? `https://www.imdb.com/title/${movie.imdb_id}` : null,
      
      // Collections and companies
      genres: movie.genres?.map((g: any) => g.name) || [],
      productionCompanies: movie.production_companies?.map((c: any) => c.name) || [],
      productionCountries: movie.production_countries?.map((c: any) => c.name) || [],
      spokenLanguages: movie.spoken_languages?.map((l: any) => l.english_name) || [],
      
      // Cast and crew
      cast: credits.cast?.slice(0, 20).map((person: any) => person.name) || [],
      directors: credits.crew?.filter((person: any) => person.job === 'Director').map((person: any) => person.name) || [],
      writers: credits.crew?.filter((person: any) => ['Writer', 'Screenplay', 'Story'].includes(person.job)).map((person: any) => person.name) || [],
      
      // Trailer
      trailer: videos.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube')?.key 
        ? `https://www.youtube.com/watch?v=${videos.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube').key}`
        : null
    };

    // 🚀 DUAL-API ENRICHMENT: Get additional data from OMDb
    try {
      console.log(`🎬 Enriching movie "${transformedMovie.title}" with OMDb data...`);
      const omdbData: EnrichedMovieData = await omdbService.enrichMovieData(transformedMovie);
      
      // Merge OMDb data into the response (OMDb data takes priority for specific fields)
      const enrichedMovie = {
        ...transformedMovie,
        
        // Rotten Tomatoes data (OMDb exclusive)
        rottenTomatoesRating: omdbData.rottenTomatoesRating,
        rottenTomatoesUrl: omdbData.rottenTomatoesUrl,
        
        // Enhanced ratings (prefer OMDb for IMDb ratings as they're often more up-to-date)
        imdbRating: omdbData.imdbRating || transformedMovie.rating?.toString(),
        imdbVotes: omdbData.imdbVotes || transformedMovie.voteCount?.toString(),
        metacriticRating: omdbData.metacriticRating,
        
        // Content rating (OMDb has MPAA ratings that TMDb often lacks)
        contentRating: omdbData.contentRating,
        
        // Awards (OMDb exclusive)
        awards: omdbData.awards,
        
        // Enhanced metadata
        dvdRelease: omdbData.dvdRelease,
        websiteUrl: omdbData.websiteUrl,
        
        // Box office (use OMDb if available, fallback to TMDb)
        boxOfficeEnriched: omdbData.boxOfficeEnhanced || transformedMovie.boxOffice,
        
        // Enhanced plot (use OMDb if significantly different/better)
        plotEnhanced: omdbData.plotEnhanced !== transformedMovie.overview ? omdbData.plotEnhanced : null,
        
        // Enrichment metadata
        enrichmentSource: omdbData && Object.keys(omdbData).length > 0 ? 'tmdb+omdb' : 'tmdb-only',
        enrichmentFields: Object.keys(omdbData).filter(key => omdbData[key as keyof EnrichedMovieData])
      };

      console.log(`✅ Enriched with ${enrichedMovie.enrichmentFields.length} additional fields:`, enrichedMovie.enrichmentFields);
      res.json(enrichedMovie);
      
    } catch (enrichmentError) {
      console.warn('⚠️ OMDb enrichment failed, returning TMDb data only:', enrichmentError);
      res.json({
        ...transformedMovie,
        enrichmentSource: 'tmdb-only',
        enrichmentError: enrichmentError instanceof Error ? enrichmentError.message : 'Unknown enrichment error'
      });
    }
    
  } catch (error) {
    console.error('TMDb movie details error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch movie details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get popular movies (for discovery)
router.get('/popular', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    
    const data = await tmdbRequest(`/movie/popular?page=${page}`);
    
    const movies = data.results.map((movie: any) => ({
      tmdbId: movie.id,
      title: movie.title,
      originalTitle: movie.original_title,
      year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : null,
      releaseDate: movie.release_date,
      overview: movie.overview,
      poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      rating: movie.vote_average,
      voteCount: movie.vote_count,
      popularity: movie.popularity
    }));

    res.json({
      results: movies,
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results
    });
    
  } catch (error) {
    console.error('TMDb popular movies error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch popular movies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get configuration info (image base URLs, etc.)
router.get('/configuration', async (_req, res) => {
  try {
    const config = await tmdbRequest('/configuration');
    res.json(config);
  } catch (error) {
    console.error('TMDb configuration error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch TMDb configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// OMDb movie lookup by IMDb ID
router.get('/omdb/movie/:imdbId', async (req, res) => {
  try {
    const { imdbId } = req.params;
    
    console.log(`🎬 OMDb lookup for IMDb ID: ${imdbId}`);
    
    // Use OMDb service to get enriched data
    const enrichedData = await omdbService.getMovieByImdbId(imdbId);
    
    if (Object.keys(enrichedData).length === 0) {
      return res.status(404).json({ 
        error: 'Movie not found in OMDb',
        imdbId 
      });
    }

    console.log(`✅ OMDb data found with ${Object.keys(enrichedData).length} fields`);
    res.json(enrichedData);
    
  } catch (error) {
    console.error('OMDb lookup error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch movie from OMDb',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
