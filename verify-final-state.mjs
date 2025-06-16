#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMovieExperiments() {
  console.log('🔍 Verifying movie-experiment relationships...\n');
  
  try {
    // Check a few key movies that should have experiments
    const testMovies = [
      'Ninja Terminator',
      'Creating Rem Lezar', 
      'Fatal Deviation',
      'The Laughing Dead',
      'Blood Harvest'
    ];
    
    for (const movieTitle of testMovies) {
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
        console.log(`✅ ${movie.movieTitle} (${movie.movieYear || 'No year'})`);
        if (movie.movieExperiments.length > 0) {
          const expNumbers = movie.movieExperiments.map(me => me.experiment.experimentNumber).sort();
          console.log(`   📋 Experiments: ${expNumbers.join(', ')}`);
        } else {
          console.log(`   ⚠️  No experiments linked`);
        }
      } else {
        console.log(`❌ Movie not found: ${movieTitle}`);
      }
      console.log('');
    }
    
    // Overall statistics
    const totalMovies = await prisma.movie.count();
    const moviesWithExperiments = await prisma.movie.count({
      where: {
        movieExperiments: {
          some: {}
        }
      }
    });
    
    const totalExperiments = await prisma.experiment.count();
    const experimentsWithMovies = await prisma.experiment.count({
      where: {
        movieExperiments: {
          some: {}
        }
      }
    });
    
    console.log('📊 Overall Statistics:');
    console.log(`   Total movies: ${totalMovies}`);
    console.log(`   Movies with experiments: ${moviesWithExperiments}`);
    console.log(`   Total experiments: ${totalExperiments}`);
    console.log(`   Experiments with movies: ${experimentsWithMovies}`);
    
    const movieExperimentCount = await prisma.movieExperiment.count();
    console.log(`   Total movie-experiment relationships: ${movieExperimentCount}`);
    
    console.log('\n🎉 Verification complete!');
    
    if (moviesWithExperiments > 0 && experimentsWithMovies > 0) {
      console.log('✅ Movie-experiment relationships are working correctly!');
      console.log('   You should see experiment badges in the movie portal.');
    }
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyMovieExperiments();
