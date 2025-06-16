#!/usr/bin/env node

import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function crossReferenceData() {
  console.log('📊 Cross-referencing WordPress scrape with database...');
  
  // Load scraped WordPress data
  const wpDataPath = './wordpress-scrape-results.json';
  if (!fs.existsSync(wpDataPath)) {
    console.error('❌ WordPress scrape results not found. Run scrape-wordpress.mjs first.');
    return;
  }
  
  const wpExperiments = JSON.parse(fs.readFileSync(wpDataPath, 'utf-8'));
  console.log(`📄 Loaded ${wpExperiments.length} experiments from WordPress scrape`);
  
  // Get all experiments from database
  const dbExperiments = await prisma.experiment.findMany({
    include: {
      movieExperiments: {
        include: { movie: true }
      }
    }
  });
  
  console.log(`🗄️  Loaded ${dbExperiments.length} experiments from database`);
  
  const comparison = [];
  const issues = [];
  
  // Create maps for easier lookup
  const wpByNumber = new Map();
  wpExperiments.forEach(exp => wpByNumber.set(exp.experimentNumber, exp));
  
  const dbByNumber = new Map();
  dbExperiments.forEach(exp => dbByNumber.set(exp.experimentNumber, exp));
  
  // Check WordPress experiments against database
  console.log('\n🔍 Checking WordPress experiments...');
  for (const wpExp of wpExperiments) {
    const dbExp = dbByNumber.get(wpExp.experimentNumber);
    
    const comparison_entry = {
      experimentNumber: wpExp.experimentNumber,
      inWordPress: true,
      inDatabase: !!dbExp,
      wpMovieCount: wpExp.movies.length,
      dbMovieCount: dbExp ? dbExp.movieExperiments.length : 0,
      wpMovies: wpExp.movies.map(m => m.title),
      dbMovies: dbExp ? dbExp.movieExperiments.map(me => me.movie.movieTitle) : [],
      wpUrl: wpExp.postUrl,
      dbPostUrl: dbExp ? dbExp.postUrl : null,
      status: 'OK'
    };
    
    // Check for issues
    if (!dbExp) {
      comparison_entry.status = 'MISSING_FROM_DB';
      issues.push(`❌ Experiment ${wpExp.experimentNumber} exists in WordPress but not in database`);
    } else if (wpExp.movies.length !== dbExp.movieExperiments.length) {
      comparison_entry.status = 'MOVIE_COUNT_MISMATCH';
      issues.push(`⚠️  Experiment ${wpExp.experimentNumber}: WP has ${wpExp.movies.length} movies, DB has ${dbExp.movieExperiments.length} movies`);
    }
    
    comparison.push(comparison_entry);
  }
  
  // Check database experiments that might not be in WordPress scrape
  console.log('\n🔍 Checking database experiments...');
  for (const dbExp of dbExperiments) {
    if (!wpByNumber.has(dbExp.experimentNumber)) {
      const expNum = parseInt(dbExp.experimentNumber);
      
      // Only flag as missing if it's in the range we should have scraped (recent experiments)
      if (expNum >= 454) {
        issues.push(`❌ Experiment ${dbExp.experimentNumber} exists in database but not found in WordPress scrape`);
        
        comparison.push({
          experimentNumber: dbExp.experimentNumber,
          inWordPress: false,
          inDatabase: true,
          wpMovieCount: 0,
          dbMovieCount: dbExp.movieExperiments.length,
          wpMovies: [],
          dbMovies: dbExp.movieExperiments.map(me => me.movie.movieTitle),
          wpUrl: null,
          dbPostUrl: dbExp.postUrl,
          status: 'MISSING_FROM_WP_SCRAPE'
        });
      }
    }
  }
  
  // Test specific experiments we were fixing
  console.log('\n🎯 Checking previously problematic experiments...');
  const testExperiments = ['393', '381'];
  
  for (const expNum of testExperiments) {
    const wpExp = wpByNumber.get(expNum);
    const dbExp = dbByNumber.get(expNum);
    
    console.log(`\n📝 Experiment ${expNum}:`);
    console.log(`  WordPress: ${wpExp ? 'Found' : 'Not found'} (${wpExp ? wpExp.movies.length : 0} movies)`);
    console.log(`  Database: ${dbExp ? 'Found' : 'Not found'} (${dbExp ? dbExp.movieExperiments.length : 0} movies)`);
    
    if (wpExp) {
      console.log(`  WP Movies: ${wpExp.movies.map(m => m.title).join(', ')}`);
    }
    if (dbExp) {
      console.log(`  DB Movies: ${dbExp.movieExperiments.map(me => me.movie.movieTitle).join(', ')}`);
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`Total WordPress experiments: ${wpExperiments.length}`);
  console.log(`Total database experiments: ${dbExperiments.length}`);
  console.log(`Issues found: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n🚨 ISSUES:');
    issues.forEach(issue => console.log(issue));
  }
  
  // Save detailed comparison
  const outputPath = './wordpress-db-comparison.json';
  fs.writeFileSync(outputPath, JSON.stringify({
    summary: {
      wpCount: wpExperiments.length,
      dbCount: dbExperiments.length,
      issuesCount: issues.length,
      comparisonDate: new Date().toISOString()
    },
    issues,
    comparison
  }, null, 2));
  
  console.log(`\n💾 Detailed comparison saved to: ${outputPath}`);
  
  return { comparison, issues };
}

crossReferenceData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
