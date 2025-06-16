#!/usr/bin/env node

/**
 * CSV Import Master Script
 * 
 * Imports data from Bad-Movie-Database.csv with intelligent handling of:
 * - Movies (title, year, tmdb_id only - rest comes from TMDb)
 * - Experiments (full metadata including cleaned notes)
 * - Movie-Experiment relationships
 * - 3D movie detection
 * - Encore/matinee text cleaning
 * - AKA title removal
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import csvParser from 'csv-parser'

const prisma = new PrismaClient()

// Command line arguments
const isDryRun = process.argv.includes('--dry-run') || !process.argv.includes('--execute')
const verbose = process.argv.includes('--verbose')

// Tracking objects
const stats = {
    csvRows: 0,
    uniqueMovies: new Map(),
    uniqueExperiments: new Map(),
    movieExperimentLinks: [],
    moviesWithoutTmdb: [],
    movies3D: [],
    notesToClean: [],
    duplicateMovieExperiments: []
}

/**
 * Extract TMDb ID from various URL formats
 */
function extractTmdbId(tmdbUrl) {
    if (!tmdbUrl) return null
    const match = tmdbUrl.match(/themoviedb\.org\/movie\/(\d+)/)
    return match ? parseInt(match[1]) : null
}

/**
 * Clean movie title - remove AKA references
 */
function cleanMovieTitle(title) {
    if (!title) return title
    
    // Remove "aka [alternative title]" patterns
    return title
        .replace(/\s+aka\s+.+$/i, '')
        .replace(/\s+\(.+aka.+\)/i, '')
        .trim()
}

/**
 * Detect 3D movies from notes or title
 */
function is3DMovie(title, notes) {
    const text = `${title || ''} ${notes || ''}`.toLowerCase()
    return text.includes('3d') || text.includes('3-d') || text.includes('three-d')
}

/**
 * Clean experiment notes - remove encore/matinee, preserve important content
 */
function cleanExperimentNotes(notes) {
    if (!notes) return notes
    
    let cleaned = notes
        // Remove encore/matinee mentions but preserve other content
        .replace(/\b(encore|matinee)\b/gi, '')
        // Clean up extra whitespace
        .replace(/\s+/g, ' ')
        .trim()
    
    // If notes became empty after cleaning, return null
    return cleaned.length > 0 ? cleaned : null
}

/**
 * Parse date in various formats to DateTime
 */
function parseDate(dateStr) {
    if (!dateStr) return null
    
    try {
        const date = new Date(dateStr)
        return isNaN(date.getTime()) ? null : date
    } catch {
        return null
    }
}

/**
 * Process CSV data and build import plan
 */
async function processCsvData() {
    console.log('📂 Reading and analyzing Bad-Movie-Database.csv...\n')
    
    return new Promise((resolve, reject) => {
        fs.createReadStream('./Bad-Movie-Database.csv')
            .pipe(csvParser())
            .on('data', (row) => {
                stats.csvRows++
                
                // Parse experiment data
                const expNum = row.experiment_number?.trim()
                if (expNum) {
                    const experimentKey = expNum
                    
                    if (!stats.uniqueExperiments.has(experimentKey)) {
                        const rawNotes = row.event_notes?.trim()
                        const cleanedNotes = cleanExperimentNotes(rawNotes)
                        
                        // Track notes that were cleaned for review
                        if (rawNotes && rawNotes !== cleanedNotes) {
                            stats.notesToClean.push({
                                experiment: expNum,
                                original: rawNotes,
                                cleaned: cleanedNotes
                            })
                        }
                        
                        stats.uniqueExperiments.set(experimentKey, {
                            experimentNumber: expNum,
                            eventDate: parseDate(row.event_date),
                            eventHost: row.event_host?.trim() || null,
                            postUrl: row.post_url?.trim() || null,
                            eventEncore: row.event_encore === 'true' || row.event_encore === 'Yes',
                            eventLocation: row.event_location?.trim() || 'Bigscreen VR',
                            eventImageWpId: row.event_image_wp_id ? parseInt(row.event_image_wp_id) : null,
                            eventImage: row.event_image?.trim() || null,
                            eventNotes: cleanedNotes || null,
                            eventAttendees: row.event_attendees?.trim() || null
                        })
                    }
                }
                
                // Process movie data
                const rawTitle = row.movie_title?.trim()
                if (rawTitle) {
                    const cleanTitle = cleanMovieTitle(rawTitle)
                    const tmdbId = extractTmdbId(row.movie_tmdb_url)
                    const imdbId = row.movie_imdb_id?.trim() || null
                    const year = row.movie_year?.trim() || null
                    
                    // Create unique key - prioritize TMDb ID, then IMDb ID, then title+year
                    let movieKey
                    if (tmdbId) {
                        movieKey = `tmdb_${tmdbId}`
                    } else if (imdbId) {
                        movieKey = `imdb_${imdbId}`
                    } else {
                        movieKey = `title_${cleanTitle}_${year || 'unknown'}`
                    }
                    
                    if (!stats.uniqueMovies.has(movieKey)) {
                        const movieData = {
                            movieTitle: cleanTitle,
                            movieYear: year,
                            movieTmdbId: tmdbId ? tmdbId.toString() : null,
                            movieTmdbUrl: row.movie_tmdb_url?.trim() || null,
                            movieImdbId: imdbId,
                            movieImdbUrl: row.movie_imdb_url?.trim() || null,
                            excludeFromTmdbSync: !tmdbId, // Exclude movies without TMDb ID
                            shown3D: is3DMovie(cleanTitle, row.event_notes)
                        }
                        
                        stats.uniqueMovies.set(movieKey, movieData)
                        
                        // Track special cases
                        if (!tmdbId) {
                            stats.moviesWithoutTmdb.push({
                                title: cleanTitle,
                                year: year,
                                originalTitle: rawTitle,
                                hasImdbId: !!imdbId,
                                imdbId: imdbId
                            })
                        }
                        
                        if (movieData.shown3D) {
                            stats.movies3D.push({
                                title: cleanTitle,
                                year: year,
                                detectedFrom: row.event_notes || 'title'
                            })
                        }
                    }
                    
                    // Track movie-experiment relationships
                    if (expNum) {
                        const linkKey = `${movieKey}_${expNum}`
                        const existingLink = stats.movieExperimentLinks.find(l => l.linkKey === linkKey)
                        
                        if (existingLink) {
                            stats.duplicateMovieExperiments.push({
                                movie: cleanTitle,
                                experiment: expNum,
                                note: 'Duplicate relationship - database constraint will handle this'
                            })
                        } else {
                            stats.movieExperimentLinks.push({
                                linkKey,
                                movieKey,
                                experimentNumber: expNum,
                                movieTitle: cleanTitle,
                                year: year
                            })
                        }
                    }
                }
            })
            .on('end', () => {
                console.log(`✅ Processed ${stats.csvRows} CSV rows\n`)
                resolve()
            })
            .on('error', reject)
    })
}

/**
 * Display detailed dry run report
 */
function displayDryRunReport() {
    console.log('🔍 DRY RUN ANALYSIS REPORT')
    console.log('='.repeat(50))
    
    // Summary statistics
    console.log('\n📊 SUMMARY STATISTICS:')
    console.log(`   • CSV rows processed: ${stats.csvRows}`)
    console.log(`   • Unique movies found: ${stats.uniqueMovies.size}`)
    console.log(`   • Unique experiments found: ${stats.uniqueExperiments.size}`)
    console.log(`   • Movie-experiment links: ${stats.movieExperimentLinks.length}`)
    console.log(`   • Movies without TMDb ID: ${stats.moviesWithoutTmdb.length}`)
    console.log(`   • Movies shown in 3D: ${stats.movies3D.length}`)
    console.log(`   • Experiment notes cleaned: ${stats.notesToClean.length}`)
    console.log(`   • Duplicate movie-experiment pairs: ${stats.duplicateMovieExperiments.length}`)
    
    // Movies without TMDb ID
    if (stats.moviesWithoutTmdb.length > 0) {
        console.log('\n🚫 MOVIES WITHOUT TMDB ID (will be excluded from TMDb sync):')
        stats.moviesWithoutTmdb.slice(0, 10).forEach((movie, i) => {
            console.log(`   ${i + 1}. "${movie.title}" (${movie.year || 'unknown year'})`)
            if (movie.hasImdbId) {
                console.log(`      Has IMDb ID: ${movie.imdbId}`)
            }
            if (movie.title !== movie.originalTitle) {
                console.log(`      Original: "${movie.originalTitle}"`)
            }
        })
        if (stats.moviesWithoutTmdb.length > 10) {
            console.log(`   ... and ${stats.moviesWithoutTmdb.length - 10} more`)
        }
    }
    
    // 3D Movies
    if (stats.movies3D.length > 0) {
        console.log('\n🥽 MOVIES DETECTED AS 3D:')
        stats.movies3D.slice(0, 10).forEach((movie, i) => {
            console.log(`   ${i + 1}. "${movie.title}" (${movie.year || 'unknown'})`)
            console.log(`      Detected from: ${movie.detectedFrom}`)
        })
        if (stats.movies3D.length > 10) {
            console.log(`   ... and ${stats.movies3D.length - 10} more`)
        }
    }
    
    // Cleaned notes examples
    if (stats.notesToClean.length > 0) {
        console.log('\n✂️  EXPERIMENT NOTES CLEANING EXAMPLES:')
        stats.notesToClean.slice(0, 5).forEach((note, i) => {
            console.log(`   ${i + 1}. Experiment ${note.experiment}:`)
            console.log(`      Before: "${note.original}"`)
            console.log(`      After:  "${note.cleaned || '(empty - will be null)'}"`)
        })
        if (stats.notesToClean.length > 5) {
            console.log(`   ... and ${stats.notesToClean.length - 5} more notes cleaned`)
        }
    }
    
    // Sample experiments
    console.log('\n🧪 SAMPLE EXPERIMENTS TO BE IMPORTED:')
    const sampleExperiments = Array.from(stats.uniqueExperiments.values()).slice(0, 3)
    sampleExperiments.forEach((exp, i) => {
        console.log(`   ${i + 1}. Experiment ${exp.experimentNumber}:`)
        console.log(`      Date: ${exp.eventDate || 'unknown'}`)
        console.log(`      Host: ${exp.eventHost || 'unknown'}`)
        console.log(`      Location: ${exp.eventLocation}`)
        console.log(`      Notes: ${exp.eventNotes || 'none'}`)
        console.log(`      Image: ${exp.eventImage ? 'yes' : 'no'}`)
    })
    
    // Sample movies
    console.log('\n🎬 SAMPLE MOVIES TO BE IMPORTED:')
    const sampleMovies = Array.from(stats.uniqueMovies.values()).slice(0, 3)
    sampleMovies.forEach((movie, i) => {
        console.log(`   ${i + 1}. "${movie.movieTitle}" (${movie.movieYear || 'unknown'})`)
        console.log(`      TMDb ID: ${movie.movieTmdbId || 'none'}`)
        console.log(`      Exclude from TMDb sync: ${movie.excludeFromTmdbSync}`)
        console.log(`      Shown in 3D: ${movie.shown3D}`)
    })
    
    console.log('\n🔗 IMPORT OPERATIONS THAT WILL BE PERFORMED:')
    console.log(`   1. Insert ${stats.uniqueMovies.size} movies`)
    console.log(`   2. Insert ${stats.uniqueExperiments.size} experiments`)
    console.log(`   3. Create ${stats.movieExperimentLinks.length} movie-experiment links`)
    console.log(`   4. Mark ${stats.moviesWithoutTmdb.length} movies to exclude from TMDb sync`)
    console.log(`   5. Flag ${stats.movies3D.length} movies as shown in 3D`)
    
    // Show duplicate details
    if (stats.duplicateMovieExperiments.length > 0) {
        console.log('\n🔄 DUPLICATE MOVIE-EXPERIMENT PAIRS DETECTED:')
        stats.duplicateMovieExperiments.forEach((dup, i) => {
            console.log(`   ${i + 1}. "${dup.movie}" in Experiment ${dup.experiment}`)
            console.log(`      Note: ${dup.note}`)
        })
    }

    console.log('\n⚠️  POTENTIAL ISSUES:')
    console.log(`   • ${stats.duplicateMovieExperiments.length} duplicate movie-experiment pairs (will be handled by database constraints)`)
    console.log(`   • ${stats.moviesWithoutTmdb.length} movies without TMDb data (will need manual enrichment)`)
    
    console.log('\n🚀 TO EXECUTE THE IMPORT:')
    console.log('   node csv-import-master.mjs --execute')
    console.log('\n💾 TO RUN TMDB BATCH UPDATE AFTER IMPORT:')
    console.log('   node batch-tmdb-update.mjs  # (script to be created)')
}

/**
 * Execute the actual import
 */
async function executeImport() {
    console.log('🚀 EXECUTING IMPORT...')
    console.log('='.repeat(30))
    
    try {
        console.log('\n1. 🎬 Importing movies...')
        
        let movieCount = 0
        for (const [key, movieData] of stats.uniqueMovies) {
            await prisma.movie.create({
                data: movieData
            })
            movieCount++
            
            if (verbose && movieCount % 50 === 0) {
                console.log(`   Imported ${movieCount}/${stats.uniqueMovies.size} movies...`)
            }
        }
        console.log(`   ✅ Imported ${movieCount} movies`)
        
        console.log('\n2. 🧪 Importing experiments...')
        let expCount = 0
        for (const [key, expData] of stats.uniqueExperiments) {
            await prisma.experiment.create({
                data: expData
            })
            expCount++
            
            if (verbose && expCount % 50 === 0) {
                console.log(`   Imported ${expCount}/${stats.uniqueExperiments.size} experiments...`)
            }
        }
        console.log(`   ✅ Imported ${expCount} experiments`)
        
        console.log('\n3. 🔗 Creating movie-experiment links...')
        let linkCount = 0
        
        for (const link of stats.movieExperimentLinks) {
            try {
                // Find the movie using the appropriate identifier
                let movie
                if (link.movieKey.startsWith('tmdb_')) {
                    const tmdbId = link.movieKey.replace('tmdb_', '')
                    movie = await prisma.movie.findFirst({
                        where: { movieTmdbId: tmdbId }
                    })
                } else if (link.movieKey.startsWith('imdb_')) {
                    const imdbId = link.movieKey.replace('imdb_', '')
                    movie = await prisma.movie.findFirst({
                        where: { movieImdbId: imdbId }
                    })
                } else {
                    // Title-based lookup for movies without external IDs
                    movie = await prisma.movie.findFirst({
                        where: { 
                            movieTitle: link.movieTitle,
                            movieYear: link.year || undefined
                        }
                    })
                }
                
                // Find the experiment
                const experiment = await prisma.experiment.findUnique({
                    where: { experimentNumber: link.experimentNumber }
                })
                
                if (movie && experiment) {
                    await prisma.movieExperiment.create({
                        data: {
                            movieId: movie.id,
                            experimentId: experiment.id
                        }
                    })
                    linkCount++
                } else {
                    console.log(`   ⚠️  Skipped link: ${link.movieTitle} → Exp ${link.experimentNumber} (movie or experiment not found)`)
                }
            } catch (error) {
                if (error.code === 'P2002') {
                    // Unique constraint violation - expected for duplicates
                    if (verbose) {
                        console.log(`   ℹ️  Skipped duplicate: ${link.movieTitle} → Exp ${link.experimentNumber}`)
                    }
                } else {
                    throw error
                }
            }
            
            if (verbose && linkCount % 100 === 0) {
                console.log(`   Created ${linkCount} links...`)
            }
        }
        console.log(`   ✅ Created ${linkCount} movie-experiment links`)
        
        console.log('\n🎉 IMPORT COMPLETED SUCCESSFULLY!')
        console.log('\n📋 NEXT STEPS:')
        console.log('   1. Run TMDb batch update for movies with TMDb IDs')
        console.log('   2. Manually enrich movies without TMDb data')
        console.log('   3. Review and update any experiment notes as needed')
        
    } catch (error) {
        console.error('\n❌ IMPORT FAILED:', error.message)
        if (verbose) {
            console.error(error)
        }
        process.exit(1)
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🎬 CSV IMPORT MASTER SCRIPT')
    console.log('='.repeat(30))
    
    if (isDryRun) {
        console.log('🔍 DRY RUN MODE - No database changes will be made\n')
    } else {
        console.log('🚀 EXECUTE MODE - Database will be modified\n')
    }
    
    try {
        await processCsvData()
        
        if (isDryRun) {
            displayDryRunReport()
        } else {
            await executeImport()
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message)
        if (verbose) {
            console.error(error)
        }
        process.exit(1)
    } finally {
        await prisma.$disconnect()
    }
}

// Run the script
main()
