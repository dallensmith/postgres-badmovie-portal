#!/usr/bin/env node

/**
 * Link Movies to Experiments Script
 * 
 * This script creates MovieExperiment relationships for newly imported movies.
 * Run with --dry-run to preview changes, or --execute to apply them.
 */

import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldExecute = args.includes('--execute');

if (!isDryRun && !shouldExecute) {
    console.log('❌ Please specify either --dry-run or --execute');
    console.log('Usage: node link-movies-to-experiments.mjs [--dry-run|--execute]');
    process.exit(1);
}

// Load the sync proposal
let syncProposal;
try {
    const data = readFileSync(join(__dirname, 'wordpress-database-sync-proposal.json'), 'utf8');
    syncProposal = JSON.parse(data);
} catch (error) {
    console.error('❌ Error loading sync proposal. Run generate-sync-proposal.mjs first.');
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

/**
 * Link movies to experiments
 */
async function linkMoviesToExperiments() {
    const missingMovies = syncProposal.proposals.missingMovies;
    
    console.log(`🔗 ${isDryRun ? 'DRY RUN:' : 'EXECUTING:'} Link ${missingMovies.length} movies to experiments`);
    console.log('='.repeat(70));
    
    // Get all movies and experiments from database
    const dbMovies = await prisma.movie.findMany();
    const dbExperiments = await prisma.experiment.findMany();
    
    // Create lookup maps
    const moviesByTitle = new Map();
    dbMovies.forEach(movie => {
        const title = normalizeString(movie.movieTitle || '');
        if (!moviesByTitle.has(title)) {
            moviesByTitle.set(title, []);
        }
        moviesByTitle.get(title).push(movie);
    });
    
    const experimentsMap = new Map();
    dbExperiments.forEach(exp => {
        experimentsMap.set(exp.experimentNumber, exp);
    });
    
    const linkResults = [];
    
    for (const wpMovie of missingMovies) {
        console.log(`\n🎬 "${wpMovie.title}" (${wpMovie.year})`);
        console.log(`   Should be in experiments: ${wpMovie.experiments.join(', ')}`);
        
        // Find the movie in database
        const title = normalizeString(wpMovie.title);
        const candidateMovies = moviesByTitle.get(title) || [];
        
        let dbMovie = null;
        for (const candidate of candidateMovies) {
            if (yearsMatch(wpMovie.year, candidate.movieYear)) {
                dbMovie = candidate;
                break;
            }
        }
        
        if (!dbMovie) {
            console.log(`   ❌ Movie not found in database. Import it first.`);
            linkResults.push({
                movie: wpMovie.title,
                year: wpMovie.year,
                status: 'movie-not-found'
            });
            continue;
        }
        
        console.log(`   ✅ Found movie in database (ID: ${dbMovie.id})`);
        
        // Link to each experiment
        for (const expNumber of wpMovie.experiments) {
            const experiment = experimentsMap.get(expNumber);
            
            if (!experiment) {
                console.log(`   ❌ Experiment ${expNumber} not found in database`);
                linkResults.push({
                    movie: wpMovie.title,
                    experiment: expNumber,
                    status: 'experiment-not-found'
                });
                continue;
            }
            
            console.log(`   🔗 Linking to experiment ${expNumber} (ID: ${experiment.id})`);
            
            if (shouldExecute) {
                try {
                    // Check if link already exists
                    const existingLink = await prisma.movieExperiment.findUnique({
                        where: {
                            movieId_experimentId: {
                                movieId: dbMovie.id,
                                experimentId: experiment.id
                            }
                        }
                    });
                    
                    if (existingLink) {
                        console.log(`   ⚠️  Link already exists`);
                        linkResults.push({
                            movie: wpMovie.title,
                            experiment: expNumber,
                            status: 'already-linked'
                        });
                    } else {
                        const movieExperiment = await prisma.movieExperiment.create({
                            data: {
                                movieId: dbMovie.id,
                                experimentId: experiment.id
                            }
                        });
                        
                        console.log(`   ✅ Created link (ID: ${movieExperiment.id})`);
                        linkResults.push({
                            movie: wpMovie.title,
                            experiment: expNumber,
                            status: 'success',
                            linkId: movieExperiment.id
                        });
                    }
                } catch (error) {
                    console.log(`   ❌ Error creating link: ${error.message}`);
                    linkResults.push({
                        movie: wpMovie.title,
                        experiment: expNumber,
                        status: 'error',
                        error: error.message
                    });
                }
            } else {
                console.log(`   📋 Would create MovieExperiment link`);
                linkResults.push({
                    movie: wpMovie.title,
                    experiment: expNumber,
                    status: 'dry-run'
                });
            }
        }
    }
    
    // Summary
    console.log(`\n📊 LINKING SUMMARY:`);
    if (shouldExecute) {
        const successful = linkResults.filter(r => r.status === 'success').length;
        const alreadyLinked = linkResults.filter(r => r.status === 'already-linked').length;
        const failed = linkResults.filter(r => r.status === 'error').length;
        const movieNotFound = linkResults.filter(r => r.status === 'movie-not-found').length;
        
        console.log(`   ✅ Successfully linked: ${successful}`);
        console.log(`   ⚠️  Already linked: ${alreadyLinked}`);
        console.log(`   ❌ Failed to link: ${failed}`);
        console.log(`   🔍 Movies not found: ${movieNotFound}`);
        
        if (failed > 0) {
            console.log(`\n❌ FAILED LINKS:`);
            linkResults.filter(r => r.status === 'error').forEach(result => {
                console.log(`   • ${result.movie} → Exp ${result.experiment}: ${result.error}`);
            });
        }
        
        if (movieNotFound > 0) {
            console.log(`\n🔍 MOVIES NOT FOUND:`);
            const uniqueNotFound = [...new Set(linkResults.filter(r => r.status === 'movie-not-found').map(r => `${r.movie} (${r.year})`))];
            uniqueNotFound.forEach(movie => {
                console.log(`   • ${movie}`);
            });
            console.log(`   💡 Run import-missing-movies.mjs first to import these movies`);
        }
    } else {
        console.log(`   📋 ${linkResults.length} links ready for creation`);
        console.log(`   💡 Run with --execute to apply changes`);
    }
    
    return linkResults;
}

/**
 * Main execution
 */
async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to database\n');
        
        const results = await linkMoviesToExperiments();
        
        console.log('\n✅ Movie linking operation complete!');
        
    } catch (error) {
        console.error('❌ Error during movie linking:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
