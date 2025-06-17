#!/usr/bin/env node

import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const BASE_URL = 'https://bigscreenbadmovies.com';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeExperimentPost(postUrl) {
  try {
    console.log(`  📖 Scraping post: ${postUrl}`);
    await delay(1500); // Be respectful with delays
    
    const response = await axios.get(postUrl);
    const $ = cheerio.load(response.data);
    
    // Extract post date using the correct selector
    let postDate = '';
    const dateElement = $('.et_pb_title_meta_container .published').first();
    if (dateElement.length > 0) {
      postDate = dateElement.text().trim();
      console.log(`    📅 Date: "${postDate}"`);
    }
    
    // Extract host/author using the correct selector
    let host = 'Unknown';
    const hostElement = $('.et_pb_title_meta_container .author').first();
    if (hostElement.length > 0) {
      host = hostElement.text().trim();
      console.log(`    👤 Host: "${host}"`);
    }
    
    // Extract experiment image
    let experimentImage = null;
    const featuredImg = $('.wp-post-image, .entry-image img, .post-thumbnail img').first();
    if (featuredImg.length > 0) {
      experimentImage = featuredImg.attr('src') || featuredImg.attr('data-src');
    }
    
    if (!experimentImage) {
      const contentImg = $('.et_pb_post_content_0_tb_body img, .entry-content img').first();
      if (contentImg.length > 0) {
        experimentImage = contentImg.attr('src') || contentImg.attr('data-src');
      }
    }
    
    if (experimentImage) {
      console.log(`    🖼️  Image: ${experimentImage.substring(0, 50)}...`);
    }
    
    // Extract content
    const content = $('.et_pb_post_content_0_tb_body');
    if (content.length === 0) {
      console.log(`    ❌ No content found`);
      return null;
    }
    
    // Extract movies
    const movies = [];
    content.find('a').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href') || '';
      const text = $link.text().trim();
      
      if (
        href.includes('themoviedb.org') ||
        href.includes('imdb.com') ||
        href.includes('letterboxd.com')
      ) {
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
    
    console.log(`    🎬 Found ${movies.length} movies`);
    
    // Extract clean notes
    let notes = content.text().trim();
    notes = notes.replace(/\s+/g, ' ').substring(0, 300);
    
    const experimentMatch = postUrl.match(/experiment-(\d+)/);
    const experimentNumber = experimentMatch ? experimentMatch[1] : 'Unknown';
    
    const result = {
      experimentNumber,
      title: `Experiment #${experimentNumber}`,
      host,
      date: postDate,
      postUrl,
      experimentImage,
      movies,
      notes
    };
    
    return result;
    
  } catch (error) {
    console.error(`    ❌ Error scraping ${postUrl}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🎬 Starting LIMITED comprehensive WordPress experiment scraping...');
  
  // Load existing experiment URLs from current data
  const existingData = JSON.parse(fs.readFileSync('wordpress-scrape-results.json', 'utf8'));
  const experimentUrls = existingData.map(exp => exp.postUrl);
  
  console.log(`📋 Found ${experimentUrls.length} experiment URLs to process`);
  
  // Process only first 10 for testing
  const testUrls = experimentUrls.slice(0, 10);
  console.log(`🧪 Testing with first ${testUrls.length} experiments`);
  
  const experiments = [];
  let successCount = 0;
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i];
    console.log(`\n[${i + 1}/${testUrls.length}] Processing: ${url}`);
    
    const result = await scrapeExperimentPost(url);
    
    if (result) {
      experiments.push(result);
      successCount++;
    }
  }
  
  // Save results
  fs.writeFileSync('wordpress-comprehensive-test.json', JSON.stringify(experiments, null, 2));
  
  console.log(`\n✅ Test completed!`);
  console.log(`📊 Results: ${successCount}/${testUrls.length} successful`);
  console.log(`📄 Saved to: wordpress-comprehensive-test.json`);
  
  // Show summary
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
