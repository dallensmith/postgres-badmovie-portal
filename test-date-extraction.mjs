#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testDateExtraction() {
  console.log('🧪 Testing date extraction for experiment 196...');
  
  try {
    const response = await fetch('https://bigscreenbadmovies.com/experiment-196/');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('\n📅 Testing different date selectors:');
    
    const dateSelectors = [
      '.et_pb_title_meta_container .published',
      '.entry-meta .published',
      '.post-meta .published', 
      '.entry-date',
      '.post-date',
      'time[datetime]'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = $(selector).first();
      if (dateElement.length > 0) {
        const text = dateElement.text().trim();
        const datetime = dateElement.attr('datetime');
        console.log(`  ✅ ${selector}: "${text}" ${datetime ? `(datetime: ${datetime})` : ''}`);
      } else {
        console.log(`  ❌ ${selector}: not found`);
      }
    }
    
    // Test the actual extraction logic
    let postDate = null;
    
    for (const selector of dateSelectors) {
      const dateElement = $(selector).first();
      if (dateElement.length > 0) {
        postDate = dateElement.text().trim();
        console.log(`\n🎯 Selected date: "${postDate}" from ${selector}`);
        break;
      }
    }
    
    if (!postDate) {
      console.log('\n❌ No date found with any selector');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDateExtraction();
