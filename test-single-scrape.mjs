#!/usr/bin/env node

import axios from 'axios';
import * as cheerio from 'cheerio';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrapeExperimentPost(postUrl) {
  try {
    console.log(`📖 Testing scraping of: ${postUrl}`);
    await delay(1000);
    
    const response = await axios.get(postUrl);
    const $ = cheerio.load(response.data);
    
    // Extract post date using the correct selector
    let postDate = '';
    const dateElement = $('.et_pb_title_meta_container .published').first();
    if (dateElement.length > 0) {
      postDate = dateElement.text().trim();
      console.log(`📅 Found date: "${postDate}"`);
    } else {
      console.log(`⚠️  No date found`);
    }
    
    // Extract host/author using the correct selector
    let host = 'Unknown';
    const hostElement = $('.et_pb_title_meta_container .author').first();
    if (hostElement.length > 0) {
      host = hostElement.text().trim();
      console.log(`👤 Found host: "${host}"`);
    } else {
      console.log(`⚠️  No host found`);
    }
    
    // Extract experiment image
    let experimentImage = null;
    const featuredImg = $('.wp-post-image, .entry-image img, .post-thumbnail img').first();
    if (featuredImg.length > 0) {
      experimentImage = featuredImg.attr('src') || featuredImg.attr('data-src');
      console.log(`🖼️  Found featured image: ${experimentImage}`);
    }
    
    if (!experimentImage) {
      const contentImg = $('.et_pb_post_content_0_tb_body img, .entry-content img').first();
      if (contentImg.length > 0) {
        experimentImage = contentImg.attr('src') || contentImg.attr('data-src');
        console.log(`🖼️  Found content image: ${experimentImage}`);
      }
    }
    
    if (!experimentImage) {
      console.log(`⚠️  No experiment image found`);
    }
    
    // Extract content
    const content = $('.et_pb_post_content_0_tb_body');
    if (content.length === 0) {
      console.log(`❌ Could not find main content`);
      return null;
    }
    
    console.log(`✅ Found content section (${content.text().length} chars)`);
    
    // Extract movies
    const movies = [];
    content.find('a').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href') || '';
      const text = $link.text().trim();
      
      if (
        href.includes('themoviedb.org') ||
        href.includes('imdb.com') ||
        href.includes('letterboxd.com')
      ) {
        console.log(`🎬 Found movie: "${text}" -> ${href}`);
        
        let year = null;
        const linkParent = $link.parent();
        const parentText = linkParent.text();
        const yearMatch = parentText.match(/\((\d{4})\)/);
        if (yearMatch) {
          year = yearMatch[1];
        }
        
        movies.push({
          title: text,
          year: year,
          url: href,
          rawText: text,
          isEncore: text.toLowerCase().includes('encore') || parentText.toLowerCase().includes('encore')
        });
      }
    });
    
    const experimentMatch = postUrl.match(/experiment-(\d+)/);
    const experimentNumber = experimentMatch ? experimentMatch[1] : 'Unknown';
    
    const result = {
      experimentNumber,
      title: `Experiment #${experimentNumber}`,
      host,
      date: postDate,
      postUrl,
      experimentImage,
      movies,
      notes: content.text().trim().substring(0, 200) + '...'
    };
    
    console.log(`\n✅ RESULT:`);
    console.log(JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return null;
  }
}

// Test with experiment 196
scrapeExperimentPost('https://bigscreenbadmovies.com/experiment-196/');
