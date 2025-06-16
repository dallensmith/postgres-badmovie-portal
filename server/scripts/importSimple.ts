#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'
import csvParser from 'csv-parser'

// Load environment variables
config()

const prisma = new PrismaClient()

interface CsvRow {
  experiment_number: string
  movie_title: string
  event_date: string
  event_host: string
  event_location: string
  event_image: string
  event_notes: string
  movie_original_title: string
  movie_year: string
  movie_release_date: string
  movie_runtime: string
  movie_overview: string
  movie_tagline: string
  movie_genres: string
  movie_content_rating: string
  movie_director: string
  movie_writers: string
  movie_actors: string
  movie_characters: string
  movie_studio: string
  movie_country: string
  movie_language: string
  movie_budget: string
  movie_box_office: string
  movie_poster: string
  movie_backdrop: string
  movie_trailer: string
  movie_tmdb_rating: string
  movie_tmdb_votes: string
  movie_tmdb_id: string
  movie_imdb_id: string
  movie_imdb_url: string
  [key: string]: string // Allow other fields
}

// Helper functions
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}

function splitString(value: string, delimiter = ','): string[] {
  if (!value) return []
  return value.split(delimiter).map(s => s.trim()).filter(s => s.length > 0)
}

function parseRuntimeToMinutes(runtime: string): number | null {
  if (!runtime) return null
  // Handle formats like "1h 32m", "92 minutes", "1:32", etc.
  const hourMatch = runtime.match(/(\d+)h/)
  const minMatch = runtime.match(/(\d+)m/)
  
  let totalMinutes = 0
  if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10)
  
  return totalMinutes > 0 ? totalMinutes : null
}

async function importFirstFewMovies() {
  console.log('Starting simplified CSV import...')
  
  try {
    // Test database connection first
    await prisma.$connect()
    console.log('✓ Database connection successful')
    
    const csvPath = path.join(process.cwd(), 'Bad-Movie-Database.csv')
    
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath)
      process.exit(1)
    }
    
    const rows: CsvRow[] = []
    
    // Read CSV file
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data: CsvRow) => rows.push(data))
        .on('end', resolve)
        .on('error', reject)
    })
    
    console.log(`Found ${rows.length} rows in CSV`)
    
    let processedCount = 0
    let errorCount = 0
    const maxRows = 5 // Process only first 5 rows for testing
    
    for (let i = 0; i < Math.min(rows.length, maxRows); i++) {
      const row = rows[i]
      try {
        console.log(`\nProcessing ${i + 1}/${maxRows}: Experiment ${row.experiment_number} - ${row.movie_title}`)
        
        // Check if movie already exists
        const existingMovie = await prisma.movie.findFirst({
          where: {
            movieTitle: row.movie_title
          }
        })
        
        if (existingMovie) {
          console.log(`  → Movie "${row.movie_title}" already exists, skipping`)
          continue
        }
        
        // Parse some basic data
        const actorNames = splitString(row.movie_actors)
        const genreNames = splitString(row.movie_genres)
        
        console.log(`  → Actors: ${actorNames.slice(0, 3).join(', ')}${actorNames.length > 3 ? '...' : ''}`)
        console.log(`  → Genres: ${genreNames.join(', ')}`)
        
        // Create the movie with minimal data first
        const movie = await prisma.movie.create({
          data: {
            movieTitle: row.movie_title,
            movieOriginalTitle: row.movie_original_title || row.movie_title,
            movieYear: row.movie_year || null,
            movieReleaseDate: parseDate(row.movie_release_date),
            movieRuntime: parseRuntimeToMinutes(row.movie_runtime),
            movieOverview: row.movie_overview || null,
            movieTagline: row.movie_tagline || null,
            movieContentRating: row.movie_content_rating || null,
            movieBudget: row.movie_budget || null,
            movieBoxOffice: row.movie_box_office || null,
            moviePoster: row.movie_poster || null,
            movieBackdrop: row.movie_backdrop || null,
            movieTrailer: row.movie_trailer || null,
            movieTmdbId: row.movie_tmdb_id || null,
            movieTmdbRating: row.movie_tmdb_rating || null,
            movieTmdbVotes: row.movie_tmdb_votes || null,
            movieImdbId: row.movie_imdb_id || null,
            movieImdbUrl: row.movie_imdb_url || null,
            
            // Store relationships as JSON arrays
            movieActors: actorNames.length > 0 ? actorNames : undefined,
            movieGenres: genreNames.length > 0 ? genreNames : undefined
          }
        })
        
        console.log(`  → Created movie ID: ${movie.id}`)
        
        // Now create the experiment
        const experiment = await prisma.experiment.create({
          data: {
            experimentNumber: row.experiment_number || null,
            eventDate: parseDate(row.event_date) || new Date(),
            eventLocation: row.event_location ? [row.event_location] : ['Bigscreen VR'],
            eventHost: row.event_host || null,
            experimentImage: row.event_image || null,
            experimentNotes: row.event_notes || null,
            experimentMovies: [row.movie_title] // Link to movie by title
          }
        })
        
        console.log(`  → Created experiment ID: ${experiment.id}`)
        
        processedCount++
        
      } catch (error) {
        errorCount++
        console.error(`✗ Error processing experiment ${row.experiment_number}:`, error)
      }
    }
    
    console.log(`\n=== Import Complete ===`)
    console.log(`Total rows processed: ${Math.min(rows.length, maxRows)}`)
    console.log(`Successfully processed: ${processedCount}`)
    console.log(`Errors: ${errorCount}`)
    
  } catch (error) {
    console.error('Import failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importFirstFewMovies()
