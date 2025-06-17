#!/usr/bin/env node

/**
 * WordPress Database Sync Master Script
 * 
 * This script provides a menu-driven interface to review and apply
 * all WordPress to database sync operations.
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
 * Display the main menu
 */
function displayMenu() {
    console.clear();
    console.log('🔄 WORDPRESS → DATABASE SYNC OPERATIONS');
    console.log('='.repeat(50));
    console.log(`📊 Data generated: ${new Date(syncProposal.generatedAt).toLocaleString()}`);
    console.log('\n📈 SUMMARY:');
    console.log(`   • Missing Movies: ${syncProposal.summary.missingMovies}`);
    console.log(`   • Missing Notes: ${syncProposal.summary.missingNotes}`);
    console.log(`   • Image Updates: ${syncProposal.summary.imageUpdates}`);
    console.log(`   • Movie Count Issues: ${syncProposal.summary.movieCountDiscrepancies}`);
    console.log(`   • Missing Experiments: ${syncProposal.summary.missingExperiments}`);
    
    console.log('\n🛠️  AVAILABLE OPERATIONS:');
    console.log('1. 🎬 Import Missing Movies (97 movies)');
    console.log('2. 📝 Update Missing Notes (95 experiments)');
    console.log('3. 🖼️  Update Experiment Images (196 experiments)');
    console.log('4. 🔗 Link Movies to Experiments');
    console.log('5. 🔍 Investigate Movie Count Discrepancies (28 experiments)');
    console.log('6. 📋 View Detailed Report');
    console.log('7. 🎯 Quick Start: Essential Updates Only');
    console.log('8. 🚀 Full Sync: Apply All Updates');
    console.log('9. ❌ Exit');
}

/**
 * Show detailed information about missing movies
 */
function showMissingMoviesDetails() {
    console.log('\n🎬 MISSING MOVIES DETAILS');
    console.log('='.repeat(40));
    
    const missingMovies = syncProposal.proposals.missingMovies;
    console.log(`Total: ${missingMovies.length} movies\n`);
    
    missingMovies.slice(0, 10).forEach((movie, index) => {
        console.log(`${index + 1}. "${movie.title}" (${movie.year})`);
        console.log(`   Experiments: ${movie.experiments.join(', ')}`);
        console.log(`   URL: ${movie.url || 'None'}`);
        console.log('');
    });
    
    if (missingMovies.length > 10) {
        console.log(`... and ${missingMovies.length - 10} more movies`);
    }
    
    console.log('\n📋 OPERATIONS:');
    console.log('• DRY RUN: node import-missing-movies.mjs --dry-run');
    console.log('• EXECUTE: node import-missing-movies.mjs --execute');
    console.log('• LINK: node link-movies-to-experiments.mjs --execute');
}

/**
 * Show movie count discrepancies
 */
function showMovieCountDiscrepancies() {
    console.log('\n🔍 MOVIE COUNT DISCREPANCIES');
    console.log('='.repeat(40));
    
    const discrepancies = syncProposal.proposals.movieCountDiscrepancies;
    console.log(`Total: ${discrepancies.length} experiments with mismatched movie counts\n`);
    
    discrepancies.slice(0, 5).forEach((disc, index) => {
        console.log(`${index + 1}. Experiment ${disc.experimentNumber}: ${disc.title}`);
        console.log(`   WordPress: ${disc.wordpressCount} movies`);
        console.log(`   Database: ${disc.databaseCount} movies`);
        console.log(`   WP Movies: ${disc.wordpressMovies.map(m => `${m.title} (${m.year})`).join(', ')}`);
        console.log(`   DB Movies: ${disc.databaseMovies.map(m => `${m.title} (${m.year})`).join(', ')}`);
        console.log('');
    });
    
    if (discrepancies.length > 5) {
        console.log(`... and ${discrepancies.length - 5} more discrepancies`);
    }
    
    console.log('\n💡 ANALYSIS:');
    console.log('These discrepancies could indicate:');
    console.log('• Movies that need to be imported and linked');
    console.log('• Movies that were manually added to database');
    console.log('• Different movie versions or interpretations');
    console.log('• Data entry errors that need manual review');
}

/**
 * Execute a command with real-time output
 */
function executeCommand(command, description) {
    console.log(`\n🚀 ${description}`);
    console.log(`Command: ${command}`);
    console.log('='.repeat(50));
    
    try {
        execSync(command, { stdio: 'inherit', cwd: __dirname });
        console.log('\n✅ Command completed successfully');
    } catch (error) {
        console.log('\n❌ Command failed');
        console.error(error.message);
    }
}

/**
 * Quick start: essential updates only
 */
function quickStart() {
    console.log('\n🎯 QUICK START: ESSENTIAL UPDATES');
    console.log('='.repeat(40));
    console.log('This will perform the most critical updates:');
    console.log('1. Import missing movies');
    console.log('2. Link movies to experiments');
    console.log('3. Update missing notes');
    console.log('4. Update missing images only');
    
    console.log('\nPress any key to continue or Ctrl+C to cancel...');
    
    // In a real interactive script, you'd wait for input here
    // For now, let's show the commands they should run
    console.log('\n📋 RUN THESE COMMANDS IN ORDER:');
    console.log('1. node import-missing-movies.mjs --execute');
    console.log('2. node link-movies-to-experiments.mjs --execute');
    console.log('3. node update-missing-notes.mjs --execute');
    console.log('4. node update-experiment-images.mjs --execute --only-missing');
}

/**
 * Full sync: all updates
 */
function fullSync() {
    console.log('\n🚀 FULL SYNC: ALL UPDATES');
    console.log('='.repeat(40));
    console.log('This will perform ALL available updates:');
    console.log('1. Import missing movies');
    console.log('2. Link movies to experiments');
    console.log('3. Update missing notes');
    console.log('4. Update all experiment images');
    
    console.log('\n⚠️  WARNING: This will make extensive changes to your database!');
    console.log('Make sure you have a backup before proceeding.');
    
    console.log('\n📋 RUN THESE COMMANDS IN ORDER:');
    console.log('1. node import-missing-movies.mjs --execute');
    console.log('2. node link-movies-to-experiments.mjs --execute');
    console.log('3. node update-missing-notes.mjs --execute');
    console.log('4. node update-experiment-images.mjs --execute');
}

/**
 * Main execution
 */
function main() {
    displayMenu();
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('');
    console.log('🥇 HIGH PRIORITY:');
    console.log('   • Import missing movies and link them to experiments');
    console.log('   • Update missing notes (valuable metadata)');
    console.log('');
    console.log('🥈 MEDIUM PRIORITY:'); 
    console.log('   • Update missing images (improves user experience)');
    console.log('   • Investigate movie count discrepancies');
    console.log('');
    console.log('🥉 LOW PRIORITY:');
    console.log('   • Update all images (mostly resolution improvements)');
    
    console.log('\n🚀 TO GET STARTED:');
    console.log('');
    console.log('1. PREVIEW CHANGES:');
    console.log('   node import-missing-movies.mjs --dry-run');
    console.log('');
    console.log('2. APPLY ESSENTIAL UPDATES:');
    console.log('   node import-missing-movies.mjs --execute');
    console.log('   node link-movies-to-experiments.mjs --execute');
    console.log('   node update-missing-notes.mjs --execute');
    console.log('');
    console.log('3. VERIFY RESULTS:');
    console.log('   node compare-wordpress-database.mjs');
    
    console.log('\n📄 DETAILED REPORT: wordpress-database-sync-proposal.json');
}

main();
