#!/usr/bin/env node

/**
 * Update Missing Notes Script
 * 
 * This script updates experiment notes from WordPress to the database.
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
    console.log('Usage: node update-missing-notes.mjs [--dry-run|--execute]');
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
 * Update missing notes
 */
async function updateMissingNotes() {
    const missingNotes = syncProposal.proposals.missingNotes;
    
    console.log(`📝 ${isDryRun ? 'DRY RUN:' : 'EXECUTING:'} Update ${missingNotes.length} experiment notes`);
    console.log('='.repeat(70));
    
    const updateResults = [];
    
    for (const noteUpdate of missingNotes) {
        console.log(`\n📋 Experiment ${noteUpdate.experimentNumber}: "${noteUpdate.title}"`);
        console.log(`   Current notes: (empty)`);
        console.log(`   Proposed notes: "${noteUpdate.notes}"`);
        console.log(`   Database ID: ${noteUpdate.databaseId}`);
        
        if (shouldExecute) {
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
    if (shouldExecute) {
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
    try {
        await prisma.$connect();
        console.log('✅ Connected to database\n');
        
        const results = await updateMissingNotes();
        
        console.log('\n✅ Notes update operation complete!');
        
    } catch (error) {
        console.error('❌ Error during notes update:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
