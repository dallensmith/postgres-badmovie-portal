#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

// Simple test to see what we can extract from a specific experiment post
async function testSinglePost() {
  console.log('🧪 Testing single post extraction...');
  
  const testUrl = 'https://bigscreenbadmovies.com/experiment-004/';
  
  try {
    console.log(`📄 Fetching: ${testUrl}`);
    const response = await fetch(testUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract different possible content areas
    console.log('\n🔍 Looking for content areas...');
    
    const areas = [
      '.entry-content',
      '.post-content', 
      '.content',
      'article .content',
      '.post-body',
      'main'
    ];
    
    for (const area of areas) {
      const content = $(area);
      if (content.length > 0) {
        console.log(`\n📍 Found content in: ${area}`);
        console.log(`   Text length: ${content.text().length}`);
        console.log(`   HTML length: ${content.html()?.length || 0}`);
        
        // Show first 200 chars of text
        const text = content.text().trim();
        console.log(`   Preview: "${text.substring(0, 200)}..."`);
        
        // Look for movie patterns
        const movieMatches = text.match(/[^|]+\(\d{4}\)/g);
        if (movieMatches) {
          console.log(`   Movie patterns found: ${movieMatches.length}`);
          console.log(`   First few: ${movieMatches.slice(0, 3).join(' | ')}`);
        }
      }
    }
    
    // Check for author/host
    console.log('\n👤 Looking for author/host...');
    const authorSelectors = [
      '.author a',
      '.by-author a',
      '.post-author a',
      '.entry-author a',
      '.post-meta .author'
    ];
    
    for (const selector of authorSelectors) {
      const author = $(selector);
      if (author.length > 0) {
        console.log(`   Found author in ${selector}: "${author.text().trim()}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSinglePost();
