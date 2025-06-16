#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function emergencyRollback() {
  console.log('🚨 EMERGENCY ROLLBACK: Removing incorrect movie-experiment links...\n');
  
  try {
    // First, let's see what just happened
    const recentLinks = await prisma.movieExperiment.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      },
      include: {
        movie: {
          select: {
            movieTitle: true
          }
        },
        experiment: {
          select: {
            experimentNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`Found ${recentLinks.length} recent movie-experiment links (last 10 minutes):`);
    
    // Group by movie to see which ones have too many experiments
    const movieGroups = new Map();
    
    for (const link of recentLinks) {
      const movieTitle = link.movie.movieTitle;
      if (!movieGroups.has(movieTitle)) {
        movieGroups.set(movieTitle, []);
      }
      movieGroups.get(movieTitle).push(link);
    }
    
    // Show movies with suspicious number of experiments
    console.log('\n🔍 Movies with recent links:');
    for (const [movieTitle, links] of movieGroups) {
      console.log(`   ${movieTitle}: ${links.length} experiments [${links.map(l => l.experiment.experimentNumber).join(', ')}]`);
      
      if (links.length > 5) {
        console.log(`   ⚠️  SUSPICIOUS: ${movieTitle} has ${links.length} experiments!`);
      }
    }
    
    // Ask for confirmation before proceeding with rollback
    console.log('\n🚨 Do you want to remove ALL recent links (last 10 minutes)?');
    console.log('   This will undo the damage from the over-linking script.');
    console.log('   Type "yes" to confirm rollback, or "no" to cancel:');
    
    // For now, let's show what would be removed without actually doing it
    console.log('\n📋 PREVIEW: These links would be removed:');
    
    for (const link of recentLinks.slice(0, 20)) { // Show first 20
      console.log(`   Remove: ${link.movie.movieTitle} ↔ Experiment ${link.experiment.experimentNumber}`);
    }
    
    if (recentLinks.length > 20) {
      console.log(`   ... and ${recentLinks.length - 20} more links`);
    }
    
    console.log('\n⚠️  MANUAL ROLLBACK REQUIRED:');
    console.log('   Please confirm if you want to remove these links.');
    console.log('   Run this script again with confirmation to proceed.');
    
  } catch (error) {
    console.error('Error during rollback investigation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run emergency investigation
emergencyRollback();
