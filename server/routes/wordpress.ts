import express from 'express';

const router = express.Router();

// Placeholder for WordPress/Pods integration
router.get('/sync/movies', async (req, res) => {
  res.json({ message: 'WordPress sync integration coming soon' });
});

router.post('/webhook', async (req, res) => {
  res.json({ message: 'WordPress webhook handler coming soon' });
});

export default router;
