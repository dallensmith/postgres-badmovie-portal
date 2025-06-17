#!/usr/bin/env node

/**
 * Debug Movie Creation Script
 * 
 * This script tests movie creation directly against the database
 * to identify validation issues.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Test movie creation with minimal data
 */
async function testMovieCreation() {
    console.log('🧪 Testing movie creation...');
    
    // Test 1: Minimal valid movie
    const testMovie1 = {
        movieTitle: "Test Movie 1",
        movieYear: "2023",
        syncStatus: "pending"
    };
    
    try {
        console.log('\n📝 Test 1: Creating minimal movie...');
        const movie1 = await prisma.movie.create({
            data: testMovie1
        });
        console.log('✅ Success! Created movie with ID:', movie1.id);
        
        // Clean up
        await prisma.movie.delete({ where: { id: movie1.id } });
        console.log('🧹 Cleaned up test movie');
        
    } catch (error) {
        console.error('❌ Test 1 failed:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
    }
    
    // Test 2: Movie with more fields
    const testMovie2 = {
        movieTitle: "9mm Sunrise",
        movieYear: "2006",
        movieOverview: "Test movie manually added",
        movieRuntime: 90,
        syncStatus: "pending"
    };
    
    try {
        console.log('\n📝 Test 2: Creating movie with more fields...');
        const movie2 = await prisma.movie.create({
            data: testMovie2
        });
        console.log('✅ Success! Created movie with ID:', movie2.id);
        console.log('Movie details:', {
            id: movie2.id,
            title: movie2.movieTitle,
            year: movie2.movieYear
        });
        
        // Don't clean up this one - keep it as the real "9mm Sunrise" movie
        console.log('💾 Keeping this movie as the real "9mm Sunrise" entry');
        
    } catch (error) {
        console.error('❌ Test 2 failed:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
    }
    
    // Test 3: Check for unique constraints
    try {
        console.log('\n📝 Test 3: Testing unique constraints...');
        
        // Check if there are any unique constraints that might be failing
        const existingMovies = await prisma.movie.findMany({
            where: {
                OR: [
                    { movieTitle: "9mm Sunrise" },
                    { slug: "9mm-sunrise" }
                ]
            }
        });
        
        if (existingMovies.length > 0) {
            console.log('⚠️  Found existing movies that might conflict:');
            existingMovies.forEach(movie => {
                console.log(`   • ID ${movie.id}: "${movie.movieTitle}" (${movie.movieYear}) - slug: ${movie.slug}`);
            });
        } else {
            console.log('✅ No conflicting movies found');
        }
        
    } catch (error) {
        console.error('❌ Test 3 failed:', error.message);
    }
}

/**
 * Test the exact data that might be sent from the form
 */
async function testFormData() {
    console.log('\n🎭 Testing typical form data...');
    
    const formData = {
        movieTitle: "After Quarentine",
        movieOriginalTitle: null,
        movieYear: "2023",
        movieReleaseDate: null,
        movieRuntime: null,
        movieTagline: null,
        movieOverview: "A movie not available on TMDb",
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
        movieStudios: null,
        syncStatus: "pending"
    };
    
    try {
        const movie = await prisma.movie.create({
            data: formData
        });
        console.log('✅ Form data test successful! Movie ID:', movie.id);
        
        // Don't clean up - keep as real entry
        console.log('💾 Keeping this movie as the real "After Quarentine" entry');
        
    } catch (error) {
        console.error('❌ Form data test failed:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        console.error('Full error:', error);
    }
}

/**
 * Main execution
 */
async function main() {
    try {
        await prisma.$connect();
        console.log('✅ Connected to database');
        
        await testMovieCreation();
        await testFormData();
        
        console.log('\n✅ Debug tests complete!');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
