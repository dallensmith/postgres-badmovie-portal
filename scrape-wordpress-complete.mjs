#!/usr/bin/env node

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const BASE_URL = 'https://bigscreenbadmovies.com';
const ARCHIVE_URL = `${BASE_URL}/archive/`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeExperimentPost(postUrl) {
  try {
    console.log(`  📖 Scraping post: ${postUrl}`);
    await delay(1000); // Be respectful with delays
    
    const response = await axios.get(postUrl);
    const $ = cheerio.load(response.data);
    
    // Extract post date from meta - be more specific to avoid archive dates
    let postDate = null;
    
    // Try specific selectors in order of priority to get just this post's date
    const dateSelectors = [
      '.et_pb_title_meta_container .published',  // Most specific for this theme  
      '.entry-meta .published',
      '.post-meta .published', 
      '.entry-date',
      '.post-date'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = $(selector).first();
      if (dateElement.length > 0) {
        postDate = dateElement.text().trim();
        console.log(`    📅 Found date using selector ${selector}: "${postDate}"`);
        break;
      }
    }
    
    // If still no date, try datetime attribute but only from first time element
    if (!postDate) {
      const timeElement = $('time[datetime]').first();
      if (timeElement.length > 0) {
        postDate = timeElement.attr('datetime') || timeElement.text().trim();
        console.log(`    📅 Found date from time element: "${postDate}"`);
      }
    }
    
    // Extract host/author
    let host = 'Unknown';
    const authorElement = $('.entry-author .author a, .author a, .entry-meta .author a, .byline a');
    if (authorElement.length) {
      host = authorElement.text().trim();
    }
    
    // Extract content - use the specific selector for this theme
    const content = $('.et_pb_post_content_0_tb_body, .entry-content, .post-content, .content');
    const movies = [];
    
    // Look for TMDB links and movie titles
    content.find('a[href*="themoviedb.org"]').each((i, link) => {
      const $link = $(link);
      const movieTitle = $link.text().trim();
      const tmdbUrl = $link.attr('href');
      
      if (movieTitle && tmdbUrl) {
        // Look for year - check next siblings for year patterns
        let year = null;
        const $parent = $link.parent();
        const parentText = $parent.text();
        
        // Look for year patterns like (1995) or just 1995
        const yearMatches = parentText.match(/\b(19|20)\d{2}\b/g);
        if (yearMatches) {
          year = yearMatches[yearMatches.length - 1]; // Take the last year found
        }
        
        movies.push({
          title: movieTitle,
          year: year,
          tmdbUrl: tmdbUrl
        });
      }
    });
    
    // Also look for other movie database links
    content.find('a[href*="imdb.com"], a[href*="letterboxd.com"]').each((i, link) => {
      const $link = $(link);
      const movieTitle = $link.text().trim();
      const movieUrl = $link.attr('href');
      
      if (movieTitle && movieUrl && !movies.find(m => m.title === movieTitle)) {
        let year = null;
        const $parent = $link.parent();
        const parentText = $parent.text();
        
        const yearMatches = parentText.match(/\b(19|20)\d{2}\b/g);
        if (yearMatches) {
          year = yearMatches[yearMatches.length - 1];
        }
        
        movies.push({
          title: movieTitle,
          year: year,
          tmdbUrl: null,
          movieUrl: movieUrl
        });
      }
    });
    
    // Extract notes - get text content but skip movie links and navigation
    let notes = '';
    const contentClone = content.clone();
    contentClone.find('a[href*="themoviedb.org"], a[href*="imdb.com"], a[href*="letterboxd.com"]').remove();
    contentClone.find('.nav-links, .navigation, .wp-block-buttons, .post-navigation').remove();
    
    const paragraphs = contentClone.find('p').map((i, p) => $(p).text().trim()).get();
    notes = paragraphs.filter(p => p.length > 10).join('\n');
    
    return {
      postDate,
      host,
      movies,
      notes: notes.trim()
    };
    
  } catch (error) {
    console.error(`  ❌ Error scraping ${postUrl}:`, error.message);
    return { postDate: null, host: 'Unknown', movies: [], notes: '' };
  }
}

async function scrapeArchivePage(pageUrl) {
  console.log(`📥 Fetching archive page: ${pageUrl}`);
  
  const response = await axios.get(pageUrl);
  const $ = cheerio.load(response.data);
  
  const experiments = [];
  
  // Find all experiment posts on this page - try multiple selectors
  const postSelectors = [
    '.post',
    'article',
    '.hentry',
    '.entry',
    '.post-item',
    '[class*="post"]'
  ];
  
  let posts = [];
  for (const selector of postSelectors) {
    posts = $(selector).toArray();
    if (posts.length > 0) {
      console.log(`  Found ${posts.length} posts using selector: ${selector}`);
      break;
    }
  }
  
  for (const element of posts) {
    const $post = $(element);
    
    // Extract experiment number from title - try multiple selectors
    const titleSelectors = [
      '.entry-title a',
      '.post-title a', 
      'h2 a',
      'h1 a',
      'h3 a',
      '.title a',
      'a[rel="bookmark"]'
    ];
    
    let titleElement = null;
    for (const selector of titleSelectors) {
      titleElement = $post.find(selector).first();
      if (titleElement.length && titleElement.text().trim()) {
        break;
      }
    }
    
    if (!titleElement || !titleElement.length) continue;
    
    const title = titleElement.text().trim();
    const postUrl = titleElement.attr('href');
    
    const experimentMatch = title.match(/Experiment[^\d]*#?(\d+)/i);
    
    if (!experimentMatch || !postUrl) continue;
    
    const experimentNumber = experimentMatch[1].padStart(3, '0');
    
    // Skip experiment 193 as requested
    if (experimentNumber === '193') {
      console.log(`  ⏭️  Skipping experiment 193 as requested`);
      continue;
    }
    
    console.log(`  🔍 Found experiment ${experimentNumber}: ${title}`);
    
    // Scrape the individual post for detailed data
    const postData = await scrapeExperimentPost(postUrl);
    
    experiments.push({
      experimentNumber,
      title,
      postUrl,
      date: postData.postDate,
      host: postData.host,
      movies: postData.movies,
      notes: postData.notes
    });
  }
  
  // Check for next page - try multiple selectors
  const nextPageSelectors = [
    '.nav-previous a',
    '.next a',
    '.navigation .next a',
    '.older-posts a',
    'a[rel="next"]',
    '.page-numbers.next'
  ];
  
  let nextPageLink = null;
  for (const selector of nextPageSelectors) {
    const element = $(selector);
    if (element.length) {
      nextPageLink = element.attr('href');
      if (nextPageLink) break;
    }
  }
  
  return {
    experiments,
    nextPageUrl: nextPageLink ? (nextPageLink.startsWith('http') ? nextPageLink : BASE_URL + nextPageLink) : null
  };
}

async function scrapeWordPressData() {
  console.log('🔍 Starting comprehensive WordPress scrape...');
  
  try {
    let allExperiments = [];
    let currentPageUrl = ARCHIVE_URL;
    let pageCount = 0;
    
    while (currentPageUrl && pageCount < 50) { // Safety limit
      pageCount++;
      console.log(`\n📄 Processing page ${pageCount}: ${currentPageUrl}`);
      
      const { experiments, nextPageUrl } = await scrapeArchivePage(currentPageUrl);
      allExperiments = allExperiments.concat(experiments);
      
      console.log(`  ✅ Found ${experiments.length} experiments on this page`);
      
      currentPageUrl = nextPageUrl;
      if (currentPageUrl) {
        console.log(`  ➡️  Next page detected: ${currentPageUrl}`);
        await delay(2000); // Be respectful between pages
      } else {
        console.log(`  🏁 No more pages found`);
      }
    }
    
    console.log(`\n🎉 COMPLETE: Total experiments found: ${allExperiments.length}`);
    
    // Sort by experiment number
    allExperiments.sort((a, b) => parseInt(a.experimentNumber) - parseInt(b.experimentNumber));
    
    // Save to file
    fs.writeFileSync('wordpress-complete-data.json', JSON.stringify(allExperiments, null, 2));
    console.log('💾 Saved to wordpress-complete-data.json');
    
    // Show sample data
    console.log('\n📊 Sample experiments:');
    allExperiments.slice(0, 5).forEach(exp => {
      console.log(`\nExperiment ${exp.experimentNumber}:`);
      console.log(`  Title: ${exp.title}`);
      console.log(`  Host: ${exp.host}`);
      console.log(`  Date: ${exp.date}`);
      console.log(`  Movies: ${exp.movies.length}`);
      exp.movies.slice(0, 2).forEach(movie => {
        console.log(`    - ${movie.title} ${movie.year ? `(${movie.year})` : ''}`);
      });
      if (exp.movies.length > 2) {
        console.log(`    ... and ${exp.movies.length - 2} more`);
      }
    });
    
    // Show statistics
    console.log('\n📈 Final Statistics:');
    console.log(`  Total experiments: ${allExperiments.length}`);
    console.log(`  Experiments with movies: ${allExperiments.filter(e => e.movies.length > 0).length}`);
    console.log(`  Total movies found: ${allExperiments.reduce((sum, e) => sum + e.movies.length, 0)}`);
    
    const hosts = [...new Set(allExperiments.map(e => e.host).filter(h => h !== 'Unknown'))];
    console.log(`  Unique hosts: ${hosts.join(', ')}`);
    
    const experimentRange = allExperiments.length > 0 ? 
      `${allExperiments[0].experimentNumber} - ${allExperiments[allExperiments.length - 1].experimentNumber}` : 'None';
    console.log(`  Experiment range: ${experimentRange}`);
    
    // Show experiments without movies for investigation
    const experimentsWithoutMovies = allExperiments.filter(e => e.movies.length === 0);
    if (experimentsWithoutMovies.length > 0) {
      console.log(`\n⚠️  ${experimentsWithoutMovies.length} experiments found without movies:`);
      experimentsWithoutMovies.slice(0, 10).forEach(exp => {
        console.log(`    ${exp.experimentNumber}: ${exp.title}`);
      });
      if (experimentsWithoutMovies.length > 10) {
        console.log(`    ... and ${experimentsWithoutMovies.length - 10} more`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the scraper
scrapeWordPressData();
