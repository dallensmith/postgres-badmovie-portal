#!/usr/bin/env tsx

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
    
    // Sample recent experiments
    console.log('\n=== Sample Recent Experiments (Last 5) ===')
    const recentExperiments = await prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        experimentNumber: true,
        eventDate: true,
        experimentMovies: true,
        createdAt: true
      }
    })
    
    recentExperiments.forEach(exp => {
      const movies = Array.isArray(exp.experimentMovies) ? exp.experimentMovies.join(', ') : 'None'
      console.log(`${exp.id}: Experiment ${exp.experimentNumber} - Movies: ${movies} - Created: ${exp.createdAt.toISOString().split('T')[0]}`)
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
    
    // Database health check
    console.log('\n=== Database Health Check ===')
    const moviesWithNullTitles = await prisma.movie.count({
      where: { movieTitle: null }
    })
    
    const experimentsWithNullNumbers = await prisma.experiment.count({
      where: { experimentNumber: null }
    })
    
    console.log(`Movies with null titles: ${moviesWithNullTitles}`)
    console.log(`Experiments with null numbers: ${experimentsWithNullNumbers}`)
    
    // Year distribution
    console.log('\n=== Movie Year Distribution (Top 10) ===')
    const yearStats = await prisma.$queryRaw`
      SELECT movie_year, COUNT(*) as count 
      FROM movies 
      WHERE movie_year IS NOT NULL 
      GROUP BY movie_year 
      ORDER BY count DESC 
      LIMIT 10
    ` as Array<{ movie_year: string; count: bigint }>
    
    yearStats.forEach(stat => {
      console.log(`${stat.movie_year}: ${stat.count} movies`)
    })
    
  } catch (error) {
    console.error('Verification failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyData()
