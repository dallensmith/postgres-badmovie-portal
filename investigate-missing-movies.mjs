#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Movies that had foreign key constraint errors
const problemMovies = [
  { movieId: 447, experimentNumber: "249", title: "Safe Crossing: An EGG-cellent Idea!" },
  { movieId: 544, experimentNumber: "300", title: "Urine Trouble" },
  { movieId: 709, experimentNumber: "387", title: "Sister Sensei" }
];

async function investigateAndFix() {
  console.log('🔍 Investigating movies with foreign key constraint errors...\n');
  
  try {
    for (const problem of problemMovies) {
      console.log(`🎬 Investigating: ${problem.title} (Expected ID: ${problem.movieId})`);
      
      // Check if the movie ID exists
      const movieById = await prisma.movie.findUnique({
        where: { id: problem.movieId },
        select: {
          id: true,
          movieTitle: true,
          movieYear: true
        }
      });
      
      if (movieById) {
        console.log(`  ✅ Movie ID ${problem.movieId} exists: "${movieById.movieTitle}" (${movieById.movieYear})`);
      } else {
        console.log(`  ❌ Movie ID ${problem.movieId} does NOT exist`);
        
        // Search for the movie by title
        const moviesByTitle = await prisma.movie.findMany({
          where: {
            movieTitle: {
              contains: problem.title,
              mode: 'insensitive'
            }
          },
          select: {
            id: true,
            movieTitle: true,
            movieYear: true,
            movieExperiments: {
              include: {
                experiment: {
                  select: {
                    experimentNumber: true
                  }
                }
              }
            }
          }
        });
        
        if (moviesByTitle.length > 0) {
          console.log(`  🔍 Found ${moviesByTitle.length} movies with similar titles:`);
          moviesByTitle.forEach(movie => {
            const expNumbers = movie.movieExperiments.map(me => me.experiment.experimentNumber);
            console.log(`    ID ${movie.id}: "${movie.movieTitle}" (${movie.movieYear}) - Experiments: [${expNumbers.join(', ')}]`);
          });
        } else {
          console.log(`  ❌ No movies found with title containing "${problem.title}"`);
        }
      }
      
      // Check if the experiment exists
      const experiment = await prisma.experiment.findFirst({
        where: {
          experimentNumber: problem.experimentNumber
        },
        select: {
          id: true,
          experimentNumber: true,
          movieExperiments: {
            include: {
              movie: {
                select: {
                  id: true,
                  movieTitle: true
                }
              }
            }
          }
        }
      });
      
      if (experiment) {
        console.log(`  ✅ Experiment ${problem.experimentNumber} exists (ID: ${experiment.id})`);
        if (experiment.movieExperiments.length > 0) {
          console.log(`    Already linked to: ${experiment.movieExperiments.map(me => `"${me.movie.movieTitle}" (ID: ${me.movie.id})`).join(', ')}`);
        } else {
          console.log(`    No movies currently linked to this experiment`);
        }
      } else {
        console.log(`  ❌ Experiment ${problem.experimentNumber} does NOT exist`);
      }
      
      console.log('');
    }
    
    // Now let's try to find and fix these linkages
    console.log('🔧 Attempting to fix the linkages...\n');
    
    for (const problem of problemMovies) {
      console.log(`🔗 Fixing: ${problem.title} → Experiment ${problem.experimentNumber}`);
      
      // Search for the movie with a more flexible approach
      const possibleMovies = await prisma.movie.findMany({
        where: {
          OR: [
            {
              movieTitle: {
                contains: problem.title.split(':')[0], // Take first part before colon
                mode: 'insensitive'
              }
            },
            {
              movieTitle: {
                contains: problem.title.split(' ')[0], // Take first word
                mode: 'insensitive'
              }
            }
          ]
        },
        select: {
          id: true,
          movieTitle: true,
          movieYear: true,
          movieExperiments: {
            include: {
              experiment: {
                select: {
                  experimentNumber: true
                }
              }
            }
          }
        }
      });
      
      if (possibleMovies.length > 0) {
        console.log(`  Found ${possibleMovies.length} possible matches:`);
        
        for (const movie of possibleMovies) {
          const existingExps = movie.movieExperiments.map(me => me.experiment.experimentNumber);
          const hasExperiment = existingExps.includes(problem.experimentNumber);
          
          console.log(`    ID ${movie.id}: "${movie.movieTitle}" (${movie.movieYear}) - Has exp ${problem.experimentNumber}: ${hasExperiment ? '✅' : '❌'}`);
          
          if (!hasExperiment) {
            // Try to link this experiment
            const experiment = await prisma.experiment.findFirst({
              where: { experimentNumber: problem.experimentNumber }
            });
            
            if (experiment) {
              try {
                await prisma.movieExperiment.create({
                  data: {
                    movieId: movie.id,
                    experimentId: experiment.id
                  }
                });
                console.log(`      ✅ Successfully linked Movie ${movie.id} to Experiment ${problem.experimentNumber}!`);
              } catch (error) {
                console.log(`      ❌ Failed to link: ${error.message}`);
              }
            }
          }
        }
      } else {
        console.log(`  ❌ No possible matches found for "${problem.title}"`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('Error during investigation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the investigation
investigateAndFix();
