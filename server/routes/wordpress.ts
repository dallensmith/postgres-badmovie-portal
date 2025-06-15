import express from 'express';
import WordPressSyncController from '../controllers/wordpressSync';

const router = express.Router();
const syncController = new WordPressSyncController();

// WordPress connectivity and health
router.get('/health', syncController.healthCheck.bind(syncController));
router.get('/test', syncController.testConnection.bind(syncController));
router.get('/pods/config', syncController.getPodsConfig.bind(syncController));

// Movie synchronization endpoints
router.post('/sync/movie/:id', syncController.syncMovieToWordPress.bind(syncController));
router.post('/sync/movie/from/:wordpressId', syncController.syncMovieFromWordPress.bind(syncController));
router.post('/sync/movie/:id/bidirectional', syncController.bidirectionalSyncMovie.bind(syncController));
router.post('/sync/movies/bulk', syncController.bulkSyncMoviesFromWordPress.bind(syncController));

// Generic sync endpoint for any entity type
router.post('/sync/:entityType/:id', syncController.manualSync.bind(syncController));

// Sync logs and monitoring
router.get('/sync/logs', syncController.getSyncLogs.bind(syncController));

// Legacy endpoints (keeping for compatibility)
router.get('/sync/movies', async (req, res) => {
  res.json({ message: 'Use POST /wordpress/sync/movies/bulk for bulk sync' });
});

router.post('/webhook', async (req, res) => {
  res.json({ message: 'WordPress webhook handler coming soon' });
});

export default router;
