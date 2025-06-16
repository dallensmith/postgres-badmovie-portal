#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

async function scrapeCompleteWordPressData() {
  console.log('🕷️  Starting complete WordPress scrape...');
  
  const baseUrl = 'https://bigscreenbadmovies.com';
  
  try {
    // Test with experiment 004 which we know has all the data
    const postUrl = `${baseUrl}/experiment-004/`;
    console.log(`📄 Fetching complete data from: ${postUrl}`);
    
    // Fetch the individual post (which contains ALL experiment data)
    const postResponse = await fetch(postUrl);
    if (!postResponse.ok) {
      throw new Error(`Post fetch failed: ${postResponse.status}`);
    }
    
    const postHtml = await postResponse.text();
    const $ = cheerio.load(postHtml);
    
    // Extract author (host) - this will be the default host
    const defaultHost = $('.author a').first().text().trim() || 'Unknown';
    console.log(`👤 Default host: ${defaultHost}`);
    
    // Get the complete movie/experiment listing from the post content
    const content = $('.post-content').text().trim();
    console.log(`📄 Content length: ${content.length} characters`);
    
    // Parse all experiments from the content
    const experiments = parseAllExperimentsFromContent(content, defaultHost);
    
    console.log(`\n📊 Summary: Parsed ${experiments.length} experiments`);
    
    // Save results to file
    const outputPath = path.join(process.cwd(), 'wordpress-all-experiments.json');
    fs.writeFileSync(outputPath, JSON.stringify(experiments, null, 2));
    console.log(`💾 Results saved to: ${outputPath}`);
    
    // Show sample data
    if (experiments.length > 0) {
      console.log('\n📋 Sample experiments:');
      experiments.slice(0, 3).forEach(exp => {
        console.log(`  ${exp.experimentNumber}: ${exp.movies.length} movies`);
        if (exp.movies.length > 0) {
          console.log(`    Movies: ${exp.movies.slice(0, 2).map(m => `${m.title} (${m.year})`).join(', ')}${exp.movies.length > 2 ? '...' : ''}`);
        }
        console.log('');
      });
      
      // Test specific experiments we care about
      const exp393 = experiments.find(e => e.experimentNumber === '393');
      const exp381 = experiments.find(e => e.experimentNumber === '381');
      const exp004 = experiments.find(e => e.experimentNumber === '004');
      
      console.log('\n🎯 Test cases:');
      if (exp004) {
        console.log(`  Experiment 004: ${exp004.movies.length} movies - ${exp004.movies.slice(0,2).map(m => m.title).join(', ')}...`);
      }
      if (exp393) {
        console.log(`  Experiment 393: ${exp393.movies.length} movies - ${exp393.movies.map(m => m.title).join(', ')}`);
      } else {
        console.log('  Experiment 393: NOT FOUND');
      }
      
      if (exp381) {
        console.log(`  Experiment 381: ${exp381.movies.length} movies - ${exp381.movies.map(m => m.title).join(', ')}`);
      } else {
        console.log('  Experiment 381: NOT FOUND');
      }
    }
    
    return experiments;
    
  } catch (error) {
    console.error('❌ Error scraping WordPress:', error);
    throw error;
  }
}

function parseAllExperimentsFromContent(content, defaultHost) {
  const experiments = [];
  
  // Split content into lines and process each line
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip experiment 193 with collective link as requested
    if (line.includes('193') && (line.toLowerCase().includes('collective') || line.toLowerCase().includes('thecollective'))) {
      console.log('⏭️  Skipping experiment 193 (collective link)');
      continue;
    }
    
    // Look for lines that contain movies in format "Title (Year) | Title (Year)"
    if (line.includes('|') && line.match(/\(\d{4}\)/)) {
      
      // Split by | to get individual movies
      const movieParts = line.split('|').map(part => part.trim());
      const movies = [];
      
      for (const part of movieParts) {
        const movieMatch = part.match(/^(.+?)\s*\((\d{4})\)(.*)$/);
        if (movieMatch) {
          let title = movieMatch[1].trim();
          const year = movieMatch[2];
          const extra = movieMatch[3] || '';
          
          // Clean up title
          title = title.replace(/^\s*[-–—]\s*/, ''); // Remove leading dashes
          title = title.replace(/\s+/g, ' ').trim();
          
          // Skip very short or invalid titles
          if (title.length < 2) continue;
          
          // Check for encore marking
          const isEncore = part.toLowerCase().includes('encore') || extra.toLowerCase().includes('encore');
          
          movies.push({
            title,
            year,
            url: null,
            rawText: part.trim(),
            isEncore
          });
        }
      }
      
      // If we found movies, try to determine which experiment this is
      if (movies.length > 0) {
        // Look for experiment number in this line or nearby lines
        let experimentNumber = null;
        
        // Check current line for experiment number
        const expMatch = line.match(/experiment[^\d]*(\d+)/i) || 
                        line.match(/^(\d{1,3})[^\d]/) ||
                        line.match(/\b(\d{3})\b/);
        
        if (expMatch) {
          experimentNumber = expMatch[1].padStart(3, '0');
        } else {
          // Look in nearby lines (previous few lines) for experiment context
          for (let j = Math.max(0, i - 3); j < i; j++) {
            const prevLine = lines[j];
            const prevMatch = prevLine.match(/experiment[^\d]*(\d+)/i) || 
                             prevLine.match(/^(\d{1,3})[^\d]/) ||
                             prevLine.match(/\b(\d{3})\b/);
            if (prevMatch) {
              experimentNumber = prevMatch[1].padStart(3, '0');
              break;
            }
          }
        }
        
        // If still no experiment number, try to infer from movie count or position
        if (!experimentNumber) {
          // This is a fallback - we might need to be smarter about this
          // For now, skip lines without clear experiment numbers
          continue;
        }
        
        // Avoid duplicates
        if (!experiments.find(e => e.experimentNumber === experimentNumber)) {
          experiments.push({
            experimentNumber,
            title: `Experiment #${experimentNumber}`,
            postUrl: `https://bigscreenbadmovies.com/experiment-${experimentNumber}/`,
            date: null,
            host: defaultHost,
            movies,
            notes: ''
          });
        }
      }
    }
  }
  
  // Sort experiments by number
  experiments.sort((a, b) => parseInt(a.experimentNumber) - parseInt(b.experimentNumber));
  
  return experiments;
}

// Run the scraper
scrapeCompleteWordPressData()
  .then(experiments => {
    console.log('✅ WordPress scraping completed successfully!');
  })
  .catch(error => {
    console.error('❌ WordPress scraping failed:', error);
    process.exit(1);
  });
