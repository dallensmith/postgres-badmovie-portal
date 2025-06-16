import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'

config()
const prisma = new PrismaClient()

async function fixExp508() {
  // Update experiment 508 to include both movies
  const result = await prisma.experiment.update({
    where: { id: 511 }, // ID of experiment 508 record
    data: {
      experimentMovies: ["Desperate Living", "Stunts"]
    }
  })
  
  console.log('Updated experiment 508:', result)
  
  await prisma.$disconnect()
}

fixExp508().catch(console.error)
