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
  post_url: string
  event_encore: string
  event_location: string
  event_image_wp_id: string
  event_image: string
  event_notes: string
  event_attendees: string
  movie_original_title: string
  movie_alternative_titles: string
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
  movie_imdb_rating: string
  movie_imdb_votes: string
  movie_tmdb_id: string
  movie_imdb_id: string
  movie_imdb_url: string
  movie_tmdb_url: string
  affiliate_link_1: string
  affiliate_link_2: string
  affiliate_link_3: string
  affiliate_link_4: string
  affiliate_link_5: string
  affiliate_link_6: string
  [key: string]: string // Allow other fields
}

interface ImportStats {
  totalRows: number
  processedRows: number
  skippedRows: number
  errorRows: number
  createdMovies: number
  createdExperiments: number
  duplicateMovies: number
  duplicateExperiments: number
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

// Remove unused parseNumber function

function parseRuntimeToMinutes(runtime: string): number | null {
  if (!runtime) return null
  // Handle formats like "1h 32m", "92 minutes", "1:32", etc.
  const hourMatch = runtime.match(/(\d+)h/)
  const minMatch = runtime.match(/(\d+)m/)
  
  let totalMinutes = 0
  if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10)
  
  // If no matches, try to parse as pure number
  if (totalMinutes === 0) {
    const num = parseInt(runtime.replace(/\D/g, ''), 10)
    if (!isNaN(num) && num > 0 && num < 1000) {
      totalMinutes = num
    }
  }
  
  return totalMinutes > 0 ? totalMinutes : null
}

function cleanString(value: string): string | null {
  if (!value || value.trim() === '') return null
  return value.trim()
}

async function processMovie(row: CsvRow, stats: ImportStats): Promise<number | null> {
  try {
    // Check if movie already exists by title and year
    const existingMovie = await prisma.movie.findFirst({
      where: {
        movieTitle: row.movie_title,
        movieYear: row.movie_year || undefined
      }
    })
    
    if (existingMovie) {
      stats.duplicateMovies++
      return existingMovie.id
    }
    
    // Parse relationships
    const actorNames = splitString(row.movie_actors)
    const genreNames = splitString(row.movie_genres)
    const directorNames = splitString(row.movie_director)
    const writerNames = splitString(row.movie_writers)
    const studioNames = splitString(row.movie_studio)
    const countryNames = splitString(row.movie_country)
    const languageNames = splitString(row.movie_language)
    const characterNames = splitString(row.movie_characters)
    
    // Create the movie
    const movie = await prisma.movie.create({
      data: {
        movieTitle: row.movie_title,
        movieOriginalTitle: cleanString(row.movie_original_title) || row.movie_title,
        movieYear: cleanString(row.movie_year),
        movieReleaseDate: parseDate(row.movie_release_date),
        movieRuntime: parseRuntimeToMinutes(row.movie_runtime),
        movieOverview: cleanString(row.movie_overview),
        movieTagline: cleanString(row.movie_tagline),
        movieContentRating: cleanString(row.movie_content_rating),
        movieBudget: cleanString(row.movie_budget),
        movieBoxOffice: cleanString(row.movie_box_office),
        moviePoster: cleanString(row.movie_poster),
        movieBackdrop: cleanString(row.movie_backdrop),
        movieTrailer: cleanString(row.movie_trailer),
        movieTmdbId: cleanString(row.movie_tmdb_id),
        movieTmdbRating: cleanString(row.movie_tmdb_rating),
        movieTmdbVotes: cleanString(row.movie_tmdb_votes),
        movieTmdbUrl: cleanString(row.movie_tmdb_url),
        movieImdbId: cleanString(row.movie_imdb_id),
        movieImdbUrl: cleanString(row.movie_imdb_url),
        
        // Store relationships as JSON arrays for now
        movieActors: actorNames.length > 0 ? actorNames : undefined,
        movieCharacters: characterNames.length > 0 ? characterNames : undefined,
        movieGenres: genreNames.length > 0 ? genreNames : undefined,
        movieDirectors: directorNames.length > 0 ? directorNames : undefined,
        movieWriters: writerNames.length > 0 ? writerNames : undefined,
        movieStudios: studioNames.length > 0 ? studioNames : undefined,
        movieCountries: countryNames.length > 0 ? countryNames : undefined,
        movieLanguages: languageNames.length > 0 ? languageNames : undefined
      }
    })
    
    stats.createdMovies++
    return movie.id
    
  } catch (error) {
    console.error(`Error creating movie "${row.movie_title}":`, error)
    throw error
  }
}

async function processExperiment(row: CsvRow, stats: ImportStats): Promise<void> {
  try {
    // Check if experiment already exists
    const existingExperiment = await prisma.experiment.findFirst({
      where: {
        experimentNumber: row.experiment_number
      }
    })
    
    if (existingExperiment) {
      stats.duplicateExperiments++
      return
    }
    
    // Parse event data
    const eventLocations = splitString(row.event_location)
    
    // Create the experiment
    await prisma.experiment.create({
      data: {
        experimentNumber: cleanString(row.experiment_number),
        eventDate: parseDate(row.event_date) || new Date(),
        eventHost: cleanString(row.event_host),
        eventLocation: eventLocations.length > 0 ? eventLocations : ['Bigscreen VR'],
        experimentImage: cleanString(row.event_image),
        experimentNotes: cleanString(row.event_notes),
        
        // Link to the movie
        experimentMovies: [row.movie_title]
      }
    })
    
    stats.createdExperiments++
    
  } catch (error) {
    console.error(`Error creating experiment "${row.experiment_number}":`, error)
    throw error
  }
}

async function importFullData() {
  console.log('🚀 Starting full CSV import...')
  
  const stats: ImportStats = {
    totalRows: 0,
    processedRows: 0,
    skippedRows: 0,
    errorRows: 0,
    createdMovies: 0,
    createdExperiments: 0,
    duplicateMovies: 0,
    duplicateExperiments: 0
  }
  
  try {
    // Test database connection first
    await prisma.$connect()
    console.log('✓ Database connection successful')
    
    const csvPath = path.join(process.cwd(), 'Bad-Movie-Database.csv')
    
    if (!fs.existsSync(csvPath)) {
      console.error('❌ CSV file not found:', csvPath)
      process.exit(1)
    }
    
    const rows: CsvRow[] = []
    
    // Read CSV file
    console.log('📖 Reading CSV file...')
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (data: CsvRow) => rows.push(data))
        .on('end', resolve)
        .on('error', reject)
    })
    
    stats.totalRows = rows.length
    console.log(`📊 Found ${rows.length} rows in CSV`)
    
    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      // Show progress every 50 rows
      if (i % 50 === 0 || i === rows.length - 1) {
        const progress = ((i + 1) / rows.length * 100).toFixed(1)
        console.log(`📝 Processing ${i + 1}/${rows.length} (${progress}%): Experiment ${row.experiment_number} - ${row.movie_title}`)
      }
      
      try {
        // Validate required fields
        if (!row.movie_title || !row.experiment_number) {
          console.log(`⚠️  Skipping row ${i + 1}: Missing required fields`)
          stats.skippedRows++
          continue
        }
        
        // Process movie first
        const movieId = await processMovie(row, stats)
        
        if (movieId) {
          // Then process experiment
          await processExperiment(row, stats)
        }
        
        stats.processedRows++
        
      } catch (error) {
        stats.errorRows++
        console.error(`❌ Error processing row ${i + 1} (Experiment ${row.experiment_number}):`, error)
        
        // Continue processing other rows
        continue
      }
    }
    
    // Final report
    console.log('\n🎉 Import Complete!')
    console.log('='.repeat(50))
    console.log(`📊 Total rows in CSV: ${stats.totalRows}`)
    console.log(`✅ Successfully processed: ${stats.processedRows}`)
    console.log(`⚠️  Skipped rows: ${stats.skippedRows}`)
    console.log(`❌ Error rows: ${stats.errorRows}`)
    console.log('')
    console.log(`🎬 Created movies: ${stats.createdMovies}`)
    console.log(`🔬 Created experiments: ${stats.createdExperiments}`)
    console.log(`🔄 Duplicate movies: ${stats.duplicateMovies}`)
    console.log(`🔄 Duplicate experiments: ${stats.duplicateExperiments}`)
    console.log('='.repeat(50))
    
  } catch (error) {
    console.error('💥 Import failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the import
importFullData()
