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
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();
}

function extractYear(yearStr) {
  if (!yearStr) return null;
  const match = yearStr.toString().match(/(\d{4})/);
  return match ? match[1] : null;
}

async function analyzeCsvVsDatabase() {
  console.log('🔍 Analyzing CSV vs Database differences...\n');
  
  try {
    // Read CSV file
    const csvContent = fs.readFileSync('./Bad-Movie-Database.csv', 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = parseCsvLine(lines[0]);
    
    console.log(`📄 CSV Headers: ${headers.join(', ')}\n`);
    
    // Parse CSV data
    const csvMovies = [];
    const csvExperiments = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < headers.length) continue;
      
      const movieTitle = row[headers.indexOf('movie_title')] || '';
      const movieYear = row[headers.indexOf('movie_year')] || '';
      const experimentNumber = row[headers.indexOf('experiment_number')] || '';
      const eventDate = row[headers.indexOf('event_date')] || '';
      const eventHost = row[headers.indexOf('event_host')] || '';
      
      if (movieTitle.trim()) {
        const cleanedTitle = cleanTitle(movieTitle);
        const year = extractYear(movieYear);
        
        csvMovies.push({
          title: movieTitle.trim(),
          cleanTitle: cleanedTitle,
          year: year,
          experimentNumber: experimentNumber.trim(),
          rowIndex: i + 1
        });
      }
      
      if (experimentNumber.trim()) {
        csvExperiments.push({
          experimentNumber: experimentNumber.trim(),
          movieTitle: movieTitle.trim(),
          eventDate: eventDate.trim(),
          eventHost: eventHost.trim(),
          rowIndex: i + 1
        });
      }
    }
    
    console.log(`📊 CSV Summary:`);
    console.log(`   Movies found: ${csvMovies.length}`);
    console.log(`   Experiments found: ${csvExperiments.length}\n`);
    
    // Get database data
    const dbMovies = await prisma.movie.findMany({
      select: {
        id: true,
        movieTitle: true,
        movieYear: true,
        movieTmdbId: true,
        movieImdbId: true,
        movieExperiments: {
          include: {
            experiment: true
          }
        }
      }
    });
    
    const dbExperiments = await prisma.experiment.findMany({
      include: {
        movieExperiments: {
          include: {
            movie: {
              select: {
                movieTitle: true,
                movieYear: true
              }
            }
          }
        }
      }
    });
    
    console.log(`🗄️  Database Summary:`);
    console.log(`   Movies found: ${dbMovies.length}`);
    console.log(`   Experiments found: ${dbExperiments.length}\n`);
    
    // Analysis 1: Movies in CSV but not in database
    const missingMovies = [];
    const csvMovieMap = new Map();
    
    // Create a map of CSV movies for easier lookup
    csvMovies.forEach(csvMovie => {
      const key = `${csvMovie.cleanTitle}|${csvMovie.year || 'no-year'}`;
      if (!csvMovieMap.has(key)) {
        csvMovieMap.set(key, []);
      }
      csvMovieMap.get(key).push(csvMovie);
    });
    
    for (const [key, csvMovieList] of csvMovieMap) {
      const [csvCleanTitle, year] = key.split('|');
      
      // Try to find matching movie in database
      const dbMatch = dbMovies.find(dbMovie => {
        const dbCleanTitle = cleanTitle(dbMovie.movieTitle || '');
        const dbYear = extractYear(dbMovie.movieYear);
        
        return dbCleanTitle === csvCleanTitle && 
               (year === 'no-year' || !dbYear || dbYear === year);
      });
      
      if (!dbMatch) {
        missingMovies.push({
          title: csvMovieList[0].title,
          year: csvMovieList[0].year,
          experiments: csvMovieList.map(m => m.experimentNumber).filter(Boolean),
          csvRows: csvMovieList.map(m => m.rowIndex)
        });
      }
    }
    
    // Analysis 2: Experiments without movies
    const orphanedExperiments = dbExperiments.filter(exp => 
      !exp.movieExperiments || exp.movieExperiments.length === 0
    );
    
    // Analysis 3: Experiments in CSV but not in database
    const csvExpNumbers = new Set(csvExperiments.map(e => e.experimentNumber));
    const dbExpNumbers = new Set(dbExperiments.map(e => e.experimentNumber));
    
    const missingExperiments = [...csvExpNumbers].filter(expNum => !dbExpNumbers.has(expNum));
    
    // Analysis 4: Movies in database without experiments
    const moviesWithoutExperiments = dbMovies.filter(movie => 
      !movie.movieExperiments || movie.movieExperiments.length === 0
    );
    
    // Generate report
    const report = [];
    
    report.push('# Data Gap Analysis Report');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    
    report.push('## Summary');
    report.push(`- CSV Movies: ${csvMovies.length}`);
    report.push(`- CSV Experiments: ${csvExperiments.length}`);
    report.push(`- Database Movies: ${dbMovies.length}`);
    report.push(`- Database Experiments: ${dbExperiments.length}`);
    report.push('');
    
    report.push(`## 🚫 Movies in CSV but NOT in Database (${missingMovies.length})`);
    report.push('These movies appear in the CSV but could not be found in the PostgreSQL database:');
    report.push('');
    
    if (missingMovies.length === 0) {
      report.push('✅ All CSV movies found in database!');
    } else {
      missingMovies.forEach((movie, index) => {
        report.push(`${index + 1}. **${movie.title}** (${movie.year || 'No year'})`);
        if (movie.experiments.length > 0) {
          report.push(`   - Experiments: ${movie.experiments.join(', ')}`);
        }
        report.push(`   - CSV rows: ${movie.csvRows.join(', ')}`);
        report.push('');
      });
    }
    
    report.push(`## 🎬 Experiments in CSV but NOT in Database (${missingExperiments.length})`);
    report.push('These experiment numbers appear in the CSV but are missing from the database:');
    report.push('');
    
    if (missingExperiments.length === 0) {
      report.push('✅ All CSV experiments found in database!');
    } else {
      missingExperiments.forEach((expNum, index) => {
        const csvExp = csvExperiments.find(e => e.experimentNumber === expNum);
        report.push(`${index + 1}. **Experiment ${expNum}**`);
        if (csvExp) {
          report.push(`   - Movie: ${csvExp.movieTitle}`);
          report.push(`   - Date: ${csvExp.eventDate}`);
          report.push(`   - Host: ${csvExp.eventHost}`);
          report.push(`   - CSV row: ${csvExp.rowIndex}`);
        }
        report.push('');
      });
    }
    
    report.push(`## 🏝️ Orphaned Experiments in Database (${orphanedExperiments.length})`);
    report.push('These experiments exist in the database but have no associated movies:');
    report.push('');
    
    if (orphanedExperiments.length === 0) {
      report.push('✅ All database experiments have associated movies!');
    } else {
      orphanedExperiments.forEach((exp, index) => {
        report.push(`${index + 1}. **Experiment ${exp.experimentNumber}**`);
        report.push(`   - Date: ${exp.eventDate}`);
        report.push(`   - Host: ${exp.eventHost}`);
        report.push(`   - Location: ${exp.eventLocation}`);
        if (exp.postUrl) {
          report.push(`   - Post: ${exp.postUrl}`);
        }
        report.push('');
      });
    }
    
    report.push(`## 📽️ Movies in Database without Experiments (${moviesWithoutExperiments.length})`);
    report.push('These movies exist in the database but have no associated experiments:');
    report.push('');
    
    if (moviesWithoutExperiments.length === 0) {
      report.push('✅ All database movies have associated experiments!');
    } else {
      // Show only first 20 to avoid overwhelming report
      const showCount = Math.min(20, moviesWithoutExperiments.length);
      moviesWithoutExperiments.slice(0, showCount).forEach((movie, index) => {
        report.push(`${index + 1}. **${movie.movieTitle}** (${movie.movieYear || 'No year'})`);
        if (movie.movieTmdbId) {
          report.push(`   - TMDb ID: ${movie.movieTmdbId}`);
        }
        if (movie.movieImdbId) {
          report.push(`   - IMDb ID: ${movie.movieImdbId}`);
        }
        report.push('');
      });
      
      if (moviesWithoutExperiments.length > showCount) {
        report.push(`... and ${moviesWithoutExperiments.length - showCount} more movies without experiments.`);
        report.push('');
      }
    }
    
    report.push('## Recommendations');
    report.push('');
    
    if (missingMovies.length > 0) {
      report.push('1. **Add missing movies**: Import the movies listed above into the database');
      report.push('2. **Use TMDb search**: Use the portal\'s TMDb search to find and add these movies');
    }
    
    if (missingExperiments.length > 0) {
      report.push('3. **Check experiment data**: Verify if these experiments should exist or if there are typos');
    }
    
    if (orphanedExperiments.length > 0) {
      report.push('4. **Link orphaned experiments**: Connect these experiments to their corresponding movies');
    }
    
    // Write report to file
    const reportContent = report.join('\n');
    fs.writeFileSync('./data-gap-analysis.md', reportContent);
    
    console.log('📋 Report Summary:');
    console.log(`   Missing movies: ${missingMovies.length}`);
    console.log(`   Missing experiments: ${missingExperiments.length}`);
    console.log(`   Orphaned experiments: ${orphanedExperiments.length}`);
    console.log(`   Movies without experiments: ${moviesWithoutExperiments.length}`);
    console.log('');
    console.log('📄 Full report saved to: data-gap-analysis.md');
    
  } catch (error) {
    console.error('Error during analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeCsvVsDatabase();
