#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function fixMissingLinks() {
  console.log('🔍 Checking for experiments with missing movie links...');

  // Read CSV data
  const csvPath = path.join(process.cwd(), 'Bad-Movie-Database.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // Skip header

  const csvExperimentMovies = new Map();

  // Parse CSV to get experiment-movie relationships
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split(',');
    if (parts.length < 2) continue;
    
    const experimentNumber = parts[0].trim();
    const movieTitle = parts[1].trim();
    
    if (!csvExperimentMovies.has(experimentNumber)) {
      csvExperimentMovies.set(experimentNumber, new Set());
    }
    csvExperimentMovies.get(experimentNumber).add(movieTitle);
  }

  console.log(`📊 Found ${csvExperimentMovies.size} unique experiments in CSV`);

  // Check each experiment in the database
  const experiments = await prisma.experiment.findMany({
    include: {
      movieExperiments: {
        include: { movie: true }
      }
    }
  });

  let fixedCount = 0;

  for (const experiment of experiments) {
    const expectedMovies = csvExperimentMovies.get(experiment.experimentNumber);
    if (!expectedMovies) {
      console.log(`⚠️  Experiment ${experiment.experimentNumber} not found in CSV`);
      continue;
    }

    const currentMovies = new Set(
      experiment.movieExperiments.map(me => me.movie.movieTitle)
    );

    const missingMovies = [...expectedMovies].filter(title => !currentMovies.has(title));

    if (missingMovies.length > 0) {
      console.log(`🔧 Experiment ${experiment.experimentNumber} missing ${missingMovies.length} movies: ${missingMovies.join(', ')}`);

      for (const movieTitle of missingMovies) {
        // Find the movie in the database
        const movie = await prisma.movie.findFirst({
          where: {
            movieTitle: {
              equals: movieTitle,
              mode: 'insensitive'
            }
          }
        });

        if (movie) {
          // Check if link already exists
          const existingLink = await prisma.movieExperiment.findFirst({
            where: {
              movieId: movie.id,
              experimentId: experiment.id
            }
          });

          if (!existingLink) {
            await prisma.movieExperiment.create({
              data: {
                movieId: movie.id,
                experimentId: experiment.id
              }
            });
            console.log(`✅ Linked "${movieTitle}" to experiment ${experiment.experimentNumber}`);
            fixedCount++;
          } else {
            console.log(`ℹ️  Link already exists for "${movieTitle}" and experiment ${experiment.experimentNumber}`);
          }
        } else {
          console.log(`❌ Movie "${movieTitle}" not found in database for experiment ${experiment.experimentNumber}`);
        }
      }
    }
  }

  console.log(`\n🎉 Fixed ${fixedCount} missing movie-experiment links`);
}

fixMissingLinks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
