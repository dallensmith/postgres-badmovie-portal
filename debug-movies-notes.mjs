#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function debugMovieYearsAndNotes() {
  console.log('🔍 Debugging movie years and notes extraction for experiment 196...');
  
  try {
    const response = await fetch('https://bigscreenbadmovies.com/experiment-196/');
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const content = $('.et_pb_post_content_0_tb_body');
    console.log('\n📝 Content found:', content.length > 0 ? 'Yes' : 'No');
    
    if (content.length > 0) {
      console.log('\n🎬 Analyzing movie links:');
      content.find('a[href*="themoviedb.org"]').each((i, link) => {
        const $link = $(link);
        const movieTitle = $link.text().trim();
        const tmdbUrl = $link.attr('href');
        
        console.log(`\nMovie ${i + 1}: "${movieTitle}"`);
        console.log(`  URL: ${tmdbUrl}`);
        
        // Check parent text for year
        const $parent = $link.parent();
        const parentText = $parent.text();
        console.log(`  Parent text: "${parentText}"`);
        
        // Check surrounding elements for year
        const $nextSibling = $link.next();
        const nextText = $nextSibling.text();
        console.log(`  Next sibling text: "${nextText}"`);
        
        // Check for year patterns
        const yearMatches = parentText.match(/\b(19|20)\d{2}\b/g);
        console.log(`  Year matches in parent: ${yearMatches ? yearMatches.join(', ') : 'None'}`);
        
        // Check the whole paragraph
        const $paragraph = $link.closest('p');
        const paragraphText = $paragraph.text();
        console.log(`  Full paragraph: "${paragraphText}"`);
        
        const paragraphYears = paragraphText.match(/\((\d{4})\)/g);
        console.log(`  Years in paragraph: ${paragraphYears ? paragraphYears.join(', ') : 'None'}`);
      });
      
      console.log('\n📋 Analyzing notes extraction:');
      
      // Get all content text
      const fullContentText = content.text();
      console.log(`  Full content length: ${fullContentText.length} characters`);
      console.log(`  Full content preview: "${fullContentText.substring(0, 200)}..."`);
      
      // Test notes extraction logic
      const contentClone = content.clone();
      contentClone.find('a[href*="themoviedb.org"], a[href*="imdb.com"], a[href*="letterboxd.com"]').remove();
      contentClone.find('.nav-links, .navigation, .wp-block-buttons, .post-navigation').remove();
      contentClone.find('.post-meta, .entry-meta').remove();
      
      const paragraphs = contentClone.find('p').map((i, p) => $(p).text().trim()).get();
      console.log(`  Paragraphs after cleanup: ${paragraphs.length}`);
      paragraphs.forEach((p, i) => {
        if (p.length > 10) {
          console.log(`    P${i + 1}: "${p}"`);
        }
      });
      
      const notes = paragraphs.filter(p => p.length > 10 && !p.match(/^\s*(by |posted |comments|navigation)/i)).join('\n\n');
      console.log(`  Final notes: "${notes}"`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugMovieYearsAndNotes();
