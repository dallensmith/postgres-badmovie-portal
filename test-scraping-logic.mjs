#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// Simple test of the scraping logic on a few experiments
async function testScraping() {
  console.log('🧪 Testing scraping logic on known experiments...');
  
  const testUrls = [
    'https://bigscreenbadmovies.com/experiment-196/',
    'https://bigscreenbadmovies.com/experiment-200/',
    'https://bigscreenbadmovies.com/experiment-300/'
  ];
  
  for (const url of testUrls) {
    console.log(`\n🔍 Testing: ${url}`);
    
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Date
      const date = $('.et_pb_title_meta_container .published').first().text().trim();
      console.log(`  📅 Date: "${date}"`);
      
      // Host
      const host = $('.author a').first().text().trim() || 'Unknown';
      console.log(`  👤 Host: "${host}"`);
      
      // Image
      const firstImg = $('img').first();
      const experimentImage = firstImg.attr('src') || firstImg.attr('data-src');
      console.log(`  🖼️  Image: ${experimentImage ? 'Found' : 'Not found'} - ${experimentImage}`);
      
      // Movies count
      const content = $('.et_pb_post_content_0_tb_body');
      const movieLinks = content.find('a[href*="themoviedb.org"]').length;
      console.log(`  🎬 Movies: ${movieLinks} TMDb links found`);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testScraping();
