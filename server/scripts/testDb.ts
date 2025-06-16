#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

// Load environment variables
config()

const prisma = new PrismaClient()

async function testConnection() {
  try {
    console.log('Testing database connection...')
    await prisma.$connect()
    console.log('✓ Database connection successful')
    
    // Count existing movies
    const movieCount = await prisma.movie.count()
    console.log(`Current movie count: ${movieCount}`)
    
    // Count existing experiments
    const experimentCount = await prisma.experiment.count()
    console.log(`Current experiment count: ${experimentCount}`)
    
  } catch (error) {
    console.error('Database connection failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
