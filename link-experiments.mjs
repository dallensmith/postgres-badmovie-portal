#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Movie-experiment linking data from fuzzy matching
const linkingActions = [
  { movieId: 16, experimentId: 8, experimentNumber: "005" },
  { movieId: 46, experimentId: 20, experimentNumber: "017" },
  { movieId: 80, experimentId: 37, experimentNumber: "034" },
  { movieId: 85, experimentId: 39, experimentNumber: "036" },
  { movieId: 85, experimentId: 165, experimentNumber: "162" },
  { movieId: 105, experimentId: 50, experimentNumber: "047" },
  { movieId: 134, experimentId: 65, experimentNumber: "062" },
  { movieId: 134, experimentId: 233, experimentNumber: "230" },
  { movieId: 236, experimentId: 120, experimentNumber: "117" },
  { movieId: 236, experimentId: 250, experimentNumber: "247" },
  { movieId: 272, experimentId: 142, experimentNumber: "139" },
  { movieId: 278, experimentId: 146, experimentNumber: "143" },
  { movieId: 282, experimentId: 149, experimentNumber: "146" },
  { movieId: 296, experimentId: 157, experimentNumber: "154" },
  { movieId: 320, experimentId: 173, experimentNumber: "170" },
  { movieId: 321, experimentId: 174, experimentNumber: "171" },
  { movieId: 332, experimentId: 181, experimentNumber: "178" },
  { movieId: 337, experimentId: 184, experimentNumber: "181" },
  { movieId: 338, experimentId: 184, experimentNumber: "181" },
  { movieId: 359, experimentId: 197, experimentNumber: "194" },
  { movieId: 366, experimentId: 201, experimentNumber: "198" },
  { movieId: 399, experimentId: 220, experimentNumber: "217" },
  { movieId: 400, experimentId: 221, experimentNumber: "218" },
  { movieId: 402, experimentId: 222, experimentNumber: "219" },
  { movieId: 406, experimentId: 224, experimentNumber: "221" },
  { movieId: 412, experimentId: 228, experimentNumber: "225" },
  { movieId: 415, experimentId: 230, experimentNumber: "227" },
  { movieId: 420, experimentId: 235, experimentNumber: "232" },
  { movieId: 428, experimentId: 239, experimentNumber: "236" },
  { movieId: 438, experimentId: 245, experimentNumber: "242" },
  { movieId: 447, experimentId: 252, experimentNumber: "249" },
  { movieId: 448, experimentId: 252, experimentNumber: "249" },
  { movieId: 459, experimentId: 255, experimentNumber: "252" },
  { movieId: 467, experimentId: 258, experimentNumber: "255" },
  { movieId: 495, experimentId: 272, experimentNumber: "269" },
  { movieId: 499, experimentId: 275, experimentNumber: "272" },
  { movieId: 520, experimentId: 290, experimentNumber: "287" },
  { movieId: 527, experimentId: 295, experimentNumber: "292" },
  { movieId: 529, experimentId: 296, experimentNumber: "293" },
  { movieId: 531, experimentId: 297, experimentNumber: "294" },
  { movieId: 537, experimentId: 299, experimentNumber: "296" },
  { movieId: 539, experimentId: 300, experimentNumber: "297" },
  { movieId: 540, experimentId: 300, experimentNumber: "297" },
  { movieId: 542, experimentId: 302, experimentNumber: "299" },
  { movieId: 544, experimentId: 303, experimentNumber: "300" },
  { movieId: 545, experimentId: 304, experimentNumber: "301" },
  { movieId: 555, experimentId: 310, experimentNumber: "307" },
  { movieId: 559, experimentId: 313, experimentNumber: "310" },
  { movieId: 564, experimentId: 315, experimentNumber: "312" },
  { movieId: 576, experimentId: 322, experimentNumber: "319" },
  { movieId: 580, experimentId: 327, experimentNumber: "324" },
  { movieId: 596, experimentId: 333, experimentNumber: "330" },
  { movieId: 600, experimentId: 335, experimentNumber: "332" },
  { movieId: 602, experimentId: 337, experimentNumber: "334" },
  { movieId: 604, experimentId: 338, experimentNumber: "335" },
  { movieId: 607, experimentId: 340, experimentNumber: "337" },
  { movieId: 608, experimentId: 340, experimentNumber: "337" },
  { movieId: 617, experimentId: 345, experimentNumber: "342" },
  { movieId: 635, experimentId: 355, experimentNumber: "352" },
  { movieId: 637, experimentId: 356, experimentNumber: "353" },
  { movieId: 641, experimentId: 359, experimentNumber: "356" },
  { movieId: 645, experimentId: 362, experimentNumber: "359" },
  { movieId: 646, experimentId: 362, experimentNumber: "359" },
  { movieId: 651, experimentId: 365, experimentNumber: "362" },
  { movieId: 652, experimentId: 365, experimentNumber: "362" },
  { movieId: 654, experimentId: 366, experimentNumber: "363" },
  { movieId: 674, experimentId: 376, experimentNumber: "373" },
  { movieId: 676, experimentId: 377, experimentNumber: "374" },
  { movieId: 693, experimentId: 383, experimentNumber: "380" },
  { movieId: 697, experimentId: 385, experimentNumber: "382" },
  { movieId: 706, experimentId: 388, experimentNumber: "385" },
  { movieId: 707, experimentId: 389, experimentNumber: "386" },
  { movieId: 709, experimentId: 390, experimentNumber: "387" },
  { movieId: 715, experimentId: 394, experimentNumber: "391" },
  { movieId: 717, experimentId: 395, experimentNumber: "392" },
  { movieId: 723, experimentId: 398, experimentNumber: "395" },
  { movieId: 738, experimentId: 406, experimentNumber: "403" },
  { movieId: 750, experimentId: 412, experimentNumber: "409" },
  { movieId: 778, experimentId: 426, experimentNumber: "423" },
  { movieId: 958, experimentId: 501, experimentNumber: "498" }
];

async function linkExperimentsToMovies() {
  console.log('🔗 Starting to link experiments to movies...\n');
  
  try {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const action of linkingActions) {
      try {
        // Check if the relationship already exists
        const existing = await prisma.movieExperiment.findFirst({
          where: {
            movieId: action.movieId,
            experimentId: action.experimentId
          }
        });
        
        if (existing) {
          console.log(`⚠️  Relationship already exists: Movie ${action.movieId} ↔ Experiment ${action.experimentNumber}`);
          continue;
        }
        
        // Create the relationship
        await prisma.movieExperiment.create({
          data: {
            movieId: action.movieId,
            experimentId: action.experimentId
          }
        });
        
        console.log(`✅ Linked Movie ${action.movieId} to Experiment ${action.experimentNumber}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to link Movie ${action.movieId} to Experiment ${action.experimentNumber}:`, error.message);
        errorCount++;
        errors.push({
          movieId: action.movieId,
          experimentNumber: action.experimentNumber,
          error: error.message
        });
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`   Successfully linked: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total attempts: ${linkingActions.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(err => {
        console.log(`   Movie ${err.movieId} → Experiment ${err.experimentNumber}: ${err.error}`);
      });
    }
    
    if (successCount > 0) {
      console.log(`\n🎉 Successfully linked ${successCount} experiments to movies!`);
      console.log('   You can now view the updated movie details in the portal.');
    }
    
  } catch (error) {
    console.error('Error during linking process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the linking process
linkExperimentsToMovies();
