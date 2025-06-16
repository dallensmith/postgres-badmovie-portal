#!/usr/bin/env node

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

async function testExperiment196Scraping() {
  console.log('🎯 Testing proper scraping of experiment 196...');
  
  try {
    const response = await fetch('https://bigscreenbadmovies.com/experiment-196/');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract the main post content (not the archive listing)
    const postContentSelector = '.et_pb_post_content_0_tb_body';
    const postContent = $(postContentSelector);
    
    if (postContent.length === 0) {
      console.log('❌ Could not find main post content');
      return;
    }
    
    console.log('\n📍 Found main post content!');
    console.log(`Content length: ${postContent.text().length} characters`);
    console.log(`HTML length: ${postContent.html()?.length} characters`);
    
    // Extract movies from the content
    const movies = [];
    
    postContent.find('a').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href') || '';
      const text = $link.text().trim();
      
      // Look for movie database links
      if (
        href.includes('themoviedb.org') ||
        href.includes('imdb.com') ||
        href.includes('letterboxd.com')
      ) {
        console.log(`🎬 Found movie link: "${text}" -> ${href}`);
        movies.push({
          title: text,
          url: href,
          rawText: text
        });
      }
    });
    
    // Extract years from text content
    const contentText = postContent.text();
    console.log(`\n📝 Content text: "${contentText}"`);
    
    // Look for year patterns
    const yearMatches = contentText.match(/\((\d{4})\)/g);
    if (yearMatches) {
      console.log(`📅 Years found: ${yearMatches.join(', ')}`);
      
      // Try to associate years with movies
      if (movies.length === yearMatches.length) {
        movies.forEach((movie, index) => {
          if (yearMatches[index]) {
            movie.year = yearMatches[index].replace(/[()]/g, '');
          }
        });
      }
    }
    
    // Extract notes (text after the movies)
    let notes = contentText;
    
    // Remove movie titles and years to get just the notes
    movies.forEach(movie => {
      notes = notes.replace(movie.title, '');
    });
    yearMatches?.forEach(year => {
      notes = notes.replace(year, '');
    });
    
    notes = notes.replace(/\s+/g, ' ').trim();
    
    // Extract experiment info
    const title = $('h1.entry-title').text().trim();
    const author = $('.author a').text().trim();
    const date = $('.published').text().trim();
    
    const experimentData = {
      experimentNumber: '196',
      title: title,
      postUrl: 'https://bigscreenbadmovies.com/experiment-196/',
      date: date,
      host: author,
      movies: movies,
      notes: notes
    };
    
    console.log('\n✅ Extracted experiment data:');
    console.log(JSON.stringify(experimentData, null, 2));
    
    return experimentData;
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testExperiment196Scraping();
