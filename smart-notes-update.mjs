#!/usr/bin/env node

/**
 * Smart Notes Analysis and Update Script
 * 
 * This script analyzes experiment notes from WordPress and categorizes them
 * based on the user's criteria, then updates only the meaningful notes.
 */

import { readFileSync, writeFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

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
 * Categorize notes based on user criteria
 */
function categorizeNotes(missingNotes) {
    const categories = {
        ignore_aka: [],           // "aka [movie title]" - alternate movie names
        ignore_encore: [],        // "encore" - already handled in database
        movie_3d: [],            // "(3D)" - movies shown in 3D
        birthday_notes: [],      // Notes mentioning birthdays
        game_winners: [],        // Quiplash/Murder winners etc.
        meaningful_notes: [],    // Other meaningful notes
        ignore_other: []         // Other notes to ignore
    };
    
    missingNotes.forEach(note => {
        const noteText = note.notes.toLowerCase().trim();
        const originalText = note.notes.trim();
        
        // Check for "aka" patterns
        if (noteText.includes('aka ') || noteText.startsWith('"') && noteText.includes('"')) {
            categories.ignore_aka.push({...note, reason: 'Alternate movie name'});
        }
        // Check for encore patterns
        else if (noteText.includes('encore') || noteText.includes('– encore')) {
            categories.ignore_encore.push({...note, reason: 'Encore already handled in database'});
        }
        // Check for 3D patterns
        else if (noteText.includes('(3d)') || noteText.includes('3d') || originalText.includes('(3D)')) {
            categories.movie_3d.push({...note, reason: 'Movie shown in 3D'});
        }
        // Check for birthday patterns
        else if (noteText.includes('birthday') || noteText.includes('happy birthday')) {
            categories.birthday_notes.push({...note, reason: 'Birthday celebration'});
        }
        // Check for game winner patterns
        else if (noteText.includes('winners:') || noteText.includes('winner:') || 
                 noteText.includes('quiplash') || noteText.includes('murder')) {
            categories.game_winners.push({...note, reason: 'Game winners'});
        }
        // Check for matinee (meaningful)
        else if (noteText.includes('matinee') || noteText.includes('– matinee')) {
            categories.meaningful_notes.push({...note, reason: 'Matinee showing info'});
        }
        // Check for other meaningful patterns
        else if (noteText.length > 5 && 
                 !noteText.includes('showing') && 
                 !noteText.includes('–') && 
                 originalText.trim() !== '') {
            categories.meaningful_notes.push({...note, reason: 'Other meaningful note'});
        }
        // Everything else gets ignored
        else {
            categories.ignore_other.push({...note, reason: 'Generic/unclear note'});
        }
    });
    
    return categories;
}

/**
 * Generate analysis report
 */
function generateAnalysisReport(categories) {
    console.log('📋 NOTES ANALYSIS REPORT');
    console.log('='.repeat(50));
    
    const totalNotes = Object.values(categories).reduce((sum, cat) => sum + cat.length, 0);
    
    console.log(`\n📊 SUMMARY (${totalNotes} total notes):`);
    console.log(`   🎬 3D Movies: ${categories.movie_3d.length}`);
    console.log(`   🎂 Birthday Notes: ${categories.birthday_notes.length}`);
    console.log(`   🎮 Game Winners: ${categories.game_winners.length}`);
    console.log(`   📝 Other Meaningful: ${categories.meaningful_notes.length}`);
    console.log(`   ❌ Ignored (AKA): ${categories.ignore_aka.length}`);
    console.log(`   ❌ Ignored (Encore): ${categories.ignore_encore.length}`);
    console.log(`   ❌ Ignored (Other): ${categories.ignore_other.length}`);
    
    // Show 3D movies
    if (categories.movie_3d.length > 0) {
        console.log(`\n🎬 MOVIES SHOWN IN 3D (${categories.movie_3d.length}):`);
        categories.movie_3d.forEach(note => {
            console.log(`   • Exp ${note.experimentNumber}: "${note.notes}"`);
        });
    }
    
    // Show birthday notes
    if (categories.birthday_notes.length > 0) {
        console.log(`\n🎂 BIRTHDAY CELEBRATION NOTES (${categories.birthday_notes.length}):`);
        categories.birthday_notes.forEach(note => {
            console.log(`   • Exp ${note.experimentNumber}: "${note.notes}"`);
        });
    }
    
    // Show game winners
    if (categories.game_winners.length > 0) {
        console.log(`\n🎮 GAME WINNER NOTES (${categories.game_winners.length}):`);
        categories.game_winners.forEach(note => {
            console.log(`   • Exp ${note.experimentNumber}: "${note.notes}"`);
        });
    }
    
    // Show other meaningful notes
    if (categories.meaningful_notes.length > 0) {
        console.log(`\n📝 OTHER MEANINGFUL NOTES (${categories.meaningful_notes.length}):`);
        categories.meaningful_notes.forEach(note => {
            console.log(`   • Exp ${note.experimentNumber}: "${note.notes}"`);
        });
    }
    
    // Show sample ignored notes
    console.log(`\n❌ SAMPLE IGNORED NOTES:`);
    if (categories.ignore_aka.length > 0) {
        console.log(`   AKA (${categories.ignore_aka.length}):`);
        categories.ignore_aka.slice(0, 3).forEach(note => {
            console.log(`     • Exp ${note.experimentNumber}: "${note.notes}"`);
        });
    }
    
    if (categories.ignore_encore.length > 0) {
        console.log(`   Encore (${categories.ignore_encore.length}):`);
        categories.ignore_encore.slice(0, 3).forEach(note => {
            console.log(`     • Exp ${note.experimentNumber}: "${note.notes}"`);
        });
    }
    
    return categories;
}

/**
 * Update meaningful notes in database
 */
async function updateMeaningfulNotes(categories, isDryRun = true) {
    const notesToUpdate = [
        ...categories.birthday_notes,
        ...categories.game_winners,
        ...categories.meaningful_notes
    ];
    
    console.log(`\n📝 ${isDryRun ? 'DRY RUN:' : 'EXECUTING:'} Update ${notesToUpdate.length} meaningful experiment notes`);
    console.log('='.repeat(70));
    
    const updateResults = [];
    
    for (const noteUpdate of notesToUpdate) {
        console.log(`\n📋 Experiment ${noteUpdate.experimentNumber}: "${noteUpdate.title}"`);
        console.log(`   Note: "${noteUpdate.notes}"`);
        console.log(`   Category: ${noteUpdate.reason}`);
        console.log(`   Database ID: ${noteUpdate.databaseId}`);
        
        if (!isDryRun) {
            try {
                const updatedExperiment = await prisma.experiment.update({
                    where: { id: noteUpdate.databaseId },
                    data: { eventNotes: noteUpdate.notes }
                });
                
                console.log(`   ✅ Updated experiment notes`);
                updateResults.push({
                    experimentNumber: noteUpdate.experimentNumber,
                    status: 'success',
                    notes: noteUpdate.notes
                });
            } catch (error) {
                console.log(`   ❌ Error updating notes: ${error.message}`);
                updateResults.push({
                    experimentNumber: noteUpdate.experimentNumber,
                    status: 'error',
                    error: error.message
                });
            }
        } else {
            console.log(`   📋 Would update notes to: "${noteUpdate.notes}"`);
            updateResults.push({
                experimentNumber: noteUpdate.experimentNumber,
                status: 'dry-run'
            });
        }
    }
    
    // Summary
    console.log(`\n📊 UPDATE SUMMARY:`);
    if (!isDryRun) {
        const successful = updateResults.filter(r => r.status === 'success').length;
        const failed = updateResults.filter(r => r.status === 'error').length;
        console.log(`   ✅ Successfully updated: ${successful}`);
        console.log(`   ❌ Failed to update: ${failed}`);
        
        if (failed > 0) {
            console.log(`\n❌ FAILED UPDATES:`);
            updateResults.filter(r => r.status === 'error').forEach(result => {
                console.log(`   • Experiment ${result.experimentNumber}: ${result.error}`);
            });
        }
    } else {
        console.log(`   📋 ${updateResults.length} notes ready for update`);
        console.log(`   💡 Run with --execute to apply changes`);
    }
    
    return updateResults;
}

/**
 * Main execution
 */
async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const shouldExecute = args.includes('--execute');
    
    if (!isDryRun && !shouldExecute) {
        console.log('❌ Please specify either --dry-run or --execute');
        console.log('Usage: node smart-notes-update.mjs [--dry-run|--execute]');
        process.exit(1);
    }
    
    try {
        await prisma.$connect();
        console.log('✅ Connected to database\n');
        
        // Get missing notes from sync proposal
        const missingNotes = syncProposal.proposals.missingNotes;
        console.log(`🔍 Analyzing ${missingNotes.length} missing notes from WordPress...\n`);
        
        // Categorize notes
        const categories = categorizeNotes(missingNotes);
        
        // Generate analysis report
        generateAnalysisReport(categories);
        
        // Update meaningful notes
        const results = await updateMeaningfulNotes(categories, isDryRun);
        
        // Save analysis to file
        const analysisReport = {
            generatedAt: new Date().toISOString(),
            totalNotes: missingNotes.length,
            categories: {
                movie_3d: categories.movie_3d.length,
                birthday_notes: categories.birthday_notes.length,
                game_winners: categories.game_winners.length,
                meaningful_notes: categories.meaningful_notes.length,
                ignored: categories.ignore_aka.length + categories.ignore_encore.length + categories.ignore_other.length
            },
            detailed_categories: categories,
            update_results: results
        };
        
        const reportPath = join(__dirname, 'notes-analysis-report.json');
        writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));
        console.log(`\n💾 Detailed analysis saved to: ${reportPath}`);
        
        console.log('\n✅ Notes analysis and update complete!');
        
        if (isDryRun) {
            console.log('\n🎬 NEXT STEPS FOR 3D MOVIES:');
            console.log('1. Add a "shown3D" boolean field to the movies table');
            console.log('2. Update movies that were shown in 3D');
            console.log('3. Add UI checkbox for 3D field in movie form');
        }
        
    } catch (error) {
        console.error('❌ Error during notes analysis:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
