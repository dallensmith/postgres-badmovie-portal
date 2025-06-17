#!/usr/bin/env node

/**
 * Deep Movie Analysis Tool
 * 
 * This script performs a more intelligent analysis to find movies that might
 * already exist in the database with slight variations in titles or years.
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
 * Normalize strings for comparison (remove extra spaces, convert to lowercase, remove punctuation)
 */
function normalizeString(str) {
    if (!str) return '';
    return str.trim().toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const s1 = normalizeString(str1);
    const s2 = normalizeString(str2);
    
    if (s1 === s2) return 1.0;
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
    if (len2 === 0) return 0.0;
    
    const matrix = [];
    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    
    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
}

/**
 * Check if two years are close enough to be considered a match
 */
function yearsMatch(year1, year2, tolerance = 2) {
    if (!year1 || !year2) return false;
    const y1 = parseInt(year1);
    const y2 = parseInt(year2);
    return Math.abs(y1 - y2) <= tolerance;
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
 * Find potential matches for a WordPress movie in the database
 */
function findPotentialMatches(wpMovie, dbMovies) {
    const matches = [];
    
    dbMovies.forEach(dbMovie => {
        const titleSimilarity = calculateSimilarity(wpMovie.title, dbMovie.movieTitle || '');
        const yearMatch = yearsMatch(wpMovie.year, dbMovie.movieYear, 2);
        
        // Consider it a potential match if:
        // 1. Title similarity > 0.8 and years match within 2 years, OR
        // 2. Title similarity > 0.9 (very similar titles)
        if ((titleSimilarity > 0.8 && yearMatch) || titleSimilarity > 0.9) {
            matches.push({
                dbMovie,
                titleSimilarity,
                yearMatch,
                yearDiff: Math.abs(parseInt(wpMovie.year) - parseInt(dbMovie.movieYear || 0))
            });
        }
    });
    
    // Sort by title similarity descending
    return matches.sort((a, b) => b.titleSimilarity - a.titleSimilarity);
}

/**
 * Analyze movies more intelligently
 */
async function analyzeMovies() {
    console.log('\n🔍 Performing Deep Movie Analysis...');
    
    // Extract unique movies from WordPress
    const wpMovies = extractUniqueMovies(wordpressData);
    
    // Fetch database movies
    const dbMovies = await prisma.movie.findMany({
        select: {
            id: true,
            movieTitle: true,
            movieYear: true,
            movieTmdbUrl: true,
            movieImdbUrl: true
        }
    });
    
    console.log(`📊 WordPress has ${wpMovies.length} unique movies`);
    console.log(`📊 Database has ${dbMovies.length} movies`);
    
    const analysis = {
        exactMatches: 0,
        likelyMatches: [],
        potentialMatches: [],
        trulyMissing: [],
        duplicatesPossible: []
    };
    
    // Analyze each WordPress movie
    wpMovies.forEach(wpMovie => {
        // First try exact match (title + year within 1 year)
        const exactMatch = dbMovies.find(dbMovie => 
            normalizeString(wpMovie.title) === normalizeString(dbMovie.movieTitle || '') &&
            yearsMatch(wpMovie.year, dbMovie.movieYear, 1)
        );
        
        if (exactMatch) {
            analysis.exactMatches++;
            return;
        }
        
        // Find potential matches
        const potentialMatches = findPotentialMatches(wpMovie, dbMovies);
        
        if (potentialMatches.length === 0) {
            analysis.trulyMissing.push(wpMovie);
        } else if (potentialMatches[0].titleSimilarity > 0.9) {
            analysis.likelyMatches.push({
                wpMovie,
                matches: potentialMatches.slice(0, 3) // Top 3 matches
            });
        } else {
            analysis.potentialMatches.push({
                wpMovie,
                matches: potentialMatches.slice(0, 2) // Top 2 matches
            });
        }
    });
    
    return analysis;
}

/**
 * Generate detailed report
 */
function generateReport(analysis) {
    console.log('\n📋 DEEP MOVIE ANALYSIS REPORT');
    console.log('='.repeat(50));
    
    console.log(`\n✅ Exact matches found: ${analysis.exactMatches}`);
    console.log(`🔍 Likely matches (need review): ${analysis.likelyMatches.length}`);
    console.log(`❓ Potential matches (uncertain): ${analysis.potentialMatches.length}`);
    console.log(`❌ Truly missing movies: ${analysis.trulyMissing.length}`);
    
    if (analysis.likelyMatches.length > 0) {
        console.log(`\n🔍 LIKELY MATCHES (high confidence these are the same movies):`);
        analysis.likelyMatches.slice(0, 20).forEach(item => {
            console.log(`\n   WordPress: "${item.wpMovie.title}" (${item.wpMovie.year})`);
            item.matches.forEach(match => {
                console.log(`   Database:  "${match.dbMovie.movieTitle}" (${match.dbMovie.movieYear}) - ${(match.titleSimilarity * 100).toFixed(1)}% similar`);
            });
        });
        if (analysis.likelyMatches.length > 20) {
            console.log(`   ... and ${analysis.likelyMatches.length - 20} more likely matches`);
        }
    }
    
    if (analysis.potentialMatches.length > 0) {
        console.log(`\n❓ POTENTIAL MATCHES (lower confidence, manual review needed):`);
        analysis.potentialMatches.slice(0, 10).forEach(item => {
            console.log(`\n   WordPress: "${item.wpMovie.title}" (${item.wpMovie.year})`);
            item.matches.forEach(match => {
                console.log(`   Database:  "${match.dbMovie.movieTitle}" (${match.dbMovie.movieYear}) - ${(match.titleSimilarity * 100).toFixed(1)}% similar`);
            });
        });
        if (analysis.potentialMatches.length > 10) {
            console.log(`   ... and ${analysis.potentialMatches.length - 10} more potential matches`);
        }
    }
    
    if (analysis.trulyMissing.length > 0) {
        console.log(`\n❌ TRULY MISSING MOVIES (no similar matches found):`);
        analysis.trulyMissing.forEach(movie => {
            console.log(`   • ${movie.title} (${movie.year}) - in experiments: ${movie.experiments.join(', ')}`);
        });
    }
    
    console.log(`\n📊 SUMMARY:`);
    const totalWpMovies = analysis.exactMatches + analysis.likelyMatches.length + analysis.potentialMatches.length + analysis.trulyMissing.length;
    console.log(`   • ${((analysis.exactMatches / totalWpMovies) * 100).toFixed(1)}% exact matches`);
    console.log(`   • ${((analysis.likelyMatches.length / totalWpMovies) * 100).toFixed(1)}% likely matches (probably already in DB)`);
    console.log(`   • ${((analysis.potentialMatches.length / totalWpMovies) * 100).toFixed(1)}% potential matches (need review)`);
    console.log(`   • ${((analysis.trulyMissing.length / totalWpMovies) * 100).toFixed(1)}% truly missing from database`);
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Starting Deep Movie Analysis...\n');
    
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Connected to database');
        
        // Perform analysis
        const analysis = await analyzeMovies();
        
        // Generate report
        generateReport(analysis);
        
        console.log('\n✅ Deep analysis complete!');
        
    } catch (error) {
        console.error('❌ Error during analysis:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the analysis
main().catch(console.error);
