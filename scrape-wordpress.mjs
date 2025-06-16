#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

async function scrapeWordPressArchive() {
  console.log('🕷️  Starting WordPress archive scrape...');
  
  const baseUrl = 'https://bigscreenbadmovies.com';
  const archiveUrl = `${baseUrl}/archive/`;
  
  try {
    console.log(`📄 Fetching archive page: ${archiveUrl}`);
    const response = await fetch(archiveUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const experiments = [];
    
    // Find all experiment posts
    $('.post').each((index, element) => {
      const $post = $(element);
      
      // Extract experiment number from title
      const titleElement = $post.find('h2.entry-title a, h1.entry-title a');
      const title = titleElement.text().trim();
      const titleMatch = title.match(/experiment[^\d]*(\d+)/i);
      
      if (!titleMatch) {
        console.log(`⚠️  Could not extract experiment number from: "${title}"`);
        return;
      }
      
      const experimentNumber = titleMatch[1].padStart(3, '0');
      const postUrl = titleElement.attr('href');
      
      // Extract author (host)
      const authorElement = $post.find('.author a, .by-author a');
      const host = authorElement.text().trim() || 'Unknown';
      
      // Extract date
      const dateElement = $post.find('.entry-date, .post-date, time');
      const dateText = dateElement.attr('datetime') || dateElement.text().trim();
      
      // Extract content for movies and notes
      const content = $post.find('.entry-content, .post-content').html() || '';
      
      // First try to extract movies from the content
      const movies = extractMoviesFromContent(content, $);
      
      // If no movies found from parsing, try to extract from the raw notes text
      let notes = extractNotesFromContent(content, $);
      let finalMovies = movies;
      
      if (movies.length === 0 && notes) {
        // Parse movies from the notes text which contains the movie list
        finalMovies = parseMoviesFromText(notes);
        // Clean notes by removing the movie listings
        notes = cleanNotesFromMovies(notes);
      }
      
      console.log(`📝 Found Experiment ${experimentNumber}: ${finalMovies.length} movies`);
      
      experiments.push({
        experimentNumber,
        title,
        host,
        date: dateText,
        postUrl,
        movies: finalMovies,
        notes
      });
    });
    
    // If we didn't find posts with the expected structure, try a different approach
    if (experiments.length === 0) {
      console.log('🔍 No posts found with standard structure, trying alternative selectors...');
      
      // Try different selectors for different WordPress themes
      $('article, .hentry, .post-item').each((index, element) => {
        const $post = $(element);
        
        const titleElement = $post.find('h1 a, h2 a, h3 a, .entry-title a, .post-title a').first();
        const title = titleElement.text().trim();
        
        if (title.toLowerCase().includes('experiment')) {
          const titleMatch = title.match(/experiment[^\d]*(\d+)/i);
          if (titleMatch) {
            const experimentNumber = titleMatch[1].padStart(3, '0');
            const postUrl = titleElement.attr('href');
            
            console.log(`📝 Alternative: Found Experiment ${experimentNumber}`);
            
            experiments.push({
              experimentNumber,
              title,
              host: 'Unknown',
              date: '',
              postUrl,
              movies: [],
              notes: ''
            });
          }
        }
      });
    }
    
    console.log(`\n📊 Summary: Found ${experiments.length} experiments`);
    
    // Save results to file
    const outputPath = path.join(process.cwd(), 'wordpress-scrape-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(experiments, null, 2));
    console.log(`💾 Results saved to: ${outputPath}`);
    
    // Show sample data
    if (experiments.length > 0) {
      console.log('\n📋 Sample experiments:');
      experiments.slice(0, 5).forEach(exp => {
        console.log(`  ${exp.experimentNumber}: ${exp.title}`);
        console.log(`    Host: ${exp.host}`);
        console.log(`    Movies: ${exp.movies.length}`);
        console.log(`    URL: ${exp.postUrl}`);
        console.log('');
      });
    }
    
    return experiments;
    
  } catch (error) {
    console.error('❌ Error scraping WordPress archive:', error);
    throw error;
  }
}

function extractMoviesFromContent(content, $) {
  const movies = [];
  
  // Load content into cheerio for parsing
  const $content = cheerio.load(content);
  
  // Remove navigation and metadata elements
  $content('nav, .post-navigation, .entry-navigation').remove();
  
  // Get the text content
  let textContent = $content.text().trim();
  
  // The movies appear to be in format "Title (Year) | Title (Year)"
  // Split by | first to get individual movie entries
  const movieEntries = textContent.split('|').map(entry => entry.trim());
  
  for (const entry of movieEntries) {
    // Look for pattern: "Movie Title (Year)"
    const movieMatch = entry.match(/^(.+?)\s*\((\d{4})\)(.*)$/);
    
    if (movieMatch) {
      let title = movieMatch[1].trim();
      const year = movieMatch[2];
      const extra = movieMatch[3] || '';
      
      // Skip if it looks like metadata or navigation
      if (title.toLowerCase().includes('experiment') || 
          title.toLowerCase().includes('navigation') ||
          title.toLowerCase().includes('posted') ||
          title.toLowerCase().includes('author') ||
          title.toLowerCase().includes('comment') ||
          title.toLowerCase().includes('by ') ||
          title.length < 2) {
        continue;
      }
      
      // Clean up title - remove extra annotations
      title = title.replace(/^\s*[-–—]\s*/, ''); // Remove leading dashes
      title = title.replace(/\s+/g, ' ').trim();
      
      // Check for encore marking
      const isEncore = entry.toLowerCase().includes('encore') || extra.toLowerCase().includes('encore');
      
      // Skip duplicates
      const isDuplicate = movies.some(m => 
        m.title.toLowerCase() === title.toLowerCase() && m.year === year
      );
      
      if (!isDuplicate && title.length > 1) {
        movies.push({
          title,
          year,
          url: null,
          rawText: entry.trim(),
          isEncore
        });
      }
    }
  }
  
  // Also look for movie database links as additional source
  $content('a').each((index, element) => {
    const $link = $content(element);
    const href = $link.attr('href') || '';
    const text = $link.text().trim();
    
    // Skip if it's the collective link for experiment 193
    if (href.includes('collective') || href.includes('thecollective')) {
      return;
    }
    
    // Look for movie database links
    if (
      href.includes('imdb.com') ||
      href.includes('themoviedb.org') ||
      href.includes('letterboxd.com') ||
      href.includes('rottentomatoes.com')
    ) {
      // Extract year if present
      const yearMatch = text.match(/\((\d{4})\)/);
      const year = yearMatch ? yearMatch[1] : null;
      let title = text.replace(/\(\d{4}\)/, '').trim();
      
      // Clean up title
      title = title.replace(/\(encore\)/gi, '').trim();
      title = title.replace(/\(3D\)/gi, '').trim();
      
      // Check if we already have this movie from text parsing
      const isDuplicate = movies.some(m => 
        m.title.toLowerCase() === title.toLowerCase() && 
        (!year || !m.year || m.year === year)
      );
      
      if (!isDuplicate && title && title.length > 1) {
        movies.push({
          title,
          year,
          url: href,
          rawText: text,
          isEncore: text.toLowerCase().includes('encore')
        });
      }
    }
  });
  
  return movies;
}

function extractNotesFromContent(content, $) {
  // Load content into cheerio for parsing
  const $content = cheerio.load(content);
  
  // Remove movie links and other navigation elements
  $content('a').remove();
  $content('nav').remove();
  $content('.post-navigation').remove();
  
  // Get clean text content
  let notes = $content.text().trim();
  
  // Clean up whitespace
  notes = notes.replace(/\s+/g, ' ');
  
  // Limit length for sanity
  if (notes.length > 1000) {
    notes = notes.substring(0, 1000) + '...';
  }
  
  return notes;
}

function parseMoviesFromText(text) {
  const movies = [];
  
  if (!text) return movies;
  
  // Split by | to get individual movie entries
  const movieEntries = text.split('|').map(entry => entry.trim());
  
  for (const entry of movieEntries) {
    // Look for pattern: "Movie Title (Year)"
    const movieMatch = entry.match(/^(.+?)\s*\((\d{4})\)(.*)$/);
    
    if (movieMatch) {
      let title = movieMatch[1].trim();
      const year = movieMatch[2];
      const extra = movieMatch[3] || '';
      
      // Skip if it looks like metadata, navigation, or is too short
      if (title.toLowerCase().includes('experiment') || 
          title.toLowerCase().includes('navigation') ||
          title.toLowerCase().includes('posted') ||
          title.toLowerCase().includes('author') ||
          title.toLowerCase().includes('comment') ||
          title.toLowerCase().includes('by ') ||
          title.length < 2) {
        continue;
      }
      
      // Clean up title - remove extra annotations
      title = title.replace(/^\s*[-–—]\s*/, ''); // Remove leading dashes
      title = title.replace(/\s+/g, ' ').trim();
      
      // Check for encore marking
      const isEncore = entry.toLowerCase().includes('encore') || extra.toLowerCase().includes('encore');
      
      // Skip duplicates
      const isDuplicate = movies.some(m => 
        m.title.toLowerCase() === title.toLowerCase() && m.year === year
      );
      
      if (!isDuplicate && title.length > 1) {
        movies.push({
          title,
          year,
          url: null,
          rawText: entry.trim(),
          isEncore
        });
      }
    }
  }
  
  return movies;
}

function cleanNotesFromMovies(notes) {
  // Remove movie patterns from notes to get clean experiment notes
  let cleanedNotes = notes;
  
  // Remove movie patterns like "Title (Year)"
  cleanedNotes = cleanedNotes.replace(/[^|]*\(\d{4}\)[^|]*/g, '');
  
  // Remove pipe separators
  cleanedNotes = cleanedNotes.replace(/\|/g, '');
  
  // Clean up extra whitespace
  cleanedNotes = cleanedNotes.replace(/\s+/g, ' ').trim();
  
  // If what's left is very short or just whitespace, return empty
  if (cleanedNotes.length < 10) {
    return '';
  }
  
  return cleanedNotes;
}

// Run the scraper
scrapeWordPressArchive()
  .then(experiments => {
    console.log('✅ WordPress scraping completed successfully!');
  })
  .catch(error => {
    console.error('❌ WordPress scraping failed:', error);
    process.exit(1);
  });
