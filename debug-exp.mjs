import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config()
const prisma = new PrismaClient()

async function debugExp508() {
  console.log('=== Checking Experiment 508 (should have 2 movies) ===')
  
  // Get all records for experiment 508
  const exp508Records = await prisma.experiment.findMany({
    where: { experimentNumber: '508' },
    select: {
      id: true,
      experimentNumber: true,
      experimentMovies: true,
      eventDate: true,
      createdAt: true
    },
    orderBy: { id: 'asc' }
  })
  
  console.log(`Found ${exp508Records.length} records for experiment 508:`)
  exp508Records.forEach((exp, index) => {
    console.log(`  ${index + 1}. ID: ${exp.id}, Movies: ${JSON.stringify(exp.experimentMovies)}`)
  })
  
  // Now test the dashboard grouping logic
  const allRecentExperiments = await prisma.experiment.findMany({
    where: { experimentNumber: '508' },
    select: {
      id: true,
      experimentNumber: true,
      eventDate: true,
      experimentMovies: true,
      createdAt: true
    }
  })

  const experimentGroups = new Map()
  allRecentExperiments.forEach(exp => {
    const key = exp.experimentNumber || 'unknown'
    if (!experimentGroups.has(key)) {
      experimentGroups.set(key, {
        id: exp.id,
        experimentNumber: exp.experimentNumber,
        eventDate: exp.eventDate,
        experimentMovies: [],
        createdAt: exp.createdAt
      })
    }
    const group = experimentGroups.get(key)
    if (Array.isArray(exp.experimentMovies)) {
      group.experimentMovies.push(...exp.experimentMovies)
    }
    if (exp.createdAt < group.createdAt) {
      group.createdAt = exp.createdAt
    }
  })

  console.log('\n=== After Dashboard Grouping Logic ===')
  const grouped = Array.from(experimentGroups.values())[0]
  if (grouped) {
    console.log(`Experiment #${grouped.experimentNumber}:`)
    console.log(`  Combined Movies: ${JSON.stringify(grouped.experimentMovies)}`)
    console.log(`  Total Movies: ${grouped.experimentMovies.length}`)
  }
  
  await prisma.$disconnect()
}

debugExp508().catch(console.error)
