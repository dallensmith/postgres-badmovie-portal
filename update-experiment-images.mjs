#!/usr/bin/env node

/**
 * Update Experiment Images Script
 * 
 * This script updates experiment images from WordPress to the database.
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
const onlyMissing = args.includes('--only-missing'); // Only update experiments with no current image

if (!isDryRun && !shouldExecute) {
    console.log('❌ Please specify either --dry-run or --execute');
    console.log('Usage: node update-experiment-images.mjs [--dry-run|--execute] [--only-missing]');
    console.log('  --only-missing: Only update experiments that currently have no image');
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
 * Update experiment images
 */
async function updateExperimentImages() {
    let imageUpdates = syncProposal.proposals.imageUpdates;
    
    // Filter to only missing images if requested
    if (onlyMissing) {
        imageUpdates = imageUpdates.filter(update => !update.currentImage || update.currentImage === 'null');
        console.log(`🔍 Filtered to ${imageUpdates.length} experiments with missing images`);
    }
    
    console.log(`🖼️  ${isDryRun ? 'DRY RUN:' : 'EXECUTING:'} Update ${imageUpdates.length} experiment images`);
    console.log('='.repeat(70));
    
    const updateResults = [];
    
    for (const imageUpdate of imageUpdates) {
        console.log(`\n🖼️  Experiment ${imageUpdate.experimentNumber}: "${imageUpdate.title}"`);
        console.log(`   Current: ${imageUpdate.currentImage || 'null'}`);
        console.log(`   Proposed: ${imageUpdate.proposedImage}`);
        console.log(`   Database ID: ${imageUpdate.databaseId}`);
        
        // Decide if this is an improvement
        const isImprovement = !imageUpdate.currentImage || 
                            imageUpdate.currentImage === 'null' ||
                            imageUpdate.proposedImage.includes('-1024x') || // Higher resolution
                            imageUpdate.proposedImage.length > imageUpdate.currentImage.length;
        
        console.log(`   📊 Assessment: ${isImprovement ? '✅ Improvement' : '⚠️  Similar quality'}`);
        
        if (shouldExecute) {
            try {
                const updatedExperiment = await prisma.experiment.update({
                    where: { id: imageUpdate.databaseId },
                    data: { eventImage: imageUpdate.proposedImage }
                });
                
                console.log(`   ✅ Updated experiment image`);
                updateResults.push({
                    experimentNumber: imageUpdate.experimentNumber,
                    status: 'success',
                    newImage: imageUpdate.proposedImage
                });
            } catch (error) {
                console.log(`   ❌ Error updating image: ${error.message}`);
                updateResults.push({
                    experimentNumber: imageUpdate.experimentNumber,
                    status: 'error',
                    error: error.message
                });
            }
        } else {
            console.log(`   📋 Would update image to: ${imageUpdate.proposedImage}`);
            updateResults.push({
                experimentNumber: imageUpdate.experimentNumber,
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
        console.log(`   📋 ${updateResults.length} images ready for update`);
        console.log(`   💡 Run with --execute to apply changes`);
        if (!onlyMissing) {
            console.log(`   💡 Add --only-missing to update only experiments without images`);
        }
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
        
        const results = await updateExperimentImages();
        
        console.log('\n✅ Image update operation complete!');
        
    } catch (error) {
        console.error('❌ Error during image update:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
