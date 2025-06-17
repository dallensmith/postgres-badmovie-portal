import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of experiments that showed movies in 3D (from the notes analysis)
const threeDExperiments = [
  { experimentNumber: 38, note: "(3D)" },
  { experimentNumber: 306, note: "(3D)" },
  { experimentNumber: 329, note: "(3D)" },
  { experimentNumber: 330, note: "(3D)" },
  { experimentNumber: 491, note: "(3D)" }
];

async function mark3DMovies() {
  try {
    console.log('✅ Connected to database');
    console.log(`\n🎬 Marking movies from 3D experiments...`);
    
    let updatedCount = 0;
    
    for (const exp of threeDExperiments) {
      // Find the experiment
      const experiment = await prisma.experiment.findUnique({
        where: { experimentNumber: exp.experimentNumber },
        include: {
          movieExperiments: {
            include: {
              movie: true
            }
          }
        }
      });
      
      if (!experiment) {
        console.log(`❌ Experiment ${exp.experimentNumber} not found`);
        continue;
      }
      
      console.log(`\n📋 Experiment ${exp.experimentNumber}: ${experiment.experimentTitle}`);
      
      // Update all movies in this experiment to be marked as shown3D
      for (const movieExp of experiment.movieExperiments) {
        const movie = movieExp.movie;
        
        if (!movie.shown3D) {
          await prisma.movie.update({
            where: { id: movie.id },
            data: { shown3D: true }
          });
          
          console.log(`   ✅ Marked "${movie.movieTitle}" (${movie.movieYear}) as shown in 3D`);
          updatedCount++;
        } else {
          console.log(`   ℹ️  "${movie.movieTitle}" (${movie.movieYear}) already marked as 3D`);
        }
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   🎬 Movies marked as shown in 3D: ${updatedCount}`);
    
    // Show all movies now marked as 3D
    const threeDMovies = await prisma.movie.findMany({
      where: { shown3D: true },
      select: {
        id: true,
        movieTitle: true,
        movieYear: true,
        movieExperiments: {
          include: {
            experiment: {
              select: {
                experimentNumber: true,
                experimentTitle: true
              }
            }
          }
        }
      }
    });
    
    console.log(`\n🎬 ALL MOVIES MARKED AS SHOWN IN 3D (${threeDMovies.length}):`);
    for (const movie of threeDMovies) {
      const experiments = movie.movieExperiments.map(me => `Exp ${me.experiment.experimentNumber}`).join(', ');
      console.log(`   • "${movie.movieTitle}" (${movie.movieYear}) - ${experiments}`);
    }
    
    console.log('\n✅ 3D movie marking complete!');
    
  } catch (error) {
    console.error('❌ Error marking 3D movies:', error);
  } finally {
    await prisma.$disconnect();
  }
}

mark3DMovies();
