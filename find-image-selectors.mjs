#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function findImageSelectors() {
  console.log('🔍 Finding image selectors for experiment 196...');
  
  try {
    const response = await fetch('https://bigscreenbadmovies.com/experiment-196/');
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('\n📸 All img tags:');
    $('img').each((i, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      const alt = $(img).attr('alt') || '';
      const classes = $(img).attr('class') || '';
      console.log(`  ${i+1}. src: ${src}`);
      console.log(`      alt: ${alt}`);
      console.log(`      class: ${classes}`);
      console.log('');
    });
    
    // Check for featured image specifically
    console.log('\n🖼️ Testing featured image selectors:');
    const featuredSelectors = [
      '.wp-post-image',
      '.entry-image img',
      '.post-thumbnail img',
      '.featured-image img',
      '.et_pb_image img',
      '.et_pb_main_blurb_image img',
      '.et_pb_blurb_content img'
    ];
    
    featuredSelectors.forEach(selector => {
      const img = $(selector).first();
      if (img.length > 0) {
        console.log(`  ✅ Found with ${selector}: ${img.attr('src') || img.attr('data-src')}`);
      } else {
        console.log(`  ❌ Not found: ${selector}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findImageSelectors();
