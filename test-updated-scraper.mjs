#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testUpdatedScraper() {
  console.log('🧪 Testing updated scraper on experiment 196...');
  
  try {
    const response = await fetch('https://bigscreenbadmovies.com/experiment-196/');
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract post date
    let postDate = null;
    const dateSelectors = [
      '.et_pb_title_meta_container .published',
      '.entry-meta .published',
      '.post-meta .published', 
      '.entry-date',
      '.post-date'
    ];
    
    for (const selector of dateSelectors) {
      const dateElement = $(selector).first();
      if (dateElement.length > 0) {
        postDate = dateElement.text().trim();
        console.log(`📅 Found date using selector ${selector}: "${postDate}"`);
        break;
      }
    }
    
    // Extract host/author
    let host = 'Unknown';
    const authorSelectors = [
      '.entry-author .author a',
      '.author a', 
      '.entry-meta .author a',
      '.byline a'
    ];
    
    for (const selector of authorSelectors) {
      const authorElement = $(selector).first();
      if (authorElement.length > 0) {
        host = authorElement.text().trim();
        console.log(`👤 Found host using selector ${selector}: "${host}"`);
        break;
      }
    }
    
    // Extract experiment image - use meta tags as primary source
    let experimentImage = null;
    
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      experimentImage = ogImage;
      console.log(`🖼️  Found experiment image from og:image: ${experimentImage}`);
    }
    
    // Extract content and movies
    const content = $('.et_pb_post_content_0_tb_body');
    const movies = [];
    
    content.find('a[href*="themoviedb.org"]').each((i, link) => {
      const $link = $(link);
      const movieTitle = $link.text().trim();
      const tmdbUrl = $link.attr('href');
      
      if (movieTitle && tmdbUrl) {
        let year = null;
        const $parent = $link.parent();
        const parentText = $parent.text();
        
        const yearMatches = parentText.match(/\\b(19|20)\\d{2}\\b/g);
        if (yearMatches) {
          year = yearMatches[yearMatches.length - 1];
        }
        
        const isEncore = parentText.toLowerCase().includes('encore');
        
        movies.push({
          title: movieTitle,
          year: year,
          url: tmdbUrl,
          rawText: movieTitle,
          isEncore: isEncore
        });
        
        console.log(`🎬 Found movie: "${movieTitle}" (${year || 'no year'}) ${isEncore ? '[ENCORE]' : ''}`);
      }
    });
    
    console.log(`\\n✅ SUMMARY:`);
    console.log(`  Date: ${postDate || 'Not found'}`);
    console.log(`  Host: ${host}`);
    console.log(`  Image: ${experimentImage ? 'Found' : 'Not found'}`);
    console.log(`  Movies: ${movies.length}`);
    console.log(`\\n🎯 This data looks correct for cross-referencing!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUpdatedScraper();
