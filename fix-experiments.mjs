import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config()
const prisma = new PrismaClient()

async function fixExperimentGrouping() {
  console.log('🔧 Fixing experiment grouping...\n')
  
  // Get all experiments grouped by number
  const allExperiments = await prisma.experiment.findMany({
    orderBy: { experimentNumber: 'asc' },
    select: {
      id: true,
      experimentNumber: true,
      eventDate: true,
      eventLocation: true,
      eventHost: true,
      experimentImage: true,
      experimentNotes: true,
      experimentMovies: true,
      createdAt: true
    }
  })
  
  // Group by experiment number
  const groups = new Map()
  allExperiments.forEach(exp => {
    const key = exp.experimentNumber || 'unknown'
    if (!groups.has(key)) {
      groups.set(key, {
        ...exp,
        experimentMovies: [],
        allIds: []
      })
    }
    const group = groups.get(key)
    if (Array.isArray(exp.experimentMovies)) {
      group.experimentMovies.push(...exp.experimentMovies)
    }
    group.allIds.push(exp.id)
  })
  
  console.log(`Found ${groups.size} unique experiment numbers`)
  console.log(`Total experiment records: ${allExperiments.length}`)
  
  // Show first few groups
  let count = 0
  for (const [expNum, group] of groups) {
    if (count < 5) {
      console.log(`Experiment ${expNum}: ${group.experimentMovies.length} movies, ${group.allIds.length} records`)
      console.log(`  Movies: ${group.experimentMovies.join(', ')}`)
    }
    count++
  }
  
  await prisma.$disconnect()
}

fixExperimentGrouping().catch(console.error)
