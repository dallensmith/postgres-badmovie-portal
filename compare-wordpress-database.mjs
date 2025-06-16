#!/usr/bin/env node

/**
 * WordPress to Database Comparison Tool
 * 
 * This script compares the scraped WordPress data with the current PostgreSQL database
 * to identify discrepancies in experiments, movies, and other data.
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
 * Parse date from various formats to ISO date
 */
function parseDate(dateStr) {
    if (!dateStr) return null;
    
    // Handle "Dec 19, 2021" format
    const parsed = new Date(dateStr);
    if (!isNaN(parsed)) {
        return parsed.toISOString().split('T')[0]; // Return YYYY-MM-DD
    }
    
    return null;
}

/**
 * Check if two years are close enough to be considered a match
 */
function yearsMatch(year1, year2) {
    if (!year1 || !year2) return false;
    const y1 = parseInt(year1);
    const y2 = parseInt(year2);
    return Math.abs(y1 - y2) <= 1; // Allow 1 year difference
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
 * Compare experiments between WordPress and database
 */
async function compareExperiments() {
    console.log('\n🔍 Comparing Experiments...');
    
    // Fetch database experiments
    const dbExperiments = await prisma.experiment.findMany({
        include: {
            movieExperiments: {
                include: {
                    movie: true
                }
            }
        }
    });
    
    console.log(`📊 Database has ${dbExperiments.length} experiments`);
    console.log(`📊 WordPress has ${wordpressData.length} experiments`);
    
    const discrepancies = {
        missingInDb: [],
        missingInWordpress: [],
        dateMismatches: [],
        hostMismatches: [],
        imageMismatches: [],
        notesMismatches: [],
        movieCountMismatches: []
    };
    
    // Create maps for quick lookup
    const dbExperimentsMap = new Map();
    dbExperiments.forEach(exp => {
        dbExperimentsMap.set(exp.experimentNumber, exp);
    });
    
    const wpExperimentsMap = new Map();
    wordpressData.forEach(exp => {
        wpExperimentsMap.set(exp.experimentNumber, exp);
    });
    
    // Check for experiments missing in database
    wordpressData.forEach(wpExp => {
        if (!dbExperimentsMap.has(wpExp.experimentNumber)) {
            discrepancies.missingInDb.push(wpExp);
        }
    });
    
    // Check for experiments missing in WordPress
    dbExperiments.forEach(dbExp => {
        if (!wpExperimentsMap.has(dbExp.experimentNumber)) {
            discrepancies.missingInWordpress.push(dbExp);
        }
    });
    
    // Compare existing experiments
    wordpressData.forEach(wpExp => {
        const dbExp = dbExperimentsMap.get(wpExp.experimentNumber);
        if (dbExp) {
            // Compare dates
            const wpDate = parseDate(wpExp.date);
            const dbDate = dbExp.eventDate ? dbExp.eventDate.toISOString().split('T')[0] : null;
            if (wpDate && dbDate && wpDate !== dbDate) {
                discrepancies.dateMismatches.push({
                    experiment: wpExp.experimentNumber,
                    wordpress: wpExp.date,
                    database: dbDate
                });
            }
            
            // Compare hosts
            if (normalizeString(wpExp.host) !== normalizeString(dbExp.eventHost)) {
                discrepancies.hostMismatches.push({
                    experiment: wpExp.experimentNumber,
                    wordpress: wpExp.host,
                    database: dbExp.eventHost
                });
            }
            
            // Compare images
            if (wpExp.experimentImage !== dbExp.eventImage) {
                discrepancies.imageMismatches.push({
                    experiment: wpExp.experimentNumber,
                    wordpress: wpExp.experimentImage,
                    database: dbExp.eventImage
                });
            }
            
            // Compare notes
            if (normalizeString(wpExp.notes || '') !== normalizeString(dbExp.eventNotes || '')) {
                discrepancies.notesMismatches.push({
                    experiment: wpExp.experimentNumber,
                    wordpress: wpExp.notes || '',
                    database: dbExp.eventNotes || ''
                });
            }
            
            // Compare movie counts
            const wpMovieCount = wpExp.movies.length;
            const dbMovieCount = dbExp.movieExperiments.length;
            if (wpMovieCount !== dbMovieCount) {
                discrepancies.movieCountMismatches.push({
                    experiment: wpExp.experimentNumber,
                    wordpress: wpMovieCount,
                    database: dbMovieCount
                });
            }
        }
    });
    
    return discrepancies;
}

/**
 * Compare movies between WordPress and database
 */
async function compareMovies() {
    console.log('\n🔍 Comparing Movies...');
    
    // Extract unique movies from WordPress
    const wpMovies = extractUniqueMovies(wordpressData);
    
    // Fetch database movies
    const dbMovies = await prisma.movie.findMany({
        include: {
            movieExperiments: {
                include: {
                    experiment: true
                }
            }
        }
    });
    
    console.log(`📊 WordPress has ${wpMovies.length} unique movies`);
    console.log(`📊 Database has ${dbMovies.length} movies`);
    
    const discrepancies = {
        missingInDb: [],
        missingInWordpress: [],
        yearMismatches: [],
        tmdbUrlMismatches: []
    };
    
    // Create more flexible matching for movies
    const wpMoviesByTitle = new Map();
    wpMovies.forEach(movie => {
        const title = normalizeString(movie.title);
        if (!wpMoviesByTitle.has(title)) {
            wpMoviesByTitle.set(title, []);
        }
        wpMoviesByTitle.get(title).push(movie);
    });
    
    const dbMoviesByTitle = new Map();
    dbMovies.forEach(movie => {
        const title = normalizeString(movie.movieTitle || '');
        if (!dbMoviesByTitle.has(title)) {
            dbMoviesByTitle.set(title, []);
        }
        dbMoviesByTitle.get(title).push(movie);
    });
    
    // Check for movies missing in database
    wpMovies.forEach(wpMovie => {
        const title = normalizeString(wpMovie.title);
        const dbMoviesWithSameTitle = dbMoviesByTitle.get(title) || [];
        
        // Look for exact match first, then fuzzy year match
        let found = false;
        for (const dbMovie of dbMoviesWithSameTitle) {
            if (yearsMatch(wpMovie.year, dbMovie.movieYear)) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            discrepancies.missingInDb.push(wpMovie);
        }
    });
    
    // Check for movies missing in WordPress
    dbMovies.forEach(dbMovie => {
        const title = normalizeString(dbMovie.movieTitle || '');
        const wpMoviesWithSameTitle = wpMoviesByTitle.get(title) || [];
        
        // Look for exact match first, then fuzzy year match
        let found = false;
        for (const wpMovie of wpMoviesWithSameTitle) {
            if (yearsMatch(wpMovie.year, dbMovie.movieYear)) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            discrepancies.missingInWordpress.push(dbMovie);
        }
    });
    
    // Compare existing movies for year mismatches (but within tolerance)
    wpMovies.forEach(wpMovie => {
        const title = normalizeString(wpMovie.title);
        const dbMoviesWithSameTitle = dbMoviesByTitle.get(title) || [];
        
        for (const dbMovie of dbMoviesWithSameTitle) {
            if (yearsMatch(wpMovie.year, dbMovie.movieYear)) {
                // Found a match, check for year differences
                if (wpMovie.year !== dbMovie.movieYear) {
                    discrepancies.yearMismatches.push({
                        title: wpMovie.title,
                        wordpress: wpMovie.year,
                        database: dbMovie.movieYear
                    });
                }
                
                // Compare TMDb URLs
                if (wpMovie.tmdbUrl && wpMovie.tmdbUrl !== dbMovie.movieTmdbUrl) {
                    discrepancies.tmdbUrlMismatches.push({
                        title: wpMovie.title,
                        year: wpMovie.year,
                        wordpress: wpMovie.tmdbUrl,
                        database: dbMovie.movieTmdbUrl
                    });
                }
                break;
            }
        }
    });
    
    return discrepancies;
}

/**
 * Generate detailed report
 */
function generateReport(experimentDiscrepancies, movieDiscrepancies) {
    console.log('\n📋 DETAILED COMPARISON REPORT');
    console.log('='.repeat(50));
    
    // Experiment discrepancies
    console.log('\n🎬 EXPERIMENT DISCREPANCIES:');
    
    if (experimentDiscrepancies.missingInDb.length > 0) {
        console.log(`\n❌ Experiments missing in database (${experimentDiscrepancies.missingInDb.length}):`);
        experimentDiscrepancies.missingInDb.forEach(exp => {
            console.log(`   • ${exp.experimentNumber}: ${exp.title} (${exp.date})`);
        });
    }
    
    if (experimentDiscrepancies.missingInWordpress.length > 0) {
        console.log(`\n❌ Experiments missing in WordPress (${experimentDiscrepancies.missingInWordpress.length}):`);
        experimentDiscrepancies.missingInWordpress.forEach(exp => {
            console.log(`   • ${exp.experimentNumber}: ${exp.eventHost} (${exp.eventDate})`);
        });
    }
    
    if (experimentDiscrepancies.dateMismatches.length > 0) {
        console.log(`\n📅 Date mismatches (${experimentDiscrepancies.dateMismatches.length}):`);
        experimentDiscrepancies.dateMismatches.forEach(mismatch => {
            console.log(`   • ${mismatch.experiment}: WP="${mismatch.wordpress}" vs DB="${mismatch.database}"`);
        });
    }
    
    if (experimentDiscrepancies.hostMismatches.length > 0) {
        console.log(`\n👤 Host mismatches (${experimentDiscrepancies.hostMismatches.length}):`);
        experimentDiscrepancies.hostMismatches.forEach(mismatch => {
            console.log(`   • ${mismatch.experiment}: WP="${mismatch.wordpress}" vs DB="${mismatch.database}"`);
        });
    }
    
    if (experimentDiscrepancies.imageMismatches.length > 0) {
        console.log(`\n🖼️ Image mismatches (${experimentDiscrepancies.imageMismatches.length}):`);
        experimentDiscrepancies.imageMismatches.slice(0, 10).forEach(mismatch => {
            console.log(`   • ${mismatch.experiment}:`);
            console.log(`     WP: ${mismatch.wordpress || 'null'}`);
            console.log(`     DB: ${mismatch.database || 'null'}`);
        });
        if (experimentDiscrepancies.imageMismatches.length > 10) {
            console.log(`   ... and ${experimentDiscrepancies.imageMismatches.length - 10} more`);
        }
    }
    
    if (experimentDiscrepancies.notesMismatches.length > 0) {
        console.log(`\n📝 Notes mismatches (${experimentDiscrepancies.notesMismatches.length}):`);
        experimentDiscrepancies.notesMismatches.slice(0, 5).forEach(mismatch => {
            console.log(`   • ${mismatch.experiment}:`);
            console.log(`     WP: "${mismatch.wordpress}"`);
            console.log(`     DB: "${mismatch.database}"`);
        });
        if (experimentDiscrepancies.notesMismatches.length > 5) {
            console.log(`   ... and ${experimentDiscrepancies.notesMismatches.length - 5} more`);
        }
    }
    
    if (experimentDiscrepancies.movieCountMismatches.length > 0) {
        console.log(`\n🎥 Movie count mismatches (${experimentDiscrepancies.movieCountMismatches.length}):`);
        experimentDiscrepancies.movieCountMismatches.forEach(mismatch => {
            console.log(`   • ${mismatch.experiment}: WP=${mismatch.wordpress} vs DB=${mismatch.database}`);
        });
    }
    
    // Movie discrepancies
    console.log('\n🎬 MOVIE DISCREPANCIES:');
    
    if (movieDiscrepancies.missingInDb.length > 0) {
        console.log(`\n❌ Movies missing in database (${movieDiscrepancies.missingInDb.length}):`);
        movieDiscrepancies.missingInDb.slice(0, 20).forEach(movie => {
            console.log(`   • ${movie.title} (${movie.year}) - in experiments: ${movie.experiments.join(', ')}`);
        });
        if (movieDiscrepancies.missingInDb.length > 20) {
            console.log(`   ... and ${movieDiscrepancies.missingInDb.length - 20} more`);
        }
    }
    
    if (movieDiscrepancies.missingInWordpress.length > 0) {
        console.log(`\n❌ Movies missing in WordPress (${movieDiscrepancies.missingInWordpress.length}):`);
        movieDiscrepancies.missingInWordpress.slice(0, 20).forEach(movie => {
            console.log(`   • ${movie.movieTitle} (${movie.movieYear})`);
        });
        if (movieDiscrepancies.missingInWordpress.length > 20) {
            console.log(`   ... and ${movieDiscrepancies.missingInWordpress.length - 20} more`);
        }
    }
    
    if (movieDiscrepancies.yearMismatches.length > 0) {
        console.log(`\n📅 Year mismatches (within 1 year tolerance) (${movieDiscrepancies.yearMismatches.length}):`);
        movieDiscrepancies.yearMismatches.slice(0, 10).forEach(mismatch => {
            console.log(`   • ${mismatch.title}: WP=${mismatch.wordpress} vs DB=${mismatch.database}`);
        });
        if (movieDiscrepancies.yearMismatches.length > 10) {
            console.log(`   ... and ${movieDiscrepancies.yearMismatches.length - 10} more`);
        }
    }
    
    if (movieDiscrepancies.tmdbUrlMismatches.length > 0) {
        console.log(`\n🔗 TMDb URL mismatches (${movieDiscrepancies.tmdbUrlMismatches.length}):`);
        movieDiscrepancies.tmdbUrlMismatches.slice(0, 10).forEach(mismatch => {
            console.log(`   • ${mismatch.title} (${mismatch.year}):`);
            console.log(`     WP: ${mismatch.wordpress}`);
            console.log(`     DB: ${mismatch.database || 'null'}`);
        });
        if (movieDiscrepancies.tmdbUrlMismatches.length > 10) {
            console.log(`   ... and ${movieDiscrepancies.tmdbUrlMismatches.length - 10} more`);
        }
    }
}

/**
 * Generate summary statistics
 */
function generateSummary(experimentDiscrepancies, movieDiscrepancies) {
    console.log('\n📊 SUMMARY STATISTICS');
    console.log('='.repeat(30));
    
    const totalExpDiscrepancies = Object.values(experimentDiscrepancies).reduce((sum, arr) => sum + arr.length, 0);
    const totalMovieDiscrepancies = Object.values(movieDiscrepancies).reduce((sum, arr) => sum + arr.length, 0);
    
    console.log(`🎬 Experiment Issues: ${totalExpDiscrepancies}`);
    console.log(`   • Missing in DB: ${experimentDiscrepancies.missingInDb.length}`);
    console.log(`   • Missing in WP: ${experimentDiscrepancies.missingInWordpress.length}`);
    console.log(`   • Date mismatches: ${experimentDiscrepancies.dateMismatches.length}`);
    console.log(`   • Host mismatches: ${experimentDiscrepancies.hostMismatches.length}`);
    console.log(`   • Image mismatches: ${experimentDiscrepancies.imageMismatches.length}`);
    console.log(`   • Notes mismatches: ${experimentDiscrepancies.notesMismatches.length}`);
    console.log(`   • Movie count mismatches: ${experimentDiscrepancies.movieCountMismatches.length}`);
    
    console.log(`\n🎥 Movie Issues: ${totalMovieDiscrepancies}`);
    console.log(`   • Missing in DB: ${movieDiscrepancies.missingInDb.length}`);
    console.log(`   • Missing in WP: ${movieDiscrepancies.missingInWordpress.length}`);
    console.log(`   • Year mismatches: ${movieDiscrepancies.yearMismatches.length}`);
    console.log(`   • TMDb URL mismatches: ${movieDiscrepancies.tmdbUrlMismatches.length}`);
    
    console.log(`\n📈 Overall Status:`);
    if (totalExpDiscrepancies === 0 && totalMovieDiscrepancies === 0) {
        console.log(`   ✅ Perfect sync! No discrepancies found.`);
    } else {
        console.log(`   ⚠️  Found ${totalExpDiscrepancies + totalMovieDiscrepancies} total discrepancies that need attention.`);
    }
}

/**
 * Main execution function
 */
async function main() {
    console.log('🚀 Starting WordPress to Database Comparison...\n');
    
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Connected to database');
        
        // Perform comparisons
        const experimentDiscrepancies = await compareExperiments();
        const movieDiscrepancies = await compareMovies();
        
        // Generate reports
        generateSummary(experimentDiscrepancies, movieDiscrepancies);
        generateReport(experimentDiscrepancies, movieDiscrepancies);
        
        console.log('\n✅ Comparison complete!');
        
    } catch (error) {
        console.error('❌ Error during comparison:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the comparison
main().catch(console.error);
