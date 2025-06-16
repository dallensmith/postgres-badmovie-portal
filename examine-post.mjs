#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function examineSpecificPos      // Look for different content sections beyond movies
      console.log('\n📝 ADDITIONAL CONTENT ANALYSIS:');
      
      // Check all paragraphs
      const allParagraphs = mainContent.find('p');
      console.log(`Total paragraphs: ${allParagraphs.length}`);
      
      allParagraphs.each((idx, element) => {
        const $p = $(element);
        const text = $p.text().trim();
        const html = $p.html();
        
        console.log(`\nP${idx + 1}:`);
        console.log(`  Text: "${text}"`);
        console.log(`  HTML: ${html}`);
        
        // Check if this looks like movies vs notes
        const hasMoviePattern = /\(\d{4}\)/.test(text);
        const hasPipeDelimited = text.includes(' | ');
        console.log(`  Contains year: ${hasMoviePattern}`);
        console.log(`  Contains pipes: ${hasPipeDelimited}`);
      }); postUrl = 'https://bigscreenbadmovies.com/experiment-196/';
  
  console.log(`🕷️  Examining post: ${postUrl}`);
  
  try {
    const response = await fetch(postUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract basic post info
    console.log('\n📋 BASIC POST INFO:');
    
    const title = $('h1.entry-title, h1.post-title, .entry-title h1').first().text().trim();
    console.log(`Title: ${title}`);
    
    const author = $('.author a, .by-author a, .post-author a').first().text().trim();
    console.log(`Author: ${author}`);
    
    const date = $('.entry-date, .post-date, time').first().text().trim();
    console.log(`Date: ${date}`);
    
    // Examine content structure
    console.log('\n🔍 CONTENT STRUCTURE:');
    
    // Try different content selectors
    const contentSelectors = [
      '.entry-content',
      '.post-content',
      '.content',
      'article .content',
      '.post-body',
      'main .content'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        console.log(`${selector}: Found (${text.length} chars)`);
        
        // Show first 200 chars as sample
        if (text.length > 0) {
          console.log(`  Sample: ${text.substring(0, 200)}...`);
        }
      } else {
        console.log(`${selector}: Not found`);
      }
    }
    
    // Focus on the main content
    const mainContent = $('.post-content').first();
    
    if (mainContent.length > 0) {
      console.log('\n🎬 MOVIE ANALYSIS:');
      
      // Get raw HTML first
      const rawHTML = mainContent.html();
      console.log(`Raw HTML length: ${rawHTML.length} characters`);
      console.log(`\nFirst 500 chars of HTML:\n${rawHTML.substring(0, 500)}...`);
      
      const fullText = mainContent.text();
      console.log(`\nExtracted text length: ${fullText.length} characters`);
      
      // Show a larger sample
      console.log(`\nFirst 500 characters:\n${fullText.substring(0, 500)}...`);
      
      if (fullText.length > 500) {
        console.log(`\nLast 500 characters:\n...${fullText.substring(fullText.length - 500)}`);
      }
      
      // Look for movie patterns
      const moviePatterns = [
        /([^|\n]+?)\s*\((\d{4})\)/g,  // Title (Year)
        /([A-Za-z0-9\s:.'!?-]+)\s*\((\d{4})\)/g  // More flexible title pattern
      ];
      
      for (let i = 0; i < moviePatterns.length; i++) {
        const pattern = moviePatterns[i];
        const matches = [...fullText.matchAll(pattern)];
        console.log(`\nPattern ${i + 1}: Found ${matches.length} matches`);
        
        if (matches.length > 0) {
          console.log('First 10 matches:');
          matches.slice(0, 10).forEach((match, idx) => {
            console.log(`  ${idx + 1}. "${match[1].trim()}" (${match[2]})`);
          });
        }
      }
      
      // Look for pipe separators
      const pipeSeparated = fullText.split('|').map(s => s.trim()).filter(s => s.length > 0);
      console.log(`\n📊 Pipe-separated segments: ${pipeSeparated.length}`);
      
      if (pipeSeparated.length > 0) {
        console.log('First 10 segments:');
        pipeSeparated.slice(0, 10).forEach((segment, idx) => {
          console.log(`  ${idx + 1}. "${segment}"`);
        });
      }
      
      // Look for TMDB/IMDB links
      console.log('\n🔗 MOVIE DATABASE LINKS:');
      mainContent.find('a').each((idx, element) => {
        const $link = $(element);
        const href = $link.attr('href') || '';
        const text = $link.text().trim();
        
        if (href.includes('themoviedb.org') || href.includes('imdb.com') || href.includes('letterboxd.com')) {
          console.log(`  Link: "${text}" -> ${href}`);
        }
      });
      
      // Check for different content sections
      console.log('\n📝 CONTENT SECTIONS:');
      
      const paragraphs = mainContent.find('p');
      console.log(`Paragraphs found: ${paragraphs.length}`);
      
      paragraphs.each((idx, element) => {
        const $p = $(element);
        const text = $p.text().trim();
        if (text.length > 0) {
          console.log(`  P${idx + 1}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        }
      });
      
      // Look for lists
      const lists = mainContent.find('ul, ol');
      console.log(`\nLists found: ${lists.length}`);
      
      lists.each((idx, element) => {
        const $list = $(element);
        const items = $list.find('li');
        console.log(`  List ${idx + 1}: ${items.length} items`);
        
        items.slice(0, 5).each((itemIdx, li) => {
          const $li = $(li);
          const text = $li.text().trim();
          console.log(`    - ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error examining post:', error);
  }
}

examineSpecificPost();
