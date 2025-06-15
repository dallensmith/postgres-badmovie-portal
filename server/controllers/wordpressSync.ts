import { Request, Response } from 'express';
import { WordPressPodsSyncService } from '../services/wordpressSync';

/**
 * WordPress/Pods Sync API Controller
 * Handles all sync operations between our PostgreSQL database and WordPress Pods
 */
export class WordPressSyncController {
  private syncService: WordPressPodsSyncService;

  constructor() {
    // Initialize sync service with configuration
    this.syncService = new WordPressPodsSyncService({
      baseUrl: process.env.WORDPRESS_API_URL || 'https://your-wordpress-site.com',
      username: process.env.WORDPRESS_API_USERNAME || 'admin',
      applicationPassword: process.env.WORDPRESS_API_PASSWORD || 'your-app-password',
    });
  }

  /**
   * Health check for WordPress/Pods connection
   * GET /api/wordpress/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.syncService.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  }

  /**
   * Sync a specific movie to WordPress
   * POST /api/wordpress/sync/movie/:id
   */
  async syncMovieToWordPress(req: Request, res: Response): Promise<void> {
    try {
      const movieId = parseInt(req.params.id);
      await this.syncService.syncMovieToWordPress(movieId);
      
      res.json({
        success: true,
        message: `Movie ${movieId} synced to WordPress successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  }

  /**
   * Sync a specific movie from WordPress
   * POST /api/wordpress/sync/movie/from/:wordpressId
   */
  async syncMovieFromWordPress(req: Request, res: Response): Promise<void> {
    try {
      const wordpressId = parseInt(req.params.wordpressId);
      await this.syncService.syncMovieFromWordPress(wordpressId);
      
      res.json({
        success: true,
        message: `Movie ${wordpressId} synced from WordPress successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  }

  /**
   * Bidirectional sync for a movie
   * POST /api/wordpress/sync/movie/:id/bidirectional
   */
  async bidirectionalSyncMovie(req: Request, res: Response): Promise<void> {
    try {
      const movieId = parseInt(req.params.id);
      await this.syncService.bidirectionalSyncMovie(movieId);
      
      res.json({
        success: true,
        message: `Movie ${movieId} bidirectionally synced successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Bidirectional sync failed',
      });
    }
  }

  /**
   * Bulk sync all movies from WordPress
   * POST /api/wordpress/sync/movies/bulk
   */
  async bulkSyncMoviesFromWordPress(req: Request, res: Response): Promise<void> {
    try {
      await this.syncService.bulkSyncMoviesFromWordPress();
      
      res.json({
        success: true,
        message: 'All movies synced from WordPress successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Bulk sync failed',
      });
    }
  }

  /**
   * Get sync logs with filtering
   * GET /api/wordpress/sync/logs
   */
  async getSyncLogs(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, status, limit = 50 } = req.query;
      
      // Note: This would need to be implemented with actual Prisma queries
      // when the database is set up
      const logs = []; // await prisma.syncLog.findMany({...})
      
      res.json({
        success: true,
        logs,
        total: logs.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch sync logs',
      });
    }
  }

  /**
   * Manually trigger sync for any entity type
   * POST /api/wordpress/sync/:entityType/:id
   */
  async manualSync(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, id } = req.params;
      const { direction = 'to_wordpress' } = req.body;
      
      // Route to appropriate sync method based on entity type
      switch (entityType) {
        case 'movie':
          if (direction === 'to_wordpress') {
            await this.syncService.syncMovieToWordPress(parseInt(id));
          } else {
            await this.syncService.syncMovieFromWordPress(parseInt(id));
          }
          break;
        
        // Add other entity types as we implement them
        case 'actor':
        case 'director':
        case 'experiment':
          throw new Error(`Sync for ${entityType} not yet implemented`);
        
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      res.json({
        success: true,
        message: `${entityType} ${id} synced ${direction} successfully`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Manual sync failed',
      });
    }
  }

  /**
   * Test WordPress API connectivity
   * GET /api/wordpress/test
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      // Test basic WordPress REST API
      const health = await this.syncService.healthCheck();
      
      res.json({
        success: true,
        message: 'WordPress connection test completed',
        details: health,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    }
  }

  /**
   * Get WordPress Pods configuration
   * GET /api/wordpress/pods/config
   */
  async getPodsConfig(req: Request, res: Response): Promise<void> {
    try {
      // Return the Pods configuration metadata
      const config = {
        pods: [
          {
            name: 'movie',
            restBase: 'movies',
            fields: ['movie_title', 'movie_year', 'movie_tmdb_id', '...'], // Truncated for brevity
            bidirectionalFields: {
              'movie_actors': 'related_movies_actor',
              'movie_directors': 'related_movies_director',
            },
          },
          {
            name: 'actor',
            restBase: 'actors', 
            fields: ['actor_name', 'actor_biography', '...'],
            bidirectionalFields: {
              'related_movies_actor': 'movie_actors',
            },
          },
          // Add other pods...
        ],
      };

      res.json({
        success: true,
        config,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get Pods config',
      });
    }
  }
}

export default WordPressSyncController;
