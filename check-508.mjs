import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config()
const prisma = new PrismaClient()

async function checkExp508() {
  // Get ALL experiment records with number 508
  const exp508Records = await prisma.experiment.findMany({
    where: { experimentNumber: '508' },
    select: {
      id: true,
      experimentNumber: true,
      experimentMovies: true,
      eventDate: true
    }
  })
  
  console.log(`Found ${exp508Records.length} records for experiment 508:`)
  exp508Records.forEach(record => {
    console.log(`ID: ${record.id}, Movies: ${JSON.stringify(record.experimentMovies)}`)
  })
  
  await prisma.$disconnect()
}

checkExp508().catch(console.error)
