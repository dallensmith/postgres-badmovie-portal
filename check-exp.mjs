import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkRecentExperiments() {
  console.log('=== CURRENT STATE OF RECENT EXPERIMENTS ===\n')
  
  // Check recent experiments (504-508)
  const recentExperiments = [504, 505, 506, 507, 508]
  
  for (const expNum of recentExperiments) {
    const experiments = await prisma.experiment.findMany({
      where: { experimentNumber: expNum.toString() },
      select: { 
        id: true, 
        experimentNumber: true, 
        experimentMovies: true,
        eventDate: true
      }
    })
    
    console.log(`\nExperiment #${expNum}:`)
    console.log(`  Found ${experiments.length} database records`)
    
    if (experiments.length > 0) {
      // Collect all unique movies from all records
      const allMovies = new Set()
      experiments.forEach(exp => {
        if (exp.experimentMovies && Array.isArray(exp.experimentMovies)) {
          exp.experimentMovies.forEach(movie => allMovies.add(movie))
        }
      })
      
      console.log(`  Total unique movies: ${allMovies.size}`)
      console.log(`  Movies: ${Array.from(allMovies).join(', ')}`)
      console.log(`  Event Date: ${experiments[0].eventDate}`)
      
      // Show each record's movies
      experiments.forEach((exp, index) => {
        console.log(`    Record ${index + 1} (ID: ${exp.id}): [${exp.experimentMovies?.join(', ') || 'no movies'}]`)
      })
    } else {
      console.log('  No records found!')
    }
  }
  
  await prisma.$disconnect()
}

checkRecentExperiments()
