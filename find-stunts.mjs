import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config()
const prisma = new PrismaClient()

async function findStunts() {
  // Find the Stunts movie
  const stunts = await prisma.movie.findFirst({
    where: { movieTitle: 'Stunts' },
    select: { id: true, movieTitle: true, movieYear: true }
  })
  
  if (stunts) {
    console.log('Found Stunts movie:', stunts)
    
    // Find experiments that reference this movie
    const experimentsWithStunts = await prisma.experiment.findMany({
      where: {
        experimentMovies: {
          array_contains: ['Stunts']
        }
      },
      select: {
        id: true,
        experimentNumber: true,
        experimentMovies: true,
        eventDate: true
      }
    })
    
    console.log('Experiments with Stunts:', experimentsWithStunts)
  } else {
    console.log('Stunts movie not found in database')
  }
  
  await prisma.$disconnect()
}

findStunts().catch(console.error)
