import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance } from 'axios';

const prisma = new PrismaClient();

interface WordPressSyncConfig {
  baseUrl: string;
  username: string;
  applicationPassword: string;
}

interface PodsField {
  name: string;
  type: string;
  required?: boolean;
  repeatable?: boolean;
  maxLength?: number;
  format?: string;
}

interface PodsMeta {
  name: string;
  restBase: string;
  fields: PodsField[];
  bidirectionalFields: { [key: string]: string };
}

/**
 * WordPress Pods Sync Service
 * Handles bidirectional synchronization between our PostgreSQL database and WordPress Pods
 */
export class WordPressPodsSyncService {
  protected client: AxiosInstance;
  protected podsMeta: Map<string, PodsMeta> = new Map();

  constructor(config: WordPressSyncConfig) {
    this.client = axios.create({
      baseURL: `${config.baseUrl}/wp-json/wp/v2`,
      auth: {
        username: config.username,
        password: config.applicationPassword,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.initializePodsMeta();
  }

  /**
   * Initialize Pods metadata based on the pods.json structure
   */
  private initializePodsMeta() {
    // MOVIE Pod metadata - EXACT mapping from pods.json
    this.podsMeta.set('movie', {
      name: 'movie',
      restBase: 'movies',
      fields: [
        { name: 'movie_title', type: 'text' },
        { name: 'movie_original_title', type: 'text' },
        { name: 'movie_year', type: 'text', maxLength: 255 },
        { name: 'movie_release_date', type: 'date', format: 'Y-m-d' },
        { name: 'movie_runtime', type: 'number' },
        { name: 'movie_tagline', type: 'text' },
        { name: 'movie_overview', type: 'paragraph' },
        { name: 'movie_content_rating', type: 'text' },
        { name: 'movie_budget', type: 'text' },
        { name: 'movie_box_office', type: 'text' },
        { name: 'movie_poster', type: 'file' },
        { name: 'movie_backdrop', type: 'file' },
        { name: 'movie_trailer', type: 'text' },
        { name: 'movie_tmdb_id', type: 'text' },
        { name: 'movie_tmdb_url', type: 'website' },
        { name: 'movie_tmdb_rating', type: 'text' },
        { name: 'movie_tmdb_votes', type: 'text' },
        { name: 'movie_imdb_id', type: 'text' },
        { name: 'movie_imdb_url', type: 'website' },
        { name: 'movie_characters', type: 'text', repeatable: true },
        { name: 'movie_amazon_link', type: 'website', maxLength: 555 },
        { name: 'movie_actors', type: 'pick' },
        { name: 'movie_directors', type: 'pick' },
        { name: 'movie_writers', type: 'pick' },
        { name: 'movie_genres', type: 'pick' },
        { name: 'movie_countries', type: 'pick' },
        { name: 'movie_languages', type: 'pick' },
        { name: 'movie_studios', type: 'pick' },
        { name: 'movie_experiments', type: 'pick' },
      ],
      bidirectionalFields: {
        'movie_actors': 'related_movies_actor',
        'movie_directors': 'related_movies_director', 
        'movie_writers': 'related_movies_writer',
        'movie_genres': 'related_movies_genre',
        'movie_countries': 'related_movies_country',
        'movie_languages': 'related_movies_language',
        'movie_studios': 'related_movies_studio',
        'movie_experiments': 'experiment_movies',
      },
    });

    // ACTOR Pod metadata
    this.podsMeta.set('actor', {
      name: 'actor',
      restBase: 'actors',
      fields: [
        { name: 'actor_name', type: 'text', required: true },
        { name: 'profile_image', type: 'file' },
        { name: 'actor_biography', type: 'wysiwyg' },
        { name: 'actor_birthday', type: 'date', format: 'mdy' },
        { name: 'actor_deathday', type: 'date', format: 'mdy' },
        { name: 'actor_place_of_birth', type: 'text', maxLength: 255 },
        { name: 'actor_movie_count', type: 'text' },
        { name: 'actor_popularity', type: 'text' },
        { name: 'actor_known_for_department', type: 'text' },
        { name: 'actor_imdb_id', type: 'text' },
        { name: 'actor_imdb_url', type: 'website' },
        { name: 'actor_tmdb_url', type: 'website' },
        { name: 'actor_instagram_id', type: 'text' },
        { name: 'actor_twitter_id_', type: 'text' }, // Note the underscore!
        { name: 'actor_facebook_id', type: 'text' },
        { name: 'related_movies_actor', type: 'pick' },
      ],
      bidirectionalFields: {
        'related_movies_actor': 'movie_actors',
      },
    });

    // DIRECTOR Pod metadata
    this.podsMeta.set('director', {
      name: 'director',
      restBase: 'directors',
      fields: [
        { name: 'director_name', type: 'text', required: true },
        { name: 'director_biography', type: 'wysiwyg' },
        { name: 'director_movie_count', type: 'text' },
        { name: 'director_birthday', type: 'date', format: 'mdy' },
        { name: 'director_deathday', type: 'date', format: 'mdy' },
        { name: 'director_place_of_birth', type: 'text', maxLength: 255 },
        { name: 'director_popularity', type: 'text' },
        { name: 'director_profile_image', type: 'file' },
        { name: 'director_imdb_id', type: 'text' },
        { name: 'director_imdb_url', type: 'website' },
        { name: 'director_tmdb_url', type: 'website' },
        { name: 'director_instagram_id', type: 'text' },
        { name: 'director_twitter_id', type: 'text' },
        { name: 'director_facebook_id', type: 'text' },
        { name: 'related_movies_director', type: 'pick' },
      ],
      bidirectionalFields: {
        'related_movies_director': 'movie_directors',
      },
    });

    // EXPERIMENT Pod metadata
    this.podsMeta.set('experiment', {
      name: 'experiment',
      restBase: 'experiments',
      fields: [
        { name: 'experiment_number', type: 'text', maxLength: 255 },
        { name: 'event_date', type: 'date', format: 'fjsy', required: true },
        { name: 'event_location', type: 'pick', repeatable: true, required: true },
        { name: 'event_host', type: 'pick' },
        { name: 'experiment_image', type: 'file' },
        { name: 'experiment_notes', type: 'wysiwyg' },
        { name: 'experiment_movies', type: 'pick' },
      ],
      bidirectionalFields: {
        'experiment_movies': 'movie_experiments',
      },
    });

    // Add other pods (genre, country, language, studio, writer)...
  }

  /**
   * Sync a movie from our database to WordPress Pods
   */
  async syncMovieToWordPress(movieId: number): Promise<void> {
    try {
      const movie = await prisma.movie.findUnique({
        where: { id: movieId },
      });

      if (!movie) {
        throw new Error(`Movie with ID ${movieId} not found`);
      }

      // Transform our data to Pods format
      const podsData = this.transformMovieToPodsFormat(movie);

      let response;
      if (movie.wordpressId) {
        // Update existing WordPress post
        response = await this.client.put(`/movies/${movie.wordpressId}`, podsData);
      } else {
        // Create new WordPress post
        response = await this.client.post('/movies', podsData);
        
        // Update our record with the WordPress ID
        await prisma.movie.update({
          where: { id: movieId },
          data: { 
            wordpressId: response.data.id,
            syncStatus: 'synced',
            lastSynced: new Date(),
          },
        });
      }

      // Log successful sync
      await this.logSyncOperation('movie', movieId, response.data.id, 'to_wordpress', 'success');

    } catch (error) {
      await this.logSyncOperation('movie', movieId, null, 'to_wordpress', 'failed', 
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Sync a movie from WordPress Pods to our database
   */
  async syncMovieFromWordPress(wordpressId: number): Promise<void> {
    try {
      // Fetch from WordPress
      const response = await this.client.get(`/movies/${wordpressId}`);
      const wordpressData = response.data;

      // Transform Pods data to our format
      const movieData = this.transformPodsToMovieFormat(wordpressData);

      // Check if we already have this movie
      const existingMovie = await prisma.movie.findUnique({
        where: { wordpressId },
      });

      let movieId;
      if (existingMovie) {
        // Update existing record
        await prisma.movie.update({
          where: { wordpressId },
          data: {
            ...movieData,
            syncStatus: 'synced',
            lastSynced: new Date(),
            podsData: wordpressData, // Store original Pods data
          },
        });
        movieId = existingMovie.id;
      } else {
        // Create new record
        const newMovie = await prisma.movie.create({
          data: {
            ...movieData,
            wordpressId,
            syncStatus: 'synced',
            lastSynced: new Date(),
            podsData: wordpressData, // Store original Pods data
          },
        });
        movieId = newMovie.id;
      }

      // Log successful sync
      await this.logSyncOperation('movie', movieId, wordpressId, 'from_wordpress', 'success');

    } catch (error) {
      await this.logSyncOperation('movie', null, wordpressId, 'from_wordpress', 'failed',
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Transform our Movie model to WordPress Pods format
   */
  private transformMovieToPodsFormat(movie: any): any {
    return {
      title: movie.movieTitle,
      slug: movie.slug,
      status: 'publish',
      meta: {
        movie_title: movie.movieTitle,
        movie_original_title: movie.movieOriginalTitle,
        movie_year: movie.movieYear,
        movie_release_date: movie.movieReleaseDate?.toISOString().split('T')[0],
        movie_runtime: movie.movieRuntime,
        movie_tagline: movie.movieTagline,
        movie_overview: movie.movieOverview,
        movie_content_rating: movie.movieContentRating,
        movie_budget: movie.movieBudget,
        movie_box_office: movie.movieBoxOffice,
        movie_poster: movie.moviePoster,
        movie_backdrop: movie.movieBackdrop,
        movie_trailer: movie.movieTrailer,
        movie_tmdb_id: movie.movieTmdbId,
        movie_tmdb_url: movie.movieTmdbUrl,
        movie_tmdb_rating: movie.movieTmdbRating,
        movie_tmdb_votes: movie.movieTmdbVotes,
        movie_imdb_id: movie.movieImdbId,
        movie_imdb_url: movie.movieImdbUrl,
        movie_characters: movie.movieCharacters,
        movie_amazon_link: movie.movieAmazonLink,
        movie_actors: movie.movieActors,
        movie_directors: movie.movieDirectors,
        movie_writers: movie.movieWriters,
        movie_genres: movie.movieGenres,
        movie_countries: movie.movieCountries,
        movie_languages: movie.movieLanguages,
        movie_studios: movie.movieStudios,
        movie_experiments: movie.movieExperiments,
      },
    };
  }

  /**
   * Transform WordPress Pods data to our Movie model format
   */
  private transformPodsToMovieFormat(podsData: any): any {
    const meta = podsData.meta || {};
    
    return {
      movieTitle: meta.movie_title || podsData.title?.rendered,
      movieOriginalTitle: meta.movie_original_title,
      slug: podsData.slug,
      movieYear: meta.movie_year,
      movieReleaseDate: meta.movie_release_date ? new Date(meta.movie_release_date) : null,
      movieRuntime: meta.movie_runtime ? parseInt(meta.movie_runtime) : null,
      movieTagline: meta.movie_tagline,
      movieOverview: meta.movie_overview,
      movieContentRating: meta.movie_content_rating,
      movieBudget: meta.movie_budget,
      movieBoxOffice: meta.movie_box_office,
      moviePoster: meta.movie_poster,
      movieBackdrop: meta.movie_backdrop,
      movieTrailer: meta.movie_trailer,
      movieTmdbId: meta.movie_tmdb_id,
      movieTmdbUrl: meta.movie_tmdb_url,
      movieTmdbRating: meta.movie_tmdb_rating,
      movieTmdbVotes: meta.movie_tmdb_votes,
      movieImdbId: meta.movie_imdb_id,
      movieImdbUrl: meta.movie_imdb_url,
      movieCharacters: meta.movie_characters,
      movieAmazonLink: meta.movie_amazon_link,
      movieActors: meta.movie_actors,
      movieDirectors: meta.movie_directors,
      movieWriters: meta.movie_writers,
      movieGenres: meta.movie_genres,
      movieCountries: meta.movie_countries,
      movieLanguages: meta.movie_languages,
      movieStudios: meta.movie_studios,
      movieExperiments: meta.movie_experiments,
    };
  }

  /**
   * Bidirectional sync - ensures both sides are updated
   */
  async bidirectionalSyncMovie(movieId: number): Promise<void> {
    try {
      // First sync to WordPress
      await this.syncMovieToWordPress(movieId);
      
      // Then sync back to ensure bidirectional relationships are updated
      const movie = await prisma.movie.findUnique({
        where: { id: movieId },
      });
      
      if (movie?.wordpressId) {
        await this.syncMovieFromWordPress(movie.wordpressId);
      }

      await this.logSyncOperation('movie', movieId, movie?.wordpressId || null, 'bidirectional', 'success');
    } catch (error) {
      await this.logSyncOperation('movie', movieId, null, 'bidirectional', 'failed',
        error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Log sync operations for debugging and monitoring
   */
  protected async logSyncOperation(
    entityType: string,
    entityId: number | null,
    wordpressId: number | null,
    direction: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await prisma.syncLog.create({
      data: {
        operation: 'sync',
        entityType,
        entityId,
        wordpressId,
        direction,
        status,
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Bulk sync all movies from WordPress
   */
  async bulkSyncMoviesFromWordPress(): Promise<void> {
    try {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get(`/movies?page=${page}&per_page=100`);
        const movies = response.data;

        if (movies.length === 0) {
          hasMore = false;
          break;
        }

        for (const movie of movies) {
          try {
            await this.syncMovieFromWordPress(movie.id);
            console.log(`Synced movie ${movie.id}: ${movie.title?.rendered}`);
          } catch (error) {
            console.error(`Failed to sync movie ${movie.id}:`, error);
          }
        }

        page++;
      }
    } catch (error) {
      console.error('Bulk sync failed:', error);
      throw error;
    }
  }

  /**
   * Health check - verify WordPress connection and Pods availability
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Test basic WordPress API connection
      const wpResponse = await this.client.get('/');
      
      // Test Pods endpoints
      const podsTests = await Promise.allSettled([
        this.client.get('/movies?per_page=1'),
        this.client.get('/actors?per_page=1'),
        this.client.get('/experiments?per_page=1'),
      ]);

      return {
        status: 'healthy',
        details: {
          wordpress: wpResponse.status === 200,
          pods: {
            movies: podsTests[0].status === 'fulfilled',
            actors: podsTests[1].status === 'fulfilled', 
            experiments: podsTests[2].status === 'fulfilled',
          },
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default WordPressPodsSyncService;
