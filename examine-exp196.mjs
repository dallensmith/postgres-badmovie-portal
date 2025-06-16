#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function examineSpecificPost() {
  console.log('🔍 Examining https://bigscreenbadmovies.com/experiment-196/');
  
  try {
    const response = await fetch('https://bigscreenbadmovies.com/experiment-196/');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    console.log('\n📍 Checking different content selectors:');
    
    const selectors = [
      '.post-content',
      '.entry-content', 
      'article .content',
      '.content',
      'main',
      '.post',
      'article'
    ];
    
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        const html = element.html();
        
        console.log(`\n${selector}:`);
        console.log(`  Found: ${element.length} elements`);
        console.log(`  Text length: ${text.length}`);
        console.log(`  HTML length: ${html ? html.length : 0}`);
        
        if (text.length > 0) {
          console.log(`  First 300 chars: "${text.substring(0, 300)}..."`);
          
          // Look for movie patterns
          const movieMatches = text.match(/[^|]*\(\d{4}\)[^|]*/g);
          if (movieMatches) {
            console.log(`  Movie patterns found: ${movieMatches.length}`);
            console.log(`  Movies: ${movieMatches.slice(0, 5).join(' | ')}`);
          }
        }
      }
    }
    
    // Also check the page title and meta info
    console.log('\n📋 Page info:');
    console.log(`  Title: "${$('title').text()}"`);
    console.log(`  H1: "${$('h1').text()}"`);
    console.log(`  H2: "${$('h2').text()}"`);
    
    // Check for author
    const authorSelectors = ['.author', '.by-author', '.post-author', '.entry-author'];
    for (const selector of authorSelectors) {
      const author = $(selector);
      if (author.length > 0) {
        console.log(`  Author (${selector}): "${author.text().trim()}"`);
      }
    }
    
    // Save raw HTML for inspection
    console.log('\n💾 Saving raw HTML for inspection...');
    const fs = await import('fs');
    fs.writeFileSync('experiment-196-raw.html', html);
    console.log('Saved to: experiment-196-raw.html');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

examineSpecificPost();
