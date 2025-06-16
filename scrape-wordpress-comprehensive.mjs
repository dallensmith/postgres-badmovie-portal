#!/usr/bin/env node

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const BASE_URL = 'https://bigscreenbadmovies.com';
const ARCHIVE_URL = `${BASE_URL}/archive/`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Comprehensive experiment post scraper
 * Extracts: movies, host, date, experiment image, and clean notes
 */
async function scrapeExperimentPost(postUrl) {
  try {
    console.log(`  📖 Scraping post: ${postUrl}`);
    await delay(1000); // Be respectful with delays
    
    const response = await axios.get(postUrl);
    const $ = cheerio.load(response.data);
    
    // Extract post date - use the most specific selector first
    let postDate = null;
    const dateSelectors = [
      '.et_pb_title_meta_container .published',  // Theme-specific
      '.entry-meta .published',
      '.post-meta .published', 
      '.entry-date',
      '.post-date',
      'time[datetime]'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = $(selector).first();
      if (dateElement.length > 0) {
        postDate = dateElement.text().trim();
        console.log(`    📅 Found date using selector ${selector}: "${postDate}"`);
        break;
      }
    }
    
    // If still no date, try datetime attribute
    if (!postDate) {
      const timeElement = $('time[datetime]').first();
      if (timeElement.length > 0) {
        const datetime = timeElement.attr('datetime');
        postDate = datetime || timeElement.text().trim();
        console.log(`    📅 Found date from datetime: "${postDate}"`);
      }
    }
    
    // Extract host/author - try multiple selectors
    let host = 'Unknown';
    const authorSelectors = [
      '.entry-author .author a',
      '.author a', 
      '.entry-meta .author a',
      '.byline a',
      '.post-author a',
      '.vcard .fn'
    ];
    
    for (const selector of authorSelectors) {
      const authorElement = $(selector).first();
      if (authorElement.length > 0) {
        host = authorElement.text().trim();
        console.log(`    👤 Found host using selector ${selector}: "${host}"`);
        break;
      }
    }
    
    // Extract experiment image - use meta tags as primary source
    let experimentImage = null;
    
    // Try Open Graph image meta tag first (most reliable for experiment image)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      experimentImage = ogImage;
      console.log(`    🖼️  Found experiment image from og:image: ${experimentImage}`);
    }
    
    // Fallback to Twitter image meta tag
    if (!experimentImage) {
      const twitterImage = $('meta[name="twitter:image"]').attr('content');
      if (twitterImage) {
        experimentImage = twitterImage;
        console.log(`    🖼️  Found experiment image from twitter:image: ${experimentImage}`);
      }
    }
    
    // Final fallback: first image in content (but exclude generic site images)
    if (!experimentImage) {
      const firstImg = $('.et_pb_post_content_0_tb_body img, .entry-content img').first();
      if (firstImg.length > 0) {
        const imgSrc = firstImg.attr('src') || firstImg.attr('data-src');
        if (imgSrc && !imgSrc.includes('Host_Desktop_Wallpaper') && !imgSrc.includes('logo')) {
          experimentImage = imgSrc;
          console.log(`    🖼️  Found experiment image from content: ${experimentImage}`);
        }
      }
    }
    
    if (experimentImage) {
      console.log(`    🖼️  Found experiment image: ${experimentImage}`);
    }
    
    // Extract content using the correct selector
    const content = $('.et_pb_post_content_0_tb_body');
    if (content.length === 0) {
      console.log(`    ⚠️  Warning: Could not find main content with .et_pb_post_content_0_tb_body selector`);
      return { postDate, host, experimentImage, movies: [], notes: '' };
    }
    
    const movies = [];
    
    // Extract movies from TMDb links
    content.find('a[href*="themoviedb.org"]').each((i, link) => {
      const $link = $(link);
      const movieTitle = $link.text().trim();
      const tmdbUrl = $link.attr('href');
      
      if (movieTitle && tmdbUrl) {
        // Extract year from surrounding text
        let year = null;
        const $parent = $link.parent();
        const parentText = $parent.text();
        
        // Look for year patterns like (1995) or just 1995
        const yearMatches = parentText.match(/\b(19\d{2}|20\d{2})\b/g);
        if (yearMatches) {
          year = yearMatches[yearMatches.length - 1];
        }
        
        // Check if it's marked as encore
        const isEncore = parentText.toLowerCase().includes('encore') || 
                        $link.closest('p').text().toLowerCase().includes('encore');
        
        movies.push({
          title: movieTitle,
          year: year,
          url: tmdbUrl,
          rawText: movieTitle,
          isEncore: isEncore
        });
        
        console.log(`    🎬 Found movie: "${movieTitle}" (${year || 'no year'}) ${isEncore ? '[ENCORE]' : ''}`);
      }
    });
    
    // Also extract from IMDb and Letterboxd links
    content.find('a[href*="imdb.com"], a[href*="letterboxd.com"]').each((i, link) => {
      const $link = $(link);
      const movieTitle = $link.text().trim();
      const movieUrl = $link.attr('href');
      
      if (movieTitle && movieUrl && !movies.find(m => m.title === movieTitle)) {
        let year = null;
        const $parent = $link.parent();
        const parentText = $parent.text();
        
        const yearMatches = parentText.match(/\b(19\d{2}|20\d{2})\b/g);
        if (yearMatches) {
          year = yearMatches[yearMatches.length - 1];
        }
        
        const isEncore = parentText.toLowerCase().includes('encore') || 
                        $link.closest('p').text().toLowerCase().includes('encore');
        
        movies.push({
          title: movieTitle,
          year: year,
          url: movieUrl,
          rawText: movieTitle,
          isEncore: isEncore
        });
        
        console.log(`    🎬 Found movie (non-TMDb): "${movieTitle}" (${year || 'no year'}) ${isEncore ? '[ENCORE]' : ''}`);
      }
    });
    
    // Extract clean notes - get text content but remove movie links and navigation
    let notes = '';
    const contentClone = content.clone();
    
    // Remove movie links and navigation elements
    contentClone.find('a[href*="themoviedb.org"], a[href*="imdb.com"], a[href*="letterboxd.com"]').remove();
    contentClone.find('.nav-links, .navigation, .wp-block-buttons, .post-navigation').remove();
    contentClone.find('.post-meta, .entry-meta').remove();
    
    // Get paragraph text and filter out short/empty ones
    const paragraphs = contentClone.find('p').map((i, p) => $(p).text().trim()).get();
    notes = paragraphs.filter(p => p.length > 10 && !p.match(/^\s*(by |posted |comments|navigation)/i)).join('\n\n');
    
    // Clean up notes - remove movie titles that might still be in there
    movies.forEach(movie => {
      notes = notes.replace(new RegExp(movie.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
    });
    
    // Remove standalone years in parentheses and clean up whitespace
    notes = notes.replace(/\s*\(\d{4}\)\s*/g, ' ');
    notes = notes.replace(/^\s*\(\d{4}\)/, ''); // Remove year at start
    notes = notes.replace(/\s+/g, ' ').trim();
    
    console.log(`    📝 Extracted ${movies.length} movies and notes (${notes.length} chars)`);
    
    return {
      postDate: postDate || '',
      host: host || 'Unknown',
      experimentImage: experimentImage || null,
      movies: movies,
      notes: notes
    };
    
  } catch (error) {
    console.error(`  ❌ Error scraping ${postUrl}:`, error.message);
    return { 
      postDate: '', 
      host: 'Unknown', 
      experimentImage: null,
      movies: [], 
      notes: '' 
    };
  }
}

/**
 * Scrape a single archive page for experiment links
 */
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
    
    const experimentMatch = title.match(/Experiment\s*#?(\d+)/i);
    
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
      experimentImage: postData.experimentImage,
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
    nextPageUrl: nextPageLink
  };
}

/**
 * Main scraping function - comprehensive WordPress data extraction
 */
async function scrapeComprehensiveWordPressData() {
  console.log('🔍 Starting COMPREHENSIVE WordPress scrape...');
  console.log('Will extract: experiments, hosts, dates, images, movies, and notes');
  
  try {
    let allExperiments = [];
    let currentPageUrl = ARCHIVE_URL;
    let pageCount = 0;
    
    while (currentPageUrl && pageCount < 50) { // Full scrape - safety limit
      pageCount++;
      console.log(`\\n📄 Processing page ${pageCount}: ${currentPageUrl}`);
      
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
    
    console.log(`\\n🎉 COMPLETE: Total experiments found: ${allExperiments.length}`);
    
    // Sort by experiment number
    allExperiments.sort((a, b) => parseInt(a.experimentNumber) - parseInt(b.experimentNumber));
    
    // Save to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `wordpress-comprehensive-data-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(allExperiments, null, 2));
    console.log(`💾 Saved to ${filename}`);
    
    // Also save as the main file for easy access
    fs.writeFileSync('wordpress-comprehensive-data.json', JSON.stringify(allExperiments, null, 2));
    console.log(`💾 Also saved to wordpress-comprehensive-data.json`);
    
    // Show comprehensive statistics
    console.log('\\n📊 COMPREHENSIVE STATISTICS:');
    console.log(`  Total experiments: ${allExperiments.length}`);
    console.log(`  Experiments with movies: ${allExperiments.filter(e => e.movies.length > 0).length}`);
    console.log(`  Total movies found: ${allExperiments.reduce((sum, e) => sum + e.movies.length, 0)}`);
    console.log(`  Experiments with dates: ${allExperiments.filter(e => e.date && e.date.length > 0).length}`);
    console.log(`  Experiments with images: ${allExperiments.filter(e => e.experimentImage).length}`);
    
    const hosts = [...new Set(allExperiments.map(e => e.host).filter(h => h !== 'Unknown'))];
    console.log(`  Unique hosts found: ${hosts.length} - ${hosts.join(', ')}`);
    
    const experimentRange = allExperiments.length > 0 ? 
      `${allExperiments[0].experimentNumber} - ${allExperiments[allExperiments.length - 1].experimentNumber}` : 'None';
    console.log(`  Experiment range: ${experimentRange}`);
    
    // Show sample data with full details
    console.log('\\n📋 Sample comprehensive experiment data:');
    allExperiments.slice(0, 3).forEach(exp => {
      console.log(`\\nExperiment ${exp.experimentNumber}:`);
      console.log(`  Title: ${exp.title}`);
      console.log(`  Host: ${exp.host}`);
      console.log(`  Date: ${exp.date || 'No date'}`);
      console.log(`  Image: ${exp.experimentImage ? 'Yes' : 'No'}`);
      console.log(`  Movies: ${exp.movies.length}`);
      exp.movies.slice(0, 2).forEach(movie => {
        console.log(`    - ${movie.title} ${movie.year ? `(${movie.year})` : ''} ${movie.isEncore ? '[ENCORE]' : ''}`);
      });
      if (exp.movies.length > 2) {
        console.log(`    ... and ${exp.movies.length - 2} more movies`);
      }
      console.log(`  Notes: ${exp.notes.length > 0 ? `${exp.notes.substring(0, 100)}${exp.notes.length > 100 ? '...' : ''}` : 'No notes'}`);
    });
    
    // Show experiments without key data for investigation
    const experimentsWithoutMovies = allExperiments.filter(e => e.movies.length === 0);
    const experimentsWithoutDates = allExperiments.filter(e => !e.date || e.date.length === 0);
    const experimentsWithoutHosts = allExperiments.filter(e => e.host === 'Unknown');
    
    if (experimentsWithoutMovies.length > 0) {
      console.log(`\\n⚠️  ${experimentsWithoutMovies.length} experiments found without movies:`);
      experimentsWithoutMovies.slice(0, 5).forEach(exp => {
        console.log(`    ${exp.experimentNumber}: ${exp.title}`);
      });
    }
    
    if (experimentsWithoutDates.length > 0) {
      console.log(`\\n⚠️  ${experimentsWithoutDates.length} experiments found without dates`);
    }
    
    if (experimentsWithoutHosts.length > 0) {
      console.log(`\\n⚠️  ${experimentsWithoutHosts.length} experiments found without host information`);
    }
    
    console.log('\\n🎯 COMPREHENSIVE SCRAPE COMPLETE!');
    console.log('This data is now ready for cross-referencing with your CSV and database.');
    
    return allExperiments;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the comprehensive scraper
scrapeComprehensiveWordPressData()
  .then(experiments => {
    console.log('\\n✅ COMPREHENSIVE WordPress scraping completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\\n❌ COMPREHENSIVE WordPress scraping failed:', error);
    process.exit(1);
  });
