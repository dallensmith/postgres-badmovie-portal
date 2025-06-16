#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();
}

async function emergencyCleanup() {
  console.log('🚨 EMERGENCY CLEANUP: Removing incorrect movie-experiment links...\n');
  
  try {
    // First, get the CORRECT mappings from the CSV file
    const csvContent = fs.readFileSync('./Bad-Movie-Database.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = parseCsvLine(lines[0]);
    
    // Build correct movie -> experiments mapping from CSV
    const correctMappings = new Map();
    
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < headers.length) continue;
      
      const movieTitle = row[headers.indexOf('movie_title')] || '';
      const experimentNumber = row[headers.indexOf('experiment_number')] || '';
      
      if (movieTitle.trim() && experimentNumber.trim()) {
        const cleanedTitle = cleanTitle(movieTitle);
        
        if (!correctMappings.has(cleanedTitle)) {
          correctMappings.set(cleanedTitle, {
            originalTitle: movieTitle.trim(),
            experiments: new Set()
          });
        }
        correctMappings.get(cleanedTitle).experiments.add(experimentNumber.trim());
      }
    }
    
    console.log(`📄 CSV contains ${correctMappings.size} unique movies with experiments\n`);
    
    // Get all current movie-experiment relationships
    const allMovieExperiments = await prisma.movieExperiment.findMany({
      include: {
        movie: {
          select: {
            id: true,
            movieTitle: true
          }
        },
        experiment: {
          select: {
            id: true,
            experimentNumber: true
          }
        }
      }
    });
    
    console.log(`🔍 Found ${allMovieExperiments.length} current movie-experiment relationships\n`);
    
    const toDelete = [];
    const correctRelationships = [];
    
    // Check each relationship against the CSV
    for (const relationship of allMovieExperiments) {
      const movieTitle = relationship.movie.movieTitle;
      const experimentNumber = relationship.experiment.experimentNumber;
      const cleanedMovieTitle = cleanTitle(movieTitle);
      
      // Check if this is a correct relationship according to CSV
      const correctMapping = correctMappings.get(cleanedMovieTitle);
      
      if (correctMapping && correctMapping.experiments.has(experimentNumber)) {
        correctRelationships.push({
          movieTitle,
          experimentNumber,
          relationshipId: relationship.id
        });
      } else {
        toDelete.push({
          movieTitle,
          experimentNumber,
          relationshipId: relationship.id
        });
      }
    }
    
    console.log(`✅ Correct relationships: ${correctRelationships.length}`);
    console.log(`❌ Incorrect relationships to delete: ${toDelete.length}\n`);
    
    if (toDelete.length > 0) {
      console.log('🗑️  Deleting incorrect relationships...\n');
      
      let deleteCount = 0;
      for (const incorrect of toDelete) {
        try {
          await prisma.movieExperiment.delete({
            where: { id: incorrect.relationshipId }
          });
          
          console.log(`🗑️  Deleted: "${incorrect.movieTitle}" ↔ Experiment ${incorrect.experimentNumber}`);
          deleteCount++;
          
          // Progress update every 50 deletions
          if (deleteCount % 50 === 0) {
            console.log(`   Progress: ${deleteCount}/${toDelete.length} deleted...`);
          }
          
        } catch (error) {
          console.error(`❌ Failed to delete relationship ${incorrect.relationshipId}:`, error.message);
        }
      }
      
      console.log(`\n✅ Deleted ${deleteCount} incorrect relationships\n`);
    }
    
    // Now verify the cleanup worked
    const remainingCount = await prisma.movieExperiment.count();
    console.log(`📊 Remaining movie-experiment relationships: ${remainingCount}`);
    
    // Sample some movies that were problematic
    const problemMovies = ['Kingfisher The Killer', 'In the Claws of the CIA', 'Q', 'Ogroff'];
    
    console.log('\n🔍 Checking problematic movies after cleanup:');
    for (const movieTitle of problemMovies) {
      const movie = await prisma.movie.findFirst({
        where: {
          movieTitle: {
            contains: movieTitle,
            mode: 'insensitive'
          }
        },
        include: {
          movieExperiments: {
            include: {
              experiment: true
            }
          }
        }
      });
      
      if (movie) {
        const expNumbers = movie.movieExperiments.map(me => me.experiment.experimentNumber).sort();
        console.log(`   ${movie.movieTitle}: [${expNumbers.join(', ')}]`);
        
        // Check against CSV
        const cleanedTitle = cleanTitle(movie.movieTitle);
        const correctMapping = correctMappings.get(cleanedTitle);
        if (correctMapping) {
          const correctExps = Array.from(correctMapping.experiments).sort();
          const isCorrect = JSON.stringify(expNumbers) === JSON.stringify(correctExps);
          console.log(`     CSV says: [${correctExps.join(', ')}] ${isCorrect ? '✅' : '❌'}`);
        } else {
          console.log(`     Not found in CSV - should have NO experiments`);
        }
      }
    }
    
    console.log('\n🎉 Emergency cleanup complete!');
    console.log('   Only correct movie-experiment relationships should remain.');
    
  } catch (error) {
    console.error('❌ Error during emergency cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run emergency cleanup
emergencyCleanup();
