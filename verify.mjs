import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Load environment variables
config()

const prisma = new PrismaClient()

async function verifyData() {
  try {
    console.log('=== Database Data Verification ===\n')
    
    // Test connection
    await prisma.$connect()
    console.log('✓ Database connection successful\n')
    
    // Count records
    const movieCount = await prisma.movie.count()
    const experimentCount = await prisma.experiment.count()
    
    console.log('=== Record Counts ===')
    console.log(`Movies: ${movieCount}`)
    console.log(`Experiments: ${experimentCount}\n`)
    
    // Sample recent movies
    console.log('=== Sample Recent Movies (Last 5) ===')
    const recentMovies = await prisma.movie.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        movieTitle: true,
        movieYear: true,
        createdAt: true
      }
    })
    
    recentMovies.forEach(movie => {
      console.log(`${movie.id}: ${movie.movieTitle} (${movie.movieYear}) - Created: ${movie.createdAt.toISOString().split('T')[0]}`)
    })
    
    // Check for specific movies from CSV
    console.log('\n=== Checking Specific Movies from CSV ===')
    const testMovies = ['New York Ninja', 'Blood Beat', 'Samurai Cop', 'Death Wish 3']
    
    for (const title of testMovies) {
      const movie = await prisma.movie.findFirst({
        where: { movieTitle: title },
        select: {
          id: true,
          movieTitle: true,
          movieYear: true,
          movieActors: true,
          movieDirectors: true
        }
      })
      
      if (movie) {
        console.log(`✓ Found: ${movie.movieTitle} (${movie.movieYear}) - ID: ${movie.id}`)
        if (movie.movieActors) {
          console.log(`  Actors: ${Array.isArray(movie.movieActors) ? movie.movieActors.slice(0, 3).join(', ') : 'None'}`)
        }
        if (movie.movieDirectors) {
          console.log(`  Directors: ${Array.isArray(movie.movieDirectors) ? movie.movieDirectors.join(', ') : 'None'}`)
        }
      } else {
        console.log(`✗ Not found: ${title}`)
      }
    }
    
    // Check experiments for those movies
    console.log('\n=== Checking Related Experiments ===')
    for (const title of testMovies.slice(0, 2)) {  // Check first 2 movies
      const experiments = await prisma.experiment.findMany({
        where: {
          experimentMovies: {
            array_contains: [title]
          }
        },
        select: {
          id: true,
          experimentNumber: true,
          eventDate: true,
          experimentMovies: true
        },
        take: 2
      })
      
      if (experiments.length > 0) {
        console.log(`✓ Found ${experiments.length} experiment(s) for "${title}":`)
        experiments.forEach(exp => {
          console.log(`  Experiment ${exp.experimentNumber} - Date: ${exp.eventDate?.toISOString().split('T')[0]}`)
        })
      } else {
        console.log(`✗ No experiments found for "${title}"`)
      }
    }
    
  } catch (error) {
    console.error('Verification failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyData().catch(console.error)
