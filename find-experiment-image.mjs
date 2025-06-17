#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function findExperimentImage() {
  console.log('🔍 Looking for the actual experiment/post image for experiment 196...');
  
  try {
    const response = await fetch('https://bigscreenbadmovies.com/experiment-196/');
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Check meta tags for featured image
    console.log('\n🖼️ Checking meta tags:');
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      console.log('✅ Found og:image:', ogImage);
    }
    
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    if (twitterImage) {
      console.log('✅ Found twitter:image:', twitterImage);
    }
    
    // Check for WordPress post thumbnail
    console.log('\n📸 Checking post thumbnail:');
    const postThumbnail = $('.post-thumbnail img, .entry-thumbnail img').first();
    if (postThumbnail.length > 0) {
      console.log('✅ Found post thumbnail:', postThumbnail.attr('src'));
    } else {
      console.log('❌ No post thumbnail found');
    }
    
    // Check in the post content area specifically
    console.log('\n📝 Images in main content area:');
    $('.et_pb_post_content_0_tb_body img').each((i, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      const alt = $(img).attr('alt') || '';
      const classes = $(img).attr('class') || '';
      console.log(`  ${i+1}. ${src}`);
      console.log(`      alt: "${alt}"`);
      console.log(`      classes: "${classes}"`);
      console.log('');
    });
    
    // Check the first image that's not a generic site image
    console.log('\n🎯 Analyzing first content image:');
    const firstContentImg = $('.et_pb_post_content_0_tb_body img').first();
    if (firstContentImg.length > 0) {
      const src = firstContentImg.attr('src') || firstContentImg.attr('data-src');
      console.log('First content image:', src);
      
      // Check if it looks like an experiment image
      if (src && !src.includes('Host_Desktop_Wallpaper') && !src.includes('logo')) {
        console.log('✅ This looks like the experiment image!');
      } else {
        console.log('⚠️ This might be a generic site image');
      }
    }
    
    // Let's also check for any class that might indicate featured image
    console.log('\n🔎 Looking for featured/wp-post-image classes:');
    $('img').each((i, img) => {
      const classes = $(img).attr('class') || '';
      if (classes.includes('wp-post-image') || classes.includes('featured') || classes.includes('attachment')) {
        const src = $(img).attr('src') || $(img).attr('data-src');
        console.log(`✅ Found featured image: ${src} (classes: ${classes})`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

findExperimentImage();
