#!/usr/bin/env node

/**
 * Debug Movie Matching Logic
 * 
 * This script helps debug why movies are showing as missing when they should exist
 */

import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Load WordPress data
const wordpressDataPath = join(__dirname, 'wordpress-comprehensive-data.json');
let wordpressData;

try {
    const rawData = readFileSync(wordpressDataPath, 'utf8');
    wordpressData = JSON.parse(rawData);
    console.log(`✅ Loaded ${wordpressData.length} experiments from WordPress data`);
} catch (error) {
    console.error('❌ Error loading WordPress data:', error.message);
    process.exit(1);
}

/**
 * Normalize strings for comparison (remove extra spaces, convert to lowercase)
 */
function normalizeString(str) {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Extract unique movies from WordPress data
 */
function extractUniqueMovies(wordpressData) {
    const movies = new Map();
    
    wordpressData.forEach(experiment => {
        experiment.movies.forEach(movie => {
            const key = `${normalizeString(movie.title)}_${movie.year}`;
            if (!movies.has(key)) {
                movies.set(key, {
                    title: movie.title,
                    year: movie.year,
                    tmdbUrl: movie.url || null,
                    experiments: [experiment.experimentNumber]
                });
            } else {
                movies.get(key).experiments.push(experiment.experimentNumber);
            }
        });
    });
    
    return Array.from(movies.values());
}

/**
 * Debug movie matching
 */
async function debugMovieMatching() {
    console.log('\n🔍 Debugging Movie Matching...');
    
    // Extract unique movies from WordPress
    const wpMovies = extractUniqueMovies(wordpressData);
    
    // Fetch database movies
    const dbMovies = await prisma.movie.findMany({
        select: {
            id: true,
            movieTitle: true,
            movieYear: true,
            movieTmdbUrl: true
        }
    });
    
    console.log(`📊 WordPress has ${wpMovies.length} unique movies`);
    console.log(`📊 Database has ${dbMovies.length} movies`);
    
    // Let's examine a few specific examples
    console.log('\n🔍 Sample WordPress movies:');
    wpMovies.slice(0, 10).forEach((movie, i) => {
        const normalizedTitle = normalizeString(movie.title);
        const key = `${normalizedTitle}_${movie.year}`;
        console.log(`${i+1}. "${movie.title}" (${movie.year})`);
        console.log(`   Normalized: "${normalizedTitle}"`);
        console.log(`   Key: "${key}"`);
    });
    
    console.log('\n🔍 Sample Database movies:');
    dbMovies.slice(0, 10).forEach((movie, i) => {
        const normalizedTitle = normalizeString(movie.movieTitle || '');
        const key = `${normalizedTitle}_${movie.movieYear || ''}`;
        console.log(`${i+1}. "${movie.movieTitle}" (${movie.movieYear})`);
        console.log(`   Normalized: "${normalizedTitle}"`);
        console.log(`   Key: "${key}"`);
    });
    
    // Create maps for comparison
    const wpMoviesMap = new Map();
    wpMovies.forEach(movie => {
        const key = `${normalizeString(movie.title)}_${movie.year}`;
        wpMoviesMap.set(key, movie);
    });
    
    const dbMoviesMap = new Map();
    dbMovies.forEach(movie => {
        const key = `${normalizeString(movie.movieTitle || '')}_${movie.movieYear || ''}`;
        dbMoviesMap.set(key, movie);
    });
    
    console.log('\n🔍 Key Analysis:');
    console.log(`WordPress keys sample:`, Array.from(wpMoviesMap.keys()).slice(0, 5));
    console.log(`Database keys sample:`, Array.from(dbMoviesMap.keys()).slice(0, 5));
    
    // Check for specific missing movies
    const missingInDb = [];
    wpMovies.forEach(wpMovie => {
        const key = `${normalizeString(wpMovie.title)}_${wpMovie.year}`;
        if (!dbMoviesMap.has(key)) {
            missingInDb.push({
                movie: wpMovie,
                key: key
            });
        }
    });
    
    console.log(`\n❌ Found ${missingInDb.length} movies that appear missing in DB`);
    
    if (missingInDb.length > 0) {
        console.log('\n🔍 First 10 "missing" movies:');
        missingInDb.slice(0, 10).forEach((item, i) => {
            console.log(`${i+1}. "${item.movie.title}" (${item.movie.year})`);
            console.log(`   Key: "${item.key}"`);
            
            // Let's try to find similar matches in the database
            const similarMatches = [];
            dbMovies.forEach(dbMovie => {
                const dbTitle = normalizeString(dbMovie.movieTitle || '');
                const wpTitle = normalizeString(item.movie.title);
                
                // Check for title similarity
                if (dbTitle.includes(wpTitle) || wpTitle.includes(dbTitle)) {
                    similarMatches.push({
                        title: dbMovie.movieTitle,
                        year: dbMovie.movieYear,
                        similarity: 'title'
                    });
                }
                
                // Check for year match with different title
                if (dbMovie.movieYear === item.movie.year && dbTitle !== wpTitle) {
                    similarMatches.push({
                        title: dbMovie.movieTitle,
                        year: dbMovie.movieYear,
                        similarity: 'year'
                    });
                }
            });
            
            if (similarMatches.length > 0) {
                console.log(`   Potential matches:`, similarMatches.slice(0, 3));
            }
        });
        
        // Let's also check if there are any exact title matches but different years
        console.log('\n🔍 Checking for year mismatches...');
        missingInDb.slice(0, 5).forEach(item => {
            const wpTitle = normalizeString(item.movie.title);
            const exactTitleMatches = dbMovies.filter(dbMovie => 
                normalizeString(dbMovie.movieTitle || '') === wpTitle
            );
            
            if (exactTitleMatches.length > 0) {
                console.log(`"${item.movie.title}" (WP: ${item.movie.year}) has exact title matches with different years:`);
                exactTitleMatches.forEach(match => {
                    console.log(`   • DB: "${match.movieTitle}" (${match.movieYear})`);
                });
            }
        });
    }
    
    // Let's also check if database has movies that WordPress doesn't
    const missingInWordpress = [];
    dbMovies.forEach(dbMovie => {
        const key = `${normalizeString(dbMovie.movieTitle || '')}_${dbMovie.movieYear || ''}`;
        if (!wpMoviesMap.has(key)) {
            missingInWordpress.push({
                movie: dbMovie,
                key: key
            });
        }
    });
    
    console.log(`\n❌ Found ${missingInWordpress.length} movies in DB that appear missing from WordPress`);
    
    if (missingInWordpress.length > 0) {
        console.log('\nFirst 10 movies in DB but not in WordPress:');
        missingInWordpress.slice(0, 10).forEach((item, i) => {
            console.log(`${i+1}. "${item.movie.movieTitle}" (${item.movie.movieYear})`);
            console.log(`   Key: "${item.key}"`);
        });
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Starting Movie Matching Debug...\n');
    
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Connected to database');
        
        // Debug the matching
        await debugMovieMatching();
        
        console.log('\n✅ Debug complete!');
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the debug
main().catch(console.error);
