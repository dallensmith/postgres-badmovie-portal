#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findIncorrectLinkages() {
  console.log('🚨 EMERGENCY: Finding incorrect movie-experiment linkages...\n');
  
  try {
    // Find movies with too many experiments (suspicious)
    const moviesWithManyExperiments = await prisma.movie.findMany({
      include: {
        movieExperiments: {
          include: {
            experiment: true
          }
        }
      },
      where: {
        movieExperiments: {
          some: {}
        }
      }
    });
    
    // Filter movies with more than 3 experiments (likely wrong)
    const suspiciousMovies = moviesWithManyExperiments.filter(movie => 
      movie.movieExperiments.length > 3
    );
    
    console.log(`🔍 Found ${suspiciousMovies.length} movies with suspicious experiment counts:\n`);
    
    for (const movie of suspiciousMovies) {
      const expNumbers = movie.movieExperiments.map(me => me.experiment.experimentNumber).sort();
      console.log(`⚠️  ${movie.movieTitle} (${movie.movieYear || 'No year'})`);
      console.log(`   📋 Linked to ${movie.movieExperiments.length} experiments: ${expNumbers.join(', ')}`);
      console.log(`   🆔 Movie ID: ${movie.id}`);
      console.log('');
    }
    
    // Also check the specific Kingfisher movie
    const kingfisher = await prisma.movie.findFirst({
      where: {
        movieTitle: {
          contains: 'Kingfisher',
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
    
    if (kingfisher) {
      console.log(`🎯 KINGFISHER ANALYSIS:`);
      console.log(`   Title: ${kingfisher.movieTitle} (${kingfisher.movieYear || 'No year'})`);
      console.log(`   ID: ${kingfisher.id}`);
      console.log(`   Experiment count: ${kingfisher.movieExperiments.length}`);
      
      if (kingfisher.movieExperiments.length > 0) {
        console.log(`   Experiments:`);
        kingfisher.movieExperiments.forEach(me => {
          console.log(`     - Exp ${me.experiment.experimentNumber} (ID: ${me.experiment.id})`);
        });
      }
      console.log('');
    }
    
    // Find experiments with too many movies
    const experimentsWithManyMovies = await prisma.experiment.findMany({
      include: {
        movieExperiments: {
          include: {
            movie: {
              select: {
                id: true,
                movieTitle: true,
                movieYear: true
              }
            }
          }
        }
      },
      where: {
        movieExperiments: {
          some: {}
        }
      }
    });
    
    const suspiciousExperiments = experimentsWithManyMovies.filter(exp => 
      exp.movieExperiments.length > 3
    );
    
    console.log(`🧪 Found ${suspiciousExperiments.length} experiments with too many movies:\n`);
    
    for (const exp of suspiciousExperiments) {
      console.log(`⚠️  Experiment ${exp.experimentNumber} (${exp.eventDate})`);
      console.log(`   🎬 Linked to ${exp.movieExperiments.length} movies:`);
      exp.movieExperiments.forEach(me => {
        console.log(`     - ${me.movie.movieTitle} (${me.movie.movieYear || 'No year'}) [ID: ${me.movie.id}]`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('Error finding incorrect linkages:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run immediately
findIncorrectLinkages();
