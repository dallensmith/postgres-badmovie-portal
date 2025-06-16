import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config()
const prisma = new PrismaClient()

async function testGrouping() {
  // Get experiments around #002 area
  const experiments = await prisma.experiment.findMany({
    where: {
      experimentNumber: {
        in: ['001', '002', '003']
      }
    },
    select: {
      id: true,
      experimentNumber: true,
      eventDate: true,
      experimentMovies: true,
      createdAt: true
    }
  })
  
  console.log('Raw experiments 001-003:')
  experiments.forEach(exp => {
    console.log(`#${exp.experimentNumber}: ${JSON.stringify(exp.experimentMovies)}`)
  })
  
  // Group them
  const groups = new Map()
  experiments.forEach(exp => {
    const key = exp.experimentNumber || 'unknown'
    if (!groups.has(key)) {
      groups.set(key, {
        experimentNumber: exp.experimentNumber,
        experimentMovies: [],
        eventDate: exp.eventDate
      })
    }
    const group = groups.get(key)
    if (Array.isArray(exp.experimentMovies)) {
      group.experimentMovies.push(...exp.experimentMovies)
    }
  })
  
  console.log('\nGrouped experiments:')
  Array.from(groups.values()).forEach(group => {
    console.log(`#${group.experimentNumber}: ${group.experimentMovies.join(', ')}`)
  })
  
  await prisma.$disconnect()
}

testGrouping().catch(console.error)
