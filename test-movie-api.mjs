#!/usr/bin/env node

/**
 * Test API Endpoint Script
 * 
 * This script tests the movie creation API endpoint directly
 * to identify what's causing the "Failed to save movie" error.
 */

import fetch from 'node-fetch';

/**
 * Test the movie creation API endpoint
 */
async function testMovieAPI() {
    console.log('🌐 Testing Movie API Endpoint...');
    
    // Try common development server ports
    const ports = [5173, 3000, 3001, 8000];
    let workingPort = null;
    
    // First find which port the server is running on
    for (const port of ports) {
        try {
            const response = await fetch(`http://localhost:${port}/api/movies?limit=1`);
            if (response.ok) {
                workingPort = port;
                console.log(`✅ Found working server on port ${port}`);
                break;
            }
        } catch (error) {
            // Port not available, continue
        }
    }
    
    if (!workingPort) {
        console.log('❌ Could not find a working server. Make sure the development server is running.');
        console.log('💡 Try running: npm run dev');
        return;
    }
    
    // Test movie creation
    const testMovieData = {
        movieTitle: "Diamond Eye: T.H.O.T. Process 2",
        movieYear: "2017",
        movieOverview: "Test movie created via API",
        syncStatus: "pending"
    };
    
    try {
        console.log(`\n📝 Testing movie creation on port ${workingPort}...`);
        console.log('Data to send:', JSON.stringify(testMovieData, null, 2));
        
        const response = await fetch(`http://localhost:${workingPort}/api/movies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testMovieData)
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const createdMovie = await response.json();
            console.log('✅ Movie created successfully!');
            console.log('Created movie:', {
                id: createdMovie.id,
                title: createdMovie.movieTitle,
                year: createdMovie.movieYear
            });
        } else {
            const errorText = await response.text();
            console.log('❌ Movie creation failed');
            console.log('Error response:', errorText);
            
            // Try to parse as JSON for more details
            try {
                const errorJson = JSON.parse(errorText);
                console.log('Parsed error:', errorJson);
            } catch (parseError) {
                console.log('Raw error text:', errorText);
            }
        }
        
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
    
    // Test with more complete form data (like what the UI sends)
    const completeFormData = {
        movieTitle: "Test Complete Movie",
        movieOriginalTitle: null,
        movieYear: "2023",
        movieReleaseDate: null,
        movieRuntime: null,
        movieTagline: null,
        movieOverview: "Complete test movie",
        movieContentRating: null,
        movieBudget: null,
        movieBoxOffice: null,
        moviePoster: null,
        movieBackdrop: null,
        movieTrailer: null,
        movieTmdbId: null,
        movieTmdbUrl: null,
        movieTmdbRating: null,
        movieTmdbVotes: null,
        movieImdbId: null,
        movieImdbUrl: null,
        movieCharacters: null,
        movieAmazonLink: null,
        movieActors: null,
        movieDirectors: null,
        movieWriters: null,
        movieGenres: null,
        movieCountries: null,
        movieLanguages: null,
        movieStudios: null
    };
    
    try {
        console.log(`\n📝 Testing with complete form data...`);
        
        const response = await fetch(`http://localhost:${workingPort}/api/movies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(completeFormData)
        });
        
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const createdMovie = await response.json();
            console.log('✅ Complete form data test successful!');
            console.log('Created movie ID:', createdMovie.id);
        } else {
            const errorText = await response.text();
            console.log('❌ Complete form data test failed');
            console.log('Error response:', errorText);
        }
        
    } catch (error) {
        console.error('❌ Network error with complete form data:', error.message);
    }
}

/**
 * Test server health
 */
async function testServerHealth() {
    console.log('\n🏥 Testing server health...');
    
    const ports = [5173, 3000, 3001, 8000];
    
    for (const port of ports) {
        try {
            const response = await fetch(`http://localhost:${port}/api/movies?limit=1`);
            console.log(`Port ${port}: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`  Movies endpoint working, returned ${data.movies?.length || 0} movies`);
            }
        } catch (error) {
            console.log(`Port ${port}: Not accessible`);
        }
    }
}

/**
 * Main execution
 */
async function main() {
    await testServerHealth();
    await testMovieAPI();
}

main().catch(console.error);
