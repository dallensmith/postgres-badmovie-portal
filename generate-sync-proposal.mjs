#!/usr/bin/env node

/**
 * WordPress to Database Sync Proposal Generator
 * 
 * This script analyzes the discrepancies between WordPress and database,
 * and generates detailed proposals for updates, imports, and fixes.
 */

import { readFileSync, writeFileSync } from 'fs';
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
 * Utility functions
 */
function normalizeString(str) {
    if (!str) return '';
    return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function yearsMatch(year1, year2) {
    if (!year1 || !year2) return false;
    const y1 = parseInt(year1);
    const y2 = parseInt(year2);
    return Math.abs(y1 - y2) <= 1;
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const parsed = new Date(dateStr);
    if (!isNaN(parsed)) {
        return parsed.toISOString().split('T')[0];
    }
    return null;
}

/**
 * Generate missing movies import proposal
 */
async function generateMissingMoviesProposal() {
    console.log('🎬 Analyzing missing movies...');
    
    const dbMovies = await prisma.movie.findMany();
    const wpMovies = [];
    
    // Extract all WordPress movies
    wordpressData.forEach(experiment => {
        experiment.movies.forEach(movie => {
            wpMovies.push({
                ...movie,
                experimentNumber: experiment.experimentNumber,
                experimentTitle: experiment.title
            });
        });
    });
    
    // Group database movies by title for flexible matching
    const dbMoviesByTitle = new Map();
    dbMovies.forEach(movie => {
        const title = normalizeString(movie.movieTitle || '');
        if (!dbMoviesByTitle.has(title)) {
            dbMoviesByTitle.set(title, []);
        }
        dbMoviesByTitle.get(title).push(movie);
    });
    
    // Find missing movies
    const missingMovies = [];
    wpMovies.forEach(wpMovie => {
        const title = normalizeString(wpMovie.title);
        const dbMoviesWithSameTitle = dbMoviesByTitle.get(title) || [];
        
        let found = false;
        for (const dbMovie of dbMoviesWithSameTitle) {
            if (yearsMatch(wpMovie.year, dbMovie.movieYear)) {
                found = true;
                break;
            }
        }
        
        if (!found) {
            missingMovies.push(wpMovie);
        }
    });
    
    // Deduplicate missing movies
    const uniqueMissingMovies = new Map();
    missingMovies.forEach(movie => {
        const key = `${normalizeString(movie.title)}_${movie.year}`;
        if (!uniqueMissingMovies.has(key)) {
            uniqueMissingMovies.set(key, {
                ...movie,
                experiments: [movie.experimentNumber]
            });
        } else {
            uniqueMissingMovies.get(key).experiments.push(movie.experimentNumber);
        }
    });
    
    return Array.from(uniqueMissingMovies.values());
}

/**
 * Generate missing notes update proposal
 */
async function generateMissingNotesProposal() {
    console.log('📝 Analyzing missing notes...');
    
    const dbExperiments = await prisma.experiment.findMany();
    const dbExperimentsMap = new Map();
    dbExperiments.forEach(exp => {
        dbExperimentsMap.set(exp.experimentNumber, exp);
    });
    
    const missingNotes = [];
    wordpressData.forEach(wpExp => {
        const dbExp = dbExperimentsMap.get(wpExp.experimentNumber);
        if (dbExp && wpExp.notes && !dbExp.eventNotes) {
            missingNotes.push({
                experimentNumber: wpExp.experimentNumber,
                title: wpExp.title,
                notes: wpExp.notes,
                databaseId: dbExp.id
            });
        }
    });
    
    return missingNotes;
}

/**
 * Generate image URL update proposal
 */
async function generateImageUpdateProposal() {
    console.log('🖼️ Analyzing image URLs...');
    
    const dbExperiments = await prisma.experiment.findMany();
    const dbExperimentsMap = new Map();
    dbExperiments.forEach(exp => {
        dbExperimentsMap.set(exp.experimentNumber, exp);
    });
    
    const imageUpdates = [];
    wordpressData.forEach(wpExp => {
        const dbExp = dbExperimentsMap.get(wpExp.experimentNumber);
        if (dbExp && wpExp.experimentImage !== dbExp.eventImage) {
            imageUpdates.push({
                experimentNumber: wpExp.experimentNumber,
                title: wpExp.title,
                currentImage: dbExp.eventImage,
                proposedImage: wpExp.experimentImage,
                databaseId: dbExp.id
            });
        }
    });
    
    return imageUpdates;
}

/**
 * Generate movie count discrepancy analysis
 */
async function generateMovieCountAnalysis() {
    console.log('🔍 Analyzing movie count discrepancies...');
    
    const dbExperiments = await prisma.experiment.findMany({
        include: {
            movieExperiments: {
                include: {
                    movie: true
                }
            }
        }
    });
    
    const dbExperimentsMap = new Map();
    dbExperiments.forEach(exp => {
        dbExperimentsMap.set(exp.experimentNumber, exp);
    });
    
    const discrepancies = [];
    wordpressData.forEach(wpExp => {
        const dbExp = dbExperimentsMap.get(wpExp.experimentNumber);
        if (dbExp) {
            const wpMovieCount = wpExp.movies.length;
            const dbMovieCount = dbExp.movieExperiments.length;
            
            if (wpMovieCount !== dbMovieCount) {
                discrepancies.push({
                    experimentNumber: wpExp.experimentNumber,
                    title: wpExp.title,
                    wordpressMovies: wpExp.movies,
                    databaseMovies: dbExp.movieExperiments.map(me => ({
                        title: me.movie.movieTitle,
                        year: me.movie.movieYear,
                        id: me.movie.id
                    })),
                    wordpressCount: wpMovieCount,
                    databaseCount: dbMovieCount,
                    databaseId: dbExp.id
                });
            }
        }
    });
    
    return discrepancies;
}

/**
 * Generate missing experiments proposal
 */
async function generateMissingExperimentsProposal() {
    console.log('📅 Analyzing missing experiments...');
    
    const dbExperiments = await prisma.experiment.findMany();
    const dbExperimentsMap = new Map();
    dbExperiments.forEach(exp => {
        dbExperimentsMap.set(exp.experimentNumber, exp);
    });
    
    const wpExperimentsMap = new Map();
    wordpressData.forEach(exp => {
        wpExperimentsMap.set(exp.experimentNumber, exp);
    });
    
    // Find experiments missing in WordPress (probably newer ones)
    const missingInWordpress = [];
    dbExperiments.forEach(dbExp => {
        if (!wpExperimentsMap.has(dbExp.experimentNumber)) {
            missingInWordpress.push(dbExp);
        }
    });
    
    return { missingInWordpress };
}

/**
 * Generate comprehensive report
 */
async function generateComprehensiveReport() {
    console.log('📊 Generating comprehensive sync proposal...\n');
    
    const [missingMovies, missingNotes, imageUpdates, movieCountDiscrepancies, missingExperiments] = await Promise.all([
        generateMissingMoviesProposal(),
        generateMissingNotesProposal(),
        generateImageUpdateProposal(),
        generateMovieCountAnalysis(),
        generateMissingExperimentsProposal()
    ]);
    
    const report = {
        generatedAt: new Date().toISOString(),
        summary: {
            missingMovies: missingMovies.length,
            missingNotes: missingNotes.length,
            imageUpdates: imageUpdates.length,
            movieCountDiscrepancies: movieCountDiscrepancies.length,
            missingExperiments: missingExperiments.missingInWordpress.length
        },
        proposals: {
            missingMovies,
            missingNotes,
            imageUpdates,
            movieCountDiscrepancies,
            missingExperiments
        }
    };
    
    // Save detailed report to file
    const reportPath = join(__dirname, 'wordpress-database-sync-proposal.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // Generate human-readable summary
    console.log('📋 WORDPRESS TO DATABASE SYNC PROPOSAL');
    console.log('='.repeat(50));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   • Missing Movies: ${missingMovies.length}`);
    console.log(`   • Missing Notes: ${missingNotes.length}`);
    console.log(`   • Image Updates: ${imageUpdates.length}`);
    console.log(`   • Movie Count Issues: ${movieCountDiscrepancies.length}`);
    console.log(`   • Missing Experiments: ${missingExperiments.missingInWordpress.length}`);
    
    // Detailed breakdown
    console.log(`\n🎬 MISSING MOVIES (${missingMovies.length}):`);
    console.log('These movies appear in WordPress but not in the database:');
    missingMovies.slice(0, 20).forEach(movie => {
        console.log(`   • "${movie.title}" (${movie.year}) - Experiments: ${movie.experiments.join(', ')}`);
        if (movie.url) {
            console.log(`     URL: ${movie.url}`);
        }
    });
    if (missingMovies.length > 20) {
        console.log(`   ... and ${missingMovies.length - 20} more (see JSON file for complete list)`);
    }
    
    console.log(`\n📝 MISSING NOTES (${missingNotes.length}):`);
    console.log('These experiments have notes in WordPress but not in database:');
    missingNotes.slice(0, 10).forEach(note => {
        console.log(`   • Exp ${note.experimentNumber}: "${note.notes}"`);
    });
    if (missingNotes.length > 10) {
        console.log(`   ... and ${missingNotes.length - 10} more (see JSON file for complete list)`);
    }
    
    console.log(`\n🖼️ IMAGE UPDATES (${imageUpdates.length}):`);
    console.log('These experiments have different/better images in WordPress:');
    imageUpdates.slice(0, 5).forEach(update => {
        console.log(`   • Exp ${update.experimentNumber}:`);
        console.log(`     Current: ${update.currentImage || 'null'}`);
        console.log(`     Proposed: ${update.proposedImage}`);
    });
    if (imageUpdates.length > 5) {
        console.log(`   ... and ${imageUpdates.length - 5} more (see JSON file for complete list)`);
    }
    
    console.log(`\n🔍 MOVIE COUNT DISCREPANCIES (${movieCountDiscrepancies.length}):`);
    console.log('These experiments have different movie counts between WordPress and database:');
    movieCountDiscrepancies.slice(0, 10).forEach(disc => {
        console.log(`   • Exp ${disc.experimentNumber}: WP=${disc.wordpressCount} vs DB=${disc.databaseCount}`);
        console.log(`     WordPress movies: ${disc.wordpressMovies.map(m => `${m.title} (${m.year})`).join(', ')}`);
        console.log(`     Database movies: ${disc.databaseMovies.map(m => `${m.title} (${m.year})`).join(', ')}`);
    });
    if (movieCountDiscrepancies.length > 10) {
        console.log(`   ... and ${movieCountDiscrepancies.length - 10} more (see JSON file for complete list)`);
    }
    
    console.log(`\n📅 MISSING EXPERIMENTS (${missingExperiments.missingInWordpress.length}):`);
    console.log('These experiments are in database but not in WordPress (likely newer):');
    missingExperiments.missingInWordpress.forEach(exp => {
        console.log(`   • Exp ${exp.experimentNumber}: ${exp.eventHost} on ${exp.eventDate?.toDateString()}`);
    });
    
    console.log(`\n💾 Full detailed report saved to: ${reportPath}`);
    
    // Generate SQL/Prisma proposals
    console.log(`\n🛠️  PROPOSED ACTIONS:`);
    console.log(`   1. Import ${missingMovies.length} missing movies`);
    console.log(`   2. Update ${missingNotes.length} experiment notes`);
    console.log(`   3. Update ${imageUpdates.length} experiment images`);
    console.log(`   4. Investigate ${movieCountDiscrepancies.length} movie count discrepancies`);
    console.log(`   5. Consider updating WordPress with ${missingExperiments.missingInWordpress.length} newer experiments`);
    
    return report;
}

/**
 * Main execution
 */
async function main() {
    try {
        await prisma.$connect();
        const report = await generateComprehensiveReport();
        
        console.log('\n✅ Sync proposal generation complete!');
        console.log('\nNext steps:');
        console.log('1. Review the generated JSON file for complete details');
        console.log('2. Decide which updates to apply');
        console.log('3. Run targeted sync scripts for approved changes');
        
    } catch (error) {
        console.error('❌ Error generating sync proposal:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
