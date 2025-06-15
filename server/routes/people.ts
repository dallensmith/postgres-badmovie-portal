import express from 'express';
import { prisma } from '../index.js';

const router = express.Router();

// GET /api/people - List all people (actors, directors, writers)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const department = req.query.department as string;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    
    if (department) {
      where.knownForDepartment = department;
    }
    
    const [people, total] = await Promise.all([
      prisma.person.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' }
      }),
      prisma.person.count({ where })
    ]);
    
    res.json({
      people,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching people:', error);
    res.status(500).json({ error: 'Failed to fetch people' });
  }
});

// GET /api/people/:id - Get single person with filmography
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const person = await prisma.person.findUnique({
      where: { id },
      include: {
        movieCast: {
          include: { movie: true },
          orderBy: { movie: { releaseDate: 'desc' } }
        },
        movieCrew: {
          include: { movie: true },
          orderBy: { movie: { releaseDate: 'desc' } }
        }
      }
    });
    
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }
    
    res.json(person);
  } catch (error) {
    console.error('Error fetching person:', error);
    res.status(500).json({ error: 'Failed to fetch person' });
  }
});

// POST /api/people - Create new person
router.post('/', async (req, res) => {
  try {
    const person = await prisma.person.create({
      data: req.body
    });
    
    res.status(201).json(person);
  } catch (error) {
    console.error('Error creating person:', error);
    res.status(500).json({ error: 'Failed to create person' });
  }
});

// PUT /api/people/:id - Update person
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const person = await prisma.person.update({
      where: { id },
      data: req.body
    });
    
    res.json(person);
  } catch (error) {
    console.error('Error updating person:', error);
    res.status(500).json({ error: 'Failed to update person' });
  }
});

export default router;
