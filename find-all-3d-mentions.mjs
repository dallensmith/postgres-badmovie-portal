#!/usr/bin/env node

/**
 * Comprehensive 3D Detection Script
 * 
 * Scans CSV and WordPress data for all mentions of 3D movies
 */

import fs from 'fs'
import csvParser from 'csv-parser'

const results = {
    csvMovies: [],
    csvExperiments: [],
    wordpressMovies: [],
    wordpressExperiments: []
}

/**
 * Check if text contains 3D references
 */
function contains3D(text) {
    if (!text) return false
    const lowerText = text.toLowerCase()
    return lowerText.includes('3d') || 
           lowerText.includes('3-d') || 
           lowerText.includes('three-d') ||
           lowerText.includes('three d') ||
           lowerText.includes('in 3d') ||
           lowerText.includes('shown in 3d')
}

/**
 * Extract 3D mentions with context
 */
function extract3DContext(text, maxLength = 100) {
    if (!text) return null
    
    const patterns = [
        /(.{0,50}3d.{0,50})/gi,
        /(.{0,50}3-d.{0,50})/gi,
        /(.{0,50}three.{0,10}d.{0,50})/gi
    ]
    
    for (const pattern of patterns) {
        const matches = text.match(pattern)
        if (matches) {
            return matches[0].trim()
        }
    }
    return null
}

/**
 * Scan CSV data
 */
async function scanCSV() {
    console.log('🔍 Scanning CSV for 3D mentions...\n')
    
    return new Promise((resolve, reject) => {
        fs.createReadStream('./Bad-Movie-Database.csv')
            .pipe(csvParser())
            .on('data', (row) => {
                const expNum = row.experiment_number?.trim()
                const movieTitle = row.movie_title?.trim()
                
                // Check movie title
                if (movieTitle && contains3D(movieTitle)) {
                    results.csvMovies.push({
                        experiment: expNum,
                        title: movieTitle,
                        year: row.movie_year?.trim(),
                        context: extract3DContext(movieTitle),
                        tmdbId: row.movie_tmdb_id?.trim(),
                        source: 'title'
                    })
                }
                
                // Check experiment notes
                if (row.event_notes && contains3D(row.event_notes)) {
                    const context = extract3DContext(row.event_notes)
                    results.csvExperiments.push({
                        experiment: expNum,
                        movieTitle: movieTitle,
                        context: context,
                        fullNotes: row.event_notes,
                        source: 'experiment_notes'
                    })
                }
                
                // Check other movie fields
                const fieldsToCheck = [
                    'movie_overview', 
                    'movie_tagline', 
                    'movie_original_title',
                    'movie_alternative_titles'
                ]
                
                fieldsToCheck.forEach(field => {
                    if (row[field] && contains3D(row[field])) {
                        results.csvMovies.push({
                            experiment: expNum,
                            title: movieTitle,
                            year: row.movie_year?.trim(),
                            context: extract3DContext(row[field]),
                            tmdbId: row.movie_tmdb_id?.trim(),
                            source: field
                        })
                    }
                })
            })
            .on('end', resolve)
            .on('error', reject)
    })
}

/**
 * Scan WordPress data
 */
async function scanWordPress() {
    console.log('🔍 Scanning WordPress data for 3D mentions...\n')
    
    try {
        const data = fs.readFileSync('./wordpress-comprehensive-data.json', 'utf8')
        const experiments = JSON.parse(data)
        
        experiments.forEach(exp => {
            // Check experiment notes
            if (exp.notes && contains3D(exp.notes)) {
                results.wordpressExperiments.push({
                    experiment: exp.experimentNumber,
                    title: exp.title,
                    context: extract3DContext(exp.notes),
                    fullNotes: exp.notes,
                    source: 'experiment_notes'
                })
            }
            
            // Check movies in this experiment
            if (exp.movies) {
                exp.movies.forEach(movie => {
                    if (contains3D(movie.title) || contains3D(movie.rawText)) {
                        results.wordpressMovies.push({
                            experiment: exp.experimentNumber,
                            title: movie.title,
                            year: movie.year,
                            context: extract3DContext(movie.title || movie.rawText),
                            url: movie.url,
                            source: movie.title ? 'movie_title' : 'raw_text'
                        })
                    }
                })
            }
        })
    } catch (error) {
        console.error('Error reading WordPress data:', error.message)
    }
}

/**
 * Display results
 */
function displayResults() {
    console.log('🥽 COMPREHENSIVE 3D DETECTION RESULTS')
    console.log('='.repeat(50))
    
    // CSV Movies
    if (results.csvMovies.length > 0) {
        console.log(`\n🎬 CSV MOVIES WITH 3D MENTIONS (${results.csvMovies.length}):`)
        const uniqueMovies = new Map()
        
        results.csvMovies.forEach(movie => {
            const key = `${movie.title}_${movie.year}`
            if (!uniqueMovies.has(key)) {
                uniqueMovies.set(key, movie)
            }
        })
        
        Array.from(uniqueMovies.values()).forEach((movie, i) => {
            console.log(`   ${i + 1}. "${movie.title}" (${movie.year || 'unknown'})`)
            console.log(`      Context: ${movie.context}`)
            console.log(`      TMDb ID: ${movie.tmdbId || 'none'}`)
            console.log(`      Source: ${movie.source}`)
            console.log('')
        })
    }
    
    // CSV Experiments
    if (results.csvExperiments.length > 0) {
        console.log(`\n🧪 CSV EXPERIMENTS WITH 3D MENTIONS (${results.csvExperiments.length}):`)
        results.csvExperiments.forEach((exp, i) => {
            console.log(`   ${i + 1}. Experiment ${exp.experiment}: "${exp.movieTitle}"`)
            console.log(`      Context: ${exp.context}`)
            console.log('')
        })
    }
    
    // WordPress Movies
    if (results.wordpressMovies.length > 0) {
        console.log(`\n🌐 WORDPRESS MOVIES WITH 3D MENTIONS (${results.wordpressMovies.length}):`)
        const uniqueWPMovies = new Map()
        
        results.wordpressMovies.forEach(movie => {
            const key = `${movie.title}_${movie.year}`
            if (!uniqueWPMovies.has(key)) {
                uniqueWPMovies.set(key, movie)
            }
        })
        
        Array.from(uniqueWPMovies.values()).forEach((movie, i) => {
            console.log(`   ${i + 1}. "${movie.title}" (${movie.year || 'unknown'})`)
            console.log(`      Context: ${movie.context}`)
            console.log(`      URL: ${movie.url || 'none'}`)
            console.log(`      Experiment: ${movie.experiment}`)
            console.log('')
        })
    }
    
    // WordPress Experiments
    if (results.wordpressExperiments.length > 0) {
        console.log(`\n🌐 WORDPRESS EXPERIMENTS WITH 3D MENTIONS (${results.wordpressExperiments.length}):`)
        results.wordpressExperiments.forEach((exp, i) => {
            console.log(`   ${i + 1}. Experiment ${exp.experiment}: ${exp.title}`)
            console.log(`      Context: ${exp.context}`)
            console.log('')
        })
    }
    
    // Summary
    const totalMovies = new Set([
        ...results.csvMovies.map(m => `${m.title}_${m.year}`),
        ...results.wordpressMovies.map(m => `${m.title}_${m.year}`)
    ]).size
    
    console.log('\n📊 SUMMARY:')
    console.log(`   • Total unique movies with 3D mentions: ${totalMovies}`)
    console.log(`   • CSV movie mentions: ${results.csvMovies.length}`)
    console.log(`   • CSV experiment mentions: ${results.csvExperiments.length}`)
    console.log(`   • WordPress movie mentions: ${results.wordpressMovies.length}`)
    console.log(`   • WordPress experiment mentions: ${results.wordpressExperiments.length}`)
    
    console.log('\n🔧 NEXT STEPS:')
    console.log('   1. Review the above list for movies that should be marked as 3D')
    console.log('   2. Update the database for any missing 3D flags')
    console.log('   3. Consider improving 3D detection patterns')
}

/**
 * Main execution
 */
async function main() {
    try {
        await scanCSV()
        await scanWordPress()
        displayResults()
    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

main()
