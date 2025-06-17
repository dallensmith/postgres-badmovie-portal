#!/usr/bin/env node

import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugDateExtraction() {
  console.log('🔍 Debugging date extraction for experiment 196...');
  
  try {
    const response = await axios.get('https://bigscreenbadmovies.com/experiment-196/');
    const $ = cheerio.load(response.data);
    
    console.log('\n📅 Testing various date selectors:');
    
    const dateSelectors = [
      '.et_pb_title_meta_container .published',
      '.entry-meta .published', 
      '.post-meta .published',
      '.entry-date',
      '.post-date',
      'time[datetime]',
      '.et_pb_title_meta_container',
      '.entry-meta',
      '.post-meta'
    ];
    
    for (const selector of dateSelectors) {
      const elements = $(selector);
      console.log(`  ${selector}: found ${elements.length} elements`);
      if (elements.length > 0) {
        elements.each((i, el) => {
          const text = $(el).text().trim();
          const datetime = $(el).attr('datetime');
          console.log(`    [${i}] Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
          if (datetime) console.log(`    [${i}] Datetime: "${datetime}"`);
        });
      }
    }
    
    console.log('\n🏷️ Looking for title/header area:');
    const titleSelectors = [
      'h1',
      '.entry-title',
      '.post-title',
      '.et_pb_title_container'
    ];
    
    for (const selector of titleSelectors) {
      const elements = $(selector);
      console.log(`  ${selector}: found ${elements.length} elements`);
      if (elements.length > 0) {
        elements.each((i, el) => {
          const text = $(el).text().trim();
          console.log(`    [${i}] "${text}"`);
        });
      }
    }
    
    console.log('\n🔍 Looking for author/host info:');
    const authorSelectors = [
      '.author',
      '.entry-author',
      '.post-author',
      '.et_pb_title_meta_container .author',
      '.byline'
    ];
    
    for (const selector of authorSelectors) {
      const elements = $(selector);
      console.log(`  ${selector}: found ${elements.length} elements`);
      if (elements.length > 0) {
        elements.each((i, el) => {
          const text = $(el).text().trim();
          console.log(`    [${i}] "${text}"`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugDateExtraction();
