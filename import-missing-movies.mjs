#!/usr/bin/env node

/**
 * Import Missing Movies Script
 * 
 * This script imports movies that exist in WordPress but not in the database.
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
    console.log('Usage: node import-missing-movies.mjs [--dry-run|--execute]');
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
 * Extract IMDb ID from URL
 */
function extractImdbId(url) {
    if (!url) return null;
    const match = url.match(/\/title\/(tt\d+)/);
    return match ? match[1] : null;
}

/**
 * Generate a slug from title
 */
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim('-');
}

/**
 * Import missing movies
 */
async function importMissingMovies() {
    const missingMovies = syncProposal.proposals.missingMovies;
    
    console.log(`🎬 ${isDryRun ? 'DRY RUN:' : 'EXECUTING:'} Import ${missingMovies.length} missing movies`);
    console.log('='.repeat(70));
    
    const importResults = [];
    
    for (const movie of missingMovies) {
        const movieData = {
            movieTitle: movie.title,
            movieYear: movie.year,
            movieImdbUrl: movie.url,
            movieImdbId: extractImdbId(movie.url),
            slug: generateSlug(movie.title),
            syncStatus: 'pending'
        };
        
        console.log(`\n📽️  "${movie.title}" (${movie.year})`);
        console.log(`   Experiments: ${movie.experiments.join(', ')}`);
        console.log(`   IMDb: ${movie.url || 'None'}`);
        console.log(`   Slug: ${movieData.slug}`);
        
        if (shouldExecute) {
            try {
                const createdMovie = await prisma.movie.create({
                    data: movieData
                });
                
                console.log(`   ✅ Created movie with ID: ${createdMovie.id}`);
                importResults.push({
                    movie: movie.title,
                    year: movie.year,
                    databaseId: createdMovie.id,
                    status: 'success'
                });
            } catch (error) {
                console.log(`   ❌ Error creating movie: ${error.message}`);
                importResults.push({
                    movie: movie.title,
                    year: movie.year,
                    status: 'error',
                    error: error.message
                });
            }
        } else {
            console.log(`   📋 Would create movie with data:`, JSON.stringify(movieData, null, 6));
            importResults.push({
                movie: movie.title,
                year: movie.year,
                status: 'dry-run'
            });
        }
    }
    
    // Summary
    console.log(`\n📊 IMPORT SUMMARY:`);
    if (shouldExecute) {
        const successful = importResults.filter(r => r.status === 'success').length;
        const failed = importResults.filter(r => r.status === 'error').length;
        console.log(`   ✅ Successfully imported: ${successful}`);
        console.log(`   ❌ Failed to import: ${failed}`);
        
        if (failed > 0) {
            console.log(`\n❌ FAILED IMPORTS:`);
            importResults.filter(r => r.status === 'error').forEach(result => {
                console.log(`   • ${result.movie} (${result.year}): ${result.error}`);
            });
        }
    } else {
        console.log(`   📋 ${importResults.length} movies ready for import`);
        console.log(`   💡 Run with --execute to apply changes`);
    }
    
    return importResults;
}

/**
 * Main execution
 */
async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to database\n');
        
        const results = await importMissingMovies();
        
        console.log('\n✅ Movie import operation complete!');
        
        if (shouldExecute) {
            console.log('\n🔗 NEXT STEPS:');
            console.log('1. Link imported movies to experiments using link-movies-to-experiments.mjs');
            console.log('2. Optionally sync with TMDb for additional metadata');
            console.log('3. Update experiment movie counts');
        }
        
    } catch (error) {
        console.error('❌ Error during movie import:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
