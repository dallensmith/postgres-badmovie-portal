#!/usr/bin/env node

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const BASE_URL = 'https://bigscreenbadmovies.com';

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
    
    // Extract post date using the correct selector
    let postDate = '';
    const dateElement = $('.et_pb_title_meta_container .published').first();
    if (dateElement.length > 0) {
      postDate = dateElement.text().trim();
      console.log(`    📅 Found date: "${postDate}"`);
    } else {
      console.log(`    ⚠️  No date found`);
    }
    
    // Extract host/author using the correct selector
    let host = 'Unknown';
    const hostElement = $('.et_pb_title_meta_container .author').first();
    if (hostElement.length > 0) {
      host = hostElement.text().trim();
      console.log(`    👤 Found host: "${host}"`);
    } else {
      console.log(`    ⚠️  No host found`);
    }
    
    // Extract experiment image (featured image or first image in content)
    let experimentImage = null;
    
    // Try featured image first
    const featuredImg = $('.wp-post-image, .entry-image img, .post-thumbnail img').first();
    if (featuredImg.length > 0) {
      experimentImage = featuredImg.attr('src') || featuredImg.attr('data-src');
    }
    
    // If no featured image, look for first image in content
    if (!experimentImage) {
      const contentImg = $('.et_pb_post_content_0_tb_body img, .entry-content img').first();
      if (contentImg.length > 0) {
        experimentImage = contentImg.attr('src') || contentImg.attr('data-src');
      }
    }
    
    if (experimentImage) {
      console.log(`    🖼️  Found experiment image: ${experimentImage}`);
    } else {
      console.log(`    ⚠️  No experiment image found`);
    }
    
    // Extract content using the correct selector
    const content = $('.et_pb_post_content_0_tb_body');
    if (content.length === 0) {
      console.log(`    ⚠️  Warning: Could not find main content with .et_pb_post_content_0_tb_body selector`);
      return null;
    }
    
    console.log(`    ✅ Found content section (${content.text().length} chars)`);
    
    // Extract movies
    const movies = [];
    content.find('a').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href') || '';
      const text = $link.text().trim();
      
      // Look for movie database links
      if (
        href.includes('themoviedb.org') ||
        href.includes('imdb.com') ||
        href.includes('letterboxd.com')
      ) {
        console.log(`    🎬 Found movie: "${text}" -> ${href}`);
        
        // Try to extract year from surrounding text
        let year = null;
        const linkParent = $link.parent();
        const parentText = linkParent.text();
        const yearMatch = parentText.match(/\((\d{4})\)/);
        if (yearMatch) {
          year = yearMatch[1];
        }
        
        movies.push({
          title: text,
          year: year,
          url: href,
          rawText: text,
          isEncore: text.toLowerCase().includes('encore') || parentText.toLowerCase().includes('encore')
        });
      }
    });
    
    // Extract clean notes (remove movie titles and years, keep the interesting bits)
    let notes = content.text().trim();
    
    // Remove the movie titles and years we already captured
    movies.forEach(movie => {
      const titlePattern = new RegExp(movie.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      notes = notes.replace(titlePattern, '');
      if (movie.year) {
        notes = notes.replace(new RegExp(`\\(${movie.year}\\)`, 'g'), '');
      }
    });
    
    // Clean up whitespace and extract useful info
    notes = notes
      .replace(/\s+/g, ' ')
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ');
    
    // Extract experiment number from URL
    const experimentMatch = postUrl.match(/experiment-(\d+)/);
    const experimentNumber = experimentMatch ? experimentMatch[1] : 'Unknown';
    
    // Extract title
    const titleElement = $('.entry-title, h1').first();
    const title = titleElement.text().trim() || `Experiment #${experimentNumber}`;
    
    const result = {
      experimentNumber,
      title,
      host,
      date: postDate,
      postUrl,
      experimentImage,
      movies,
      notes: notes.substring(0, 500) // Limit notes length
    };
    
    console.log(`    ✅ Extracted: ${movies.length} movies, host: ${host}, date: ${postDate}`);
    return result;
    
  } catch (error) {
    console.error(`    ❌ Error scraping ${postUrl}:`, error.message);
    return null;
  }
}

async function getExperimentLinks() {
  console.log('🔍 Fetching experiment links from archive...');
  
  try {
    const response = await axios.get(`${BASE_URL}/archive/`);
    const $ = cheerio.load(response.data);
    
    const links = [];
    
    // Look for experiment links in the archive
    $('a[href*="/experiment-"]').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (href && href.includes('/experiment-') && !links.find(l => l.url === href)) {
        links.push({
          url: href.startsWith('http') ? href : `${BASE_URL}${href}`,
          text: text
        });
      }
    });
    
    console.log(`📋 Found ${links.length} experiment links`);
    return links;
    
  } catch (error) {
    console.error('❌ Error fetching archive:', error.message);
    return [];
  }
}

async function main() {
  console.log('🎬 Starting comprehensive WordPress experiment scraping...');
  
  // Get all experiment links
  const experimentLinks = await getExperimentLinks();
  
  if (experimentLinks.length === 0) {
    console.log('❌ No experiment links found');
    return;
  }
  
  const experiments = [];
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`\n📖 Scraping ${experimentLinks.length} experiments...`);
  
  for (let i = 0; i < experimentLinks.length; i++) {
    const link = experimentLinks[i];
    console.log(`\n[${i + 1}/${experimentLinks.length}] Processing: ${link.text}`);
    
    const result = await scrapeExperimentPost(link.url);
    
    if (result) {
      experiments.push(result);
      successCount++;
    } else {
      errorCount++;
    }
    
    // Save progress every 10 experiments
    if ((i + 1) % 10 === 0) {
      console.log(`\n💾 Saving progress... (${successCount} successful, ${errorCount} errors)`);
      fs.writeFileSync('wordpress-comprehensive-data.json', JSON.stringify(experiments, null, 2));
    }
  }
  
  // Save final results
  console.log(`\n💾 Saving final results...`);
  fs.writeFileSync('wordpress-comprehensive-data.json', JSON.stringify(experiments, null, 2));
  
  console.log(`\n✅ Scraping completed!`);
  console.log(`📊 Results: ${successCount} successful, ${errorCount} errors`);
  console.log(`📄 Saved to: wordpress-comprehensive-data.json`);
  
  // Generate summary report
  const totalMovies = experiments.reduce((sum, exp) => sum + exp.movies.length, 0);
  const experimentsWithImages = experiments.filter(exp => exp.experimentImage).length;
  const experimentsWithHosts = experiments.filter(exp => exp.host !== 'Unknown').length;
  const experimentsWithDates = experiments.filter(exp => exp.date).length;
  
  console.log(`\n📈 Summary:`);
  console.log(`  - ${experiments.length} experiments processed`);
  console.log(`  - ${totalMovies} total movies found`);
  console.log(`  - ${experimentsWithImages} experiments have images`);
  console.log(`  - ${experimentsWithHosts} experiments have host info`);
  console.log(`  - ${experimentsWithDates} experiments have dates`);
}

main().catch(console.error);
