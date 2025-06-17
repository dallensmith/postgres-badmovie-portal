#!/usr/bin/env node

import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugArchivePage() {
  console.log('🔍 Debugging archive page to see why no experiments are found...');
  
  try {
    const response = await axios.get('https://bigscreenbadmovies.com/archive/');
    const $ = cheerio.load(response.data);
    
    console.log('\n📄 First few posts on archive page:');
    
    $('.post').slice(0, 5).each((index, element) => {
      const $post = $(element);
      
      // Try all possible title selectors
      const titleSelectors = [
        '.entry-title a',
        '.post-title a', 
        'h2 a',
        'h1 a',
        'h3 a',
        '.title a',
        'a[rel="bookmark"]'
      ];
      
      let title = '';
      let titleElement = null;
      for (const selector of titleSelectors) {
        titleElement = $post.find(selector).first();
        if (titleElement.length && titleElement.text().trim()) {
          title = titleElement.text().trim();
          console.log(`\n  Post ${index + 1}:`);
          console.log(`    Selector: ${selector}`);
          console.log(`    Title: "${title}"`);
          console.log(`    URL: ${titleElement.attr('href')}`);
          
          // Test experiment regex
          const experimentMatch = title.match(/Experiment[^\\d]*#?(\\d+)/i);
          if (experimentMatch) {
            console.log(`    ✅ EXPERIMENT FOUND: ${experimentMatch[1]}`);
          } else {
            console.log(`    ❌ No experiment pattern matched`);
          }
          break;
        }
      }
      
      if (!title) {
        console.log(`\n  Post ${index + 1}: No title found with any selector`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugArchivePage();
