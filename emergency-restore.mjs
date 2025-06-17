#!/usr/bin/env node

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import csvParser from 'csv-parser'

const prisma = new PrismaClient()

console.log('🚨 EMERGENCY DATABASE RESTORE STARTED 🚨')

async function restoreFromCSV() {
  console.log('\n📂 Importing movies from Bad-Movie-Database.csv...')
  
  const movies = []
  const experiments = []
  
  return new Promise((resolve, reject) => {
    fs.createReadStream('./Bad-Movie-Database.csv')
      .pipe(csvParser())
      .on('data', (row) => {
        // Parse experiment data
        const expNum = parseInt(row.experiment_number)
        if (!isNaN(expNum)) {
          experiments.push({
            number: expNum,
            movieTitle: row.movie_title?.trim() || 'Unknown',
            eventDate: row.event_date || null,
            eventHost: row.event_host?.trim() || null,
            postUrl: row.post_url?.trim() || null,
            eventEncore: row.event_encore === 'Yes' || row.event_encore === 'TRUE'
          })
        }
        
        // Collect unique movies
        if (row.movie_title?.trim()) {
          const movieTitle = row.movie_title.trim()
          if (!movies.find(m => m.title === movieTitle)) {
            movies.push({
              title: movieTitle,
              year: null, // We'll need to get this from other sources
              genres: [],
              directors: [],
              actors: []
            })
          }
        }
      })
      .on('end', () => {
        console.log(`✅ Parsed ${experiments.length} experiments and ${movies.length} unique movies`)
        resolve({ movies, experiments })
      })
      .on('error', reject)
  })
}

async function restoreFromWordPress() {
  console.log('\n📂 Loading WordPress data...')
  
  try {
    const wpData = JSON.parse(fs.readFileSync('./wordpress-complete-data.json', 'utf8'))
    console.log(`✅ Loaded ${wpData.experiments.length} WordPress experiments`)
    return wpData
  } catch (error) {
    console.error('❌ Error loading WordPress data:', error.message)
    return null
  }
}

async function importMovies(movies) {
  console.log('\n🎬 Importing movies...')
  
  for (const movie of movies) {
    try {
      await prisma.movie.create({
        data: {
          title: movie.title,
          year: movie.year,
          tmdbId: null,
          overview: null,
          posterUrl: null,
          backdropUrl: null,
          genres: movie.genres || [],
          directors: movie.directors || [],
          actors: movie.actors || [],
          runtime: null,
          rating: null,
          releaseDate: null,
          budget: null,
          revenue: null
        }
      })
      console.log(`✅ Imported movie: ${movie.title}`)
    } catch (error) {
      console.error(`❌ Error importing movie ${movie.title}:`, error.message)
    }
  }
}

async function importExperiments(experiments) {
  console.log('\n🧪 Importing experiments...')
  
  for (const exp of experiments) {
    try {
      // Find the movie
      const movie = await prisma.movie.findFirst({
        where: { title: exp.movieTitle }
      })
      
      if (!movie) {
        console.log(`⚠️  Movie not found for experiment ${exp.number}: ${exp.movieTitle}`)
        continue
      }
      
      await prisma.experiment.create({
        data: {
          number: exp.number,
          eventDate: exp.eventDate ? new Date(exp.eventDate) : null,
          eventHost: exp.eventHost,
          postUrl: exp.postUrl,
          eventEncore: exp.eventEncore,
          notes: null,
          imageUrl: null,
          movieId: movie.id
        }
      })
      console.log(`✅ Imported experiment ${exp.number}: ${exp.movieTitle}`)
    } catch (error) {
      console.error(`❌ Error importing experiment ${exp.number}:`, error.message)
    }
  }
}

async function main() {
  try {
    // Clear existing data (already done by force-reset)
    console.log('🗑️  Database already reset')
    
    // Import from CSV
    const { movies, experiments } = await restoreFromCSV()
    
    // Import movies first
    await importMovies(movies)
    
    // Import experiments
    await importExperiments(experiments)
    
    // Check final counts
    const movieCount = await prisma.movie.count()
    const expCount = await prisma.experiment.count()
    
    console.log('\n🎉 EMERGENCY RESTORE COMPLETE!')
    console.log(`📊 Final counts: ${movieCount} movies, ${expCount} experiments`)
    
  } catch (error) {
    console.error('💥 RESTORE FAILED:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
