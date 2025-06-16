import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import fs from 'fs'
import csvParser from 'csv-parser'

config()
const prisma = new PrismaClient()

async function fixAllExperiments() {
  console.log('🔧 Reading CSV and fixing ALL experiments...\n')
  
  try {
    // Read CSV and group by experiment number
    const csvData = []
    await new Promise((resolve, reject) => {
      fs.createReadStream('Bad-Movie-Database.csv')
        .pipe(csvParser())
        .on('data', (row) => csvData.push(row))
        .on('end', resolve)
        .on('error', reject)
    })
    
    console.log(`Read ${csvData.length} rows from CSV`)
    
    // Group movies by experiment number
    const experimentGroups = new Map()
    csvData.forEach(row => {
      const expNum = row.experiment_number
      if (!expNum) return
      
      if (!experimentGroups.has(expNum)) {
        experimentGroups.set(expNum, {
          experimentNumber: expNum,
          movies: [],
          eventDate: row.event_date,
          eventHost: row.event_host,
          eventLocation: row.event_location,
          eventImage: row.event_image,
          eventNotes: row.event_notes
        })
      }
      
      if (row.movie_title) {
        experimentGroups.get(expNum).movies.push(row.movie_title)
      }
    })
    
    console.log(`Found ${experimentGroups.size} unique experiments`)
    
    // Show what we found
    let multiMovieCount = 0
    for (const [expNum, data] of experimentGroups) {
      if (data.movies.length > 1) {
        multiMovieCount++
        console.log(`Experiment ${expNum}: ${data.movies.length} movies - ${data.movies.join(', ')}`)
      }
    }
    console.log(`\n${multiMovieCount} experiments have multiple movies\n`)
    
    // Now update the database
    let updatedCount = 0
    for (const [expNum, csvData] of experimentGroups) {
      // Find existing experiment records for this number
      const existingRecords = await prisma.experiment.findMany({
        where: { experimentNumber: expNum }
      })
      
      if (existingRecords.length === 0) {
        console.log(`⚠️  No database records found for experiment ${expNum}`)
        continue
      }
      
      // Keep the first record, update it with all movies
      const mainRecord = existingRecords[0]
      await prisma.experiment.update({
        where: { id: mainRecord.id },
        data: {
          experimentMovies: csvData.movies
        }
      })
      
      // Delete duplicate records
      if (existingRecords.length > 1) {
        const duplicateIds = existingRecords.slice(1).map(r => r.id)
        await prisma.experiment.deleteMany({
          where: { id: { in: duplicateIds } }
        })
        console.log(`✅ Updated experiment ${expNum}: ${csvData.movies.length} movies, deleted ${duplicateIds.length} duplicates`)
      } else {
        console.log(`✅ Updated experiment ${expNum}: ${csvData.movies.length} movies`)
      }
      
      updatedCount++
    }
    
    console.log(`\n🎉 Fixed ${updatedCount} experiments`)
    
  } catch (error) {
    console.error('Error fixing experiments:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAllExperiments().catch(console.error)
