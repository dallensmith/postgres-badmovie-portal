#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testFixedExtraction() {
  console.log('🧪 Testing fixed movie years and notes extraction...');
  
  try {
    const response = await fetch('https://bigscreenbadmovies.com/experiment-196/');
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const content = $('.et_pb_post_content_0_tb_body');
    const movies = [];
    
    // Test movie extraction with fixed year regex
    content.find('a[href*="themoviedb.org"]').each((i, link) => {
      const $link = $(link);
      const movieTitle = $link.text().trim();
      const tmdbUrl = $link.attr('href');
      
      if (movieTitle && tmdbUrl) {
        let year = null;
        const $parent = $link.parent();
        const parentText = $parent.text();
        
        // Fixed year regex
        const yearMatches = parentText.match(/\b(19\d{2}|20\d{2})\b/g);
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
        
        console.log(`🎬 Movie: "${movieTitle}" (${year || 'no year'}) ${isEncore ? '[ENCORE]' : ''}`);
      }
    });
    
    // Test improved notes extraction
    console.log('\\n📋 Testing notes extraction:');
    const contentClone = content.clone();
    contentClone.find('a[href*="themoviedb.org"], a[href*="imdb.com"], a[href*="letterboxd.com"]').remove();
    contentClone.find('.nav-links, .navigation, .wp-block-buttons, .post-navigation').remove();
    contentClone.find('.post-meta, .entry-meta').remove();
    
    const paragraphs = contentClone.find('p').map((i, p) => $(p).text().trim()).get();
    let notes = paragraphs.filter(p => p.length > 10 && !p.match(/^\\s*(by |posted |comments|navigation)/i)).join('\\n\\n');
    
    // Clean up notes - remove movie titles
    movies.forEach(movie => {
      notes = notes.replace(new RegExp(movie.title.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'gi'), '');
    });
    
    // Remove standalone years and clean up
    notes = notes.replace(/\\s*\\(\\d{4}\\)\\s*/g, ' ');
    notes = notes.replace(/^\\s*\\(\\d{4}\\)/, '');
    notes = notes.replace(/\\s+/g, ' ').trim();
    
    console.log(`Final notes: "${notes}"`);
    console.log(`Notes length: ${notes.length} characters`);
    
    console.log('\\n✅ SUMMARY:');
    console.log(`  Movies found: ${movies.length}`);
    console.log(`  Years extracted: ${movies.filter(m => m.year).length}/${movies.length}`);
    console.log(`  Notes extracted: ${notes.length > 0 ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFixedExtraction();
