#!/usr/bin/env node

/**
 * Quick check for 3D movies in the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check3DMovies() {
    try {
        console.log('🥽 CHECKING 3D MOVIES IN DATABASE...\n')
        
        // Get all movies marked as 3D
        const threeDMovies = await prisma.movie.findMany({
            where: {
                shown3D: true
            },
            select: {
                id: true,
                movieTitle: true,
                movieYear: true,
                shown3D: true,
                movieTmdbId: true
            }
        })
        
        console.log(`Found ${threeDMovies.length} movies marked as 3D:`)
        threeDMovies.forEach((movie, i) => {
            console.log(`   ${i + 1}. "${movie.movieTitle}" (${movie.movieYear})`)
            console.log(`      shown3D: ${movie.shown3D}`)
            console.log(`      TMDb ID: ${movie.movieTmdbId || 'none'}`)
            console.log('')
        })
        
        // Check if the schema field exists by looking at all movies
        const totalMovies = await prisma.movie.count()
        console.log(`📊 Total movies in database: ${totalMovies}`)
        
        // Sample a few movies to confirm the field exists
        const sampleMovies = await prisma.movie.findMany({
            take: 3,
            select: {
                movieTitle: true,
                shown3D: true
            }
        })
        
        console.log('\n📋 Sample movies showing shown3D field exists:')
        sampleMovies.forEach((movie, i) => {
            console.log(`   ${i + 1}. "${movie.movieTitle}" - shown3D: ${movie.shown3D}`)
        })
        
    } catch (error) {
        console.error('❌ Error:', error.message)
    } finally {
        await prisma.$disconnect()
    }
}

check3DMovies()
