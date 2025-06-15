import express from 'express';

const router = express.Router();

// Placeholder for TMDb integration
router.get('/search/movie', async (req, res) => {
  res.json({ message: 'TMDb integration coming soon' });
});

router.get('/movie/:id', async (req, res) => {
  res.json({ message: 'TMDb movie details coming soon' });
});

export default router;
