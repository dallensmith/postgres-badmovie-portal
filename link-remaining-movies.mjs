#!/usr/bin/env node

import fs from 'fs';
import { PrismaClient } from '@prisma/client';

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
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();
}

function extractYear(yearStr) {
  if (!yearStr) return null;
  const match = yearStr.toString().match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function calculateSimilarity(str1, str2) {
  const clean1 = cleanTitle(str1);
  const clean2 = cleanTitle(str2);
  
  if (clean1 === clean2) return 1.0;
  
  // Check if one is contained in the other
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    return 0.9;
  }
  
  // Simple word matching
  const words1 = clean1.split(' ').filter(w => w.length > 2);
  const words2 = clean2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  return intersection.length / union.length;
}

async function findUnlinkedMovies() {
  console.log('🔍 Finding movies without experiments and linking them...\n');
  
  try {
    // Get movies without experiments
    const moviesWithoutExperiments = await prisma.movie.findMany({
      where: {
        movieExperiments: {
          none: {}
        }
      },
      select: {
        id: true,
        movieTitle: true,
        movieOriginalTitle: true,
        movieYear: true,
        movieTmdbId: true,
        movieImdbId: true
      },
      orderBy: {
        movieTitle: 'asc'
      }
    });
    
    console.log(`📊 Found ${moviesWithoutExperiments.length} movies without experiments\n`);
    
    // Read CSV file
    const csvContent = fs.readFileSync('./Bad-Movie-Database.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = parseCsvLine(lines[0]);
    
    // Parse CSV data
    const csvMovies = [];
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < headers.length) continue;
      
      const movieTitle = row[headers.indexOf('movie_title')] || '';
      const movieYear = row[headers.indexOf('movie_year')] || '';
      const experimentNumber = row[headers.indexOf('experiment_number')] || '';
      
      if (movieTitle.trim() && experimentNumber.trim()) {
        csvMovies.push({
          title: movieTitle.trim(),
          cleanTitle: cleanTitle(movieTitle),
          year: extractYear(movieYear),
          experimentNumber: experimentNumber.trim(),
          rowIndex: i + 1
        });
      }
    }
    
    // Get all experiments for linking
    const experiments = await prisma.experiment.findMany({
      select: {
        id: true,
        experimentNumber: true
      }
    });
    
    const experimentMap = new Map();
    experiments.forEach(exp => {
      experimentMap.set(exp.experimentNumber, exp.id);
    });
    
    console.log(`📚 Checking ${moviesWithoutExperiments.length} unlinked movies against ${csvMovies.length} CSV entries...\n`);
    
    let matchCount = 0;
    let linkCount = 0;
    const linkingActions = [];
    
    for (const dbMovie of moviesWithoutExperiments) {
      const dbCleanTitle = cleanTitle(dbMovie.movieTitle || '');
      const dbYear = extractYear(dbMovie.movieYear);
      
      console.log(`🔍 Checking: "${dbMovie.movieTitle}" (${dbYear || 'No year'}) - ID: ${dbMovie.id}`);
      
      // Find matching CSV entries
      const matches = [];
      
      for (const csvMovie of csvMovies) {
        const titleScore = calculateSimilarity(dbMovie.movieTitle || '', csvMovie.title);
        const originalTitleScore = dbMovie.movieOriginalTitle ? 
          calculateSimilarity(dbMovie.movieOriginalTitle, csvMovie.title) : 0;
        
        const maxTitleScore = Math.max(titleScore, originalTitleScore);
        
        if (maxTitleScore >= 0.8) {
          const yearDiff = dbYear && csvMovie.year ? Math.abs(dbYear - csvMovie.year) : 999;
          
          // Good match if high title similarity and reasonable year difference
          if (maxTitleScore >= 0.95 || (maxTitleScore >= 0.8 && yearDiff <= 2)) {
            matches.push({
              csvMovie,
              titleScore: maxTitleScore,
              yearDiff: yearDiff
            });
          }
        }
      }
      
      if (matches.length > 0) {
        matchCount++;
        
        // Sort by best match (title score first, then year difference)
        matches.sort((a, b) => {
          if (a.titleScore !== b.titleScore) return b.titleScore - a.titleScore;
          return a.yearDiff - b.yearDiff;
        });
        
        console.log(`  ✅ Found ${matches.length} match(es):`);
        
        const uniqueExperiments = new Set();
        matches.forEach(match => {
          uniqueExperiments.add(match.csvMovie.experimentNumber);
          console.log(`    → "${match.csvMovie.title}" (${match.csvMovie.year || 'No year'}) - Exp ${match.csvMovie.experimentNumber} - Score: ${(match.titleScore * 100).toFixed(1)}%`);
        });
        
        // Link to all unique experiments found
        for (const expNum of uniqueExperiments) {
          if (experimentMap.has(expNum)) {
            linkingActions.push({
              movieId: dbMovie.id,
              movieTitle: dbMovie.movieTitle,
              experimentId: experimentMap.get(expNum),
              experimentNumber: expNum
            });
          } else {
            console.log(`    ⚠️  Experiment ${expNum} not found in database`);
          }
        }
        
      } else {
        console.log(`  ❌ No matches found`);
      }
      
      console.log('');
    }
    
    console.log(`📊 Summary before linking:`);
    console.log(`   Movies checked: ${moviesWithoutExperiments.length}`);
    console.log(`   Movies with matches: ${matchCount}`);
    console.log(`   Experiments to link: ${linkingActions.length}\n`);
    
    if (linkingActions.length > 0) {
      console.log('🔗 Creating movie-experiment relationships...\n');
      
      for (const action of linkingActions) {
        try {
          // Check if relationship already exists
          const existing = await prisma.movieExperiment.findFirst({
            where: {
              movieId: action.movieId,
              experimentId: action.experimentId
            }
          });
          
          if (existing) {
            console.log(`⚠️  Already linked: ${action.movieTitle} ↔ Experiment ${action.experimentNumber}`);
            continue;
          }
          
          // Create the relationship
          await prisma.movieExperiment.create({
            data: {
              movieId: action.movieId,
              experimentId: action.experimentId
            }
          });
          
          console.log(`✅ Linked: ${action.movieTitle} → Experiment ${action.experimentNumber}`);
          linkCount++;
          
        } catch (error) {
          console.error(`❌ Failed to link ${action.movieTitle} to Experiment ${action.experimentNumber}: ${error.message}`);
        }
      }
      
      console.log(`\n🎉 Successfully linked ${linkCount} new movie-experiment relationships!`);
    } else {
      console.log('ℹ️  No new relationships to create.');
    }
    
    // Final statistics
    const finalMoviesWithoutExperiments = await prisma.movie.count({
      where: {
        movieExperiments: {
          none: {}
        }
      }
    });
    
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Movies without experiments: ${finalMoviesWithoutExperiments} (was ${moviesWithoutExperiments.length})`);
    console.log(`   Improvement: ${moviesWithoutExperiments.length - finalMoviesWithoutExperiments} movies now have experiments`);
    
  } catch (error) {
    console.error('Error during linking process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the process
findUnlinkedMovies();
