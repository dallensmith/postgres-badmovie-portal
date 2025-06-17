#!/usr/bin/env node

/**
 * Test Field-by-Field Movie Creation
 * 
 * This script tests movie creation by adding one field at a time
 * to identify which field is causing the validation error.
 */

import fetch from 'node-fetch';

const SERVER_PORT = 3001; // Based on the browser console

/**
 * Test adding fields one by one
 */
async function testFieldByField() {
    console.log('🔍 Testing movie creation field by field...');
    
    // Base movie that works
    const baseMovie = {
        movieTitle: "Test Movie Field Check"
    };
    
    // Fields to test one by one
    const fieldsToTest = [
        { movieYear: "2017" },
        { movieOriginalTitle: "Original Title" },
        { movieOverview: "This is a test overview" },
        { movieRuntime: 120 },
        { movieTagline: "A test tagline" },
        { movieContentRating: "R" },
        { movieBudget: "1000000" },
        { movieBoxOffice: "5000000" },
        { moviePoster: "https://example.com/poster.jpg" },
        { movieBackdrop: "https://example.com/backdrop.jpg" },
        { movieTrailer: "https://youtube.com/watch?v=test" },
        { movieTmdbId: "12345" },
        { movieTmdbUrl: "https://themoviedb.org/movie/12345" },
        { movieTmdbRating: "7.5" },
        { movieTmdbVotes: "1000" },
        { movieImdbId: "tt1234567" },
        { movieImdbUrl: "https://imdb.com/title/tt1234567" },
        { movieAmazonLink: "https://amazon.com/movie" },
        { movieActors: ["Scott Shaw", "John Doe"] },
        { movieDirectors: ["Director One"] },
        { movieWriters: ["Writer One"] },
        { movieGenres: ["Action", "Comedy"] },
        { movieCountries: ["USA"] },
        { movieLanguages: ["English"] },
        { movieStudios: ["Studio One"] },
        { movieCharacters: {actors: ["Scott Shaw"]} },
        { movieReleaseDate: "2017-01-01" }
    ];
    
    let workingMovie = { ...baseMovie };
    
    for (let i = 0; i < fieldsToTest.length; i++) {
        const fieldToAdd = fieldsToTest[i];
        const fieldName = Object.keys(fieldToAdd)[0];
        const testMovie = { ...workingMovie, ...fieldToAdd };
        
        console.log(`\n${i + 1}. Testing with field: ${fieldName} = ${JSON.stringify(fieldToAdd[fieldName])}`);
        
        try {
            const response = await fetch(`http://localhost:${SERVER_PORT}/api/movies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testMovie)
            });
            
            if (response.ok) {
                const createdMovie = await response.json();
                console.log(`   ✅ Success! Movie ID: ${createdMovie.id}`);
                workingMovie = { ...testMovie }; // This field is safe, add it to working set
                
                // Clean up the test movie
                try {
                    await fetch(`http://localhost:${SERVER_PORT}/api/movies/${createdMovie.id}`, {
                        method: 'DELETE'
                    });
                } catch (deleteError) {
                    // Ignore delete errors
                }
            } else {
                const errorText = await response.text();
                console.log(`   ❌ FAILED! Status: ${response.status}`);
                console.log(`   Error: ${errorText}`);
                console.log(`   🚨 PROBLEM FIELD IDENTIFIED: ${fieldName}`);
                console.log(`   Value causing issue:`, fieldToAdd[fieldName]);
                
                // Try to get more details from the error
                try {
                    const errorJson = JSON.parse(errorText);
                    console.log(`   Error details:`, errorJson);
                } catch (parseError) {
                    // Error is not JSON
                }
                
                // Don't add this field to working movie, continue with next field
            }
            
        } catch (error) {
            console.log(`   ❌ Network error: ${error.message}`);
            console.log(`   🚨 PROBLEM FIELD IDENTIFIED: ${fieldName}`);
        }
    }
    
    console.log('\n📊 Final working movie structure:');
    console.log(JSON.stringify(workingMovie, null, 2));
}

/**
 * Test with typical form data
 */
async function testTypicalFormData() {
    console.log('\n🎭 Testing with typical UI form data...');
    
    // This mimics what the UI would send
    const formData = {
        movieTitle: "Diamond Eye: T.H.O.T. Process 2",
        movieOriginalTitle: "",
        movieYear: "2017",
        movieReleaseDate: "",
        movieRuntime: "",
        movieTagline: "",
        movieOverview: "A test movie",
        movieContentRating: "",
        movieBudget: "",
        movieBoxOffice: "",
        moviePoster: "",
        movieBackdrop: "",
        movieTrailer: "",
        movieTmdbId: "",
        movieTmdbUrl: "",
        movieTmdbRating: "",
        movieTmdbVotes: "",
        movieImdbId: "",
        movieImdbUrl: "",
        movieCharacters: "",
        movieAmazonLink: "",
        movieActors: "Scott Shaw",
        movieDirectors: "Scott Shaw",
        movieWriters: "",
        movieGenres: "",
        movieCountries: "",
        movieLanguages: "",
        movieStudios: ""
    };
    
    console.log('Form data to test:', JSON.stringify(formData, null, 2));
    
    try {
        const response = await fetch(`http://localhost:${SERVER_PORT}/api/movies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const createdMovie = await response.json();
            console.log('✅ Form data test successful! Movie ID:', createdMovie.id);
        } else {
            const errorText = await response.text();
            console.log('❌ Form data test failed');
            console.log('Status:', response.status);
            console.log('Error:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
}

/**
 * Main execution
 */
async function main() {
    await testTypicalFormData();
    await testFieldByField();
}

main().catch(console.error);
