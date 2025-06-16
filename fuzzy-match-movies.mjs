#!/usr/bin/env node

import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of movies that should be in the database but might have year mismatches
const missingMovies = [
  { title: "Ninja Terminator", year: 1985, experiments: ["005"] },
  { title: "L.A. Wars", year: 1994, experiments: ["017"] },
  { title: "Empire of the Dark", year: 1990, experiments: ["034"] },
  { title: "The Laughing Dead", year: 1989, experiments: ["036", "162"] },
  { title: "Fatal Deviation", year: 1998, experiments: ["047"] },
  { title: "Blood Harvest", year: 1987, experiments: ["062", "230"] },
  { title: "Bulletproof", year: 2020, experiments: ["063"] },
  { title: "Creating Rem Lezar", year: 1989, experiments: ["117", "247"] },
  { title: "Ninja Avengers", year: 1987, experiments: ["139"] },
  { title: "Killing Spree", year: 1987, experiments: ["143"] },
  { title: "Satan's Revenge", year: 1989, experiments: ["146"] },
  { title: "Wicked World", year: 1991, experiments: ["154"] },
  { title: "The Masturbating Gunman", year: 1997, experiments: ["170"] },
  { title: "Stranglehold", year: 1994, experiments: ["171"] },
  { title: "Parole Violators", year: 1994, experiments: ["178"] },
  { title: "Angel of Destruction", year: 1994, experiments: ["181"] },
  { title: "My Best Friend's Birthday", year: 1987, experiments: ["181"] },
  { title: "Warrior of the Lost World", year: 1983, experiments: ["194"] },
  { title: "Killer vs Killers", year: 1985, experiments: ["198"] },
  { title: "Zaat", year: 1971, experiments: ["217"] },
  { title: "Demon Queen", year: 1987, experiments: ["218"] },
  { title: "Clash of the Warlords", year: 1985, experiments: ["219"] },
  { title: "Blood Massacre", year: 1987, experiments: ["221"] },
  { title: "Double Edge", year: 1985, experiments: ["225"] },
  { title: "Golden Ninja Warrior", year: 1987, experiments: ["227"] },
  { title: "A Nightmare on Drug Street", year: 1989, experiments: ["232"] },
  { title: "How to Get Revenge", year: 1989, experiments: ["236"] },
  { title: "Lethal Force 2000", year: 2002, experiments: ["242"] },
  { title: "Safe Crossing: An EGG-cellent Idea!", year: 1998, experiments: ["249"] },
  { title: "Gary Coleman: For Safety's Sake", year: 1986, experiments: ["249"] },
  { title: "Shadow of the Dragon", year: 1992, experiments: ["252"] },
  { title: "In the Claws of the CIA", year: 1981, experiments: ["255"] },
  { title: "Creatures from the Abyss", year: 1994, experiments: ["269"] },
  { title: "Gore Whore", year: 1994, experiments: ["272"] },
  { title: "Fatal Exposure", year: 1989, experiments: ["287"] },
  { title: "Death Nurse", year: 1987, experiments: ["292"] },
  { title: "Ogroff", year: 1983, experiments: ["293"] },
  { title: "Criminally Insane 2", year: 1987, experiments: ["294"] },
  { title: "Hellroller", year: 1992, experiments: ["296"] },
  { title: "Goblin", year: 1993, experiments: ["297"] },
  { title: "Hard Rock Nightmare", year: 1988, experiments: ["297"] },
  { title: "Death Nurse 2", year: 1988, experiments: ["299"] },
  { title: "Urine Trouble", year: 2006, experiments: ["300"] },
  { title: "Blood Hands", year: 1990, experiments: ["301"] },
  { title: "Home Sweet Home", year: 1981, experiments: ["307"] },
  { title: "Phantom Soldiers", year: 1987, experiments: ["310"] },
  { title: "Blood and Steel", year: 1990, experiments: ["312"] },
  { title: "The Revenger", year: 1989, experiments: ["319"] },
  { title: "King Kong", year: 2017, experiments: ["321"] }, // fan made film
  { title: "Warlords of the 21st Century", year: 1982, experiments: ["324"] },
  { title: "Schizophreniac: The Whore Mangler", year: 1997, experiments: ["330"] },
  { title: "Necromaniac: Schizophreniac 2", year: 1999, experiments: ["332"] },
  { title: "Get Street Smart: A Kid's Guide to Stranger Dangers", year: 1995, experiments: ["334"] },
  { title: "Razortooth", year: 2007, experiments: ["335"] },
  { title: "Cobra", year: 1986, experiments: ["337"] },
  { title: "Chickboxer", year: 1992, experiments: ["337"] },
  { title: "Party Games for Adults Only", year: 1984, experiments: ["342"] },
  { title: "Lunatic", year: 1999, experiments: ["352"] },
  { title: "Retroactive", year: 1997, experiments: ["353"] },
  { title: "Kingfisher The Killer", year: 1980, experiments: ["356"] },
  { title: "Sluts & Goddesses Video Workshop", year: 1992, experiments: ["358"] },
  { title: "Blood Brothers", year: 1989, experiments: ["359"] },
  { title: "Dark Night of the Soul", year: 1998, experiments: ["359"] },
  { title: "Death Drug", year: 1978, experiments: ["362"] },
  { title: "Las Vegas Bloodbath", year: 1989, experiments: ["362"] },
  { title: "Surviving Edged Weapons", year: 1988, experiments: ["363"] },
  { title: "Alien Vows", year: 1996, experiments: ["371"] },
  { title: "Fire of Vengeance", year: 1982, experiments: ["373"] },
  { title: "The Rare Blue Apes of Cannibal Isle", year: 1972, experiments: ["374"] },
  { title: "Hunting Season", year: 2000, experiments: ["380"] },
  { title: "Deadly Spygames", year: 1989, experiments: ["382"] },
  { title: "Alien Outlaw", year: 1985, experiments: ["385"] },
  { title: "Dinosaur From The Deep", year: 1993, experiments: ["386"] },
  { title: "Sister Sensei", year: 1994, experiments: ["387"] },
  { title: "Future Hunters", year: 1986, experiments: ["391"] },
  { title: "The Equinox ... A Journey into the Supernatural", year: 1967, experiments: ["392"] },
  { title: "Lethal Impact", year: 1991, experiments: ["395"] },
  { title: "Shotgun Boulevard", year: 1996, experiments: ["403"] },
  { title: "Red Spirit Lake", year: 1993, experiments: ["409"] },
  { title: "Iced", year: 1988, experiments: ["423"] },
  { title: "Crime Killer", year: 1987, experiments: ["498"] }
];

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .toLowerCase();
}

function extractYear(yearStr) {
  if (!yearStr) return null;
  const match = yearStr.toString().match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function calculateSimilarity(str1, str2) {
  const clean1 = cleanTitle(str1);
  const clean2 = cleanTitle(str2);
  
  if (clean1 === clean2) return 1.0;
  
  // Check if one is contained in the other
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    return 0.9;
  }
  
  // Simple word matching
  const words1 = clean1.split(' ');
  const words2 = clean2.split(' ');
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  
  return intersection.length / union.length;
}

async function fuzzyMatchMovies() {
  console.log('🔍 Starting fuzzy match for missing movies...\n');
  
  try {
    // Get all movies from database
    const dbMovies = await prisma.movie.findMany({
      select: {
        id: true,
        movieTitle: true,
        movieOriginalTitle: true,
        movieYear: true,
        movieTmdbId: true,
        movieImdbId: true,
        movieExperiments: {
          include: {
            experiment: true
          }
        }
      }
    });
    
    // Get all experiments for linking
    const experiments = await prisma.experiment.findMany({
      select: {
        id: true,
        experimentNumber: true
      }
    });
    
    const experimentMap = new Map();
    experiments.forEach(exp => {
      experimentMap.set(exp.experimentNumber, exp.id);
    });
    
    console.log(`📚 Database contains ${dbMovies.length} movies`);
    console.log(`🧪 Looking for matches among ${missingMovies.length} missing movies\n`);
    
    const matches = [];
    const noMatches = [];
    const linkingActions = [];
    
    for (const missingMovie of missingMovies) {
      console.log(`🔍 Searching for: "${missingMovie.title}" (${missingMovie.year})`);
      
      let bestMatch = null;
      let bestScore = 0;
      
      for (const dbMovie of dbMovies) {
        const titleScore = calculateSimilarity(missingMovie.title, dbMovie.movieTitle || '');
        const originalTitleScore = dbMovie.movieOriginalTitle ? 
          calculateSimilarity(missingMovie.title, dbMovie.movieOriginalTitle) : 0;
        
        const maxTitleScore = Math.max(titleScore, originalTitleScore);
        
        if (maxTitleScore > bestScore && maxTitleScore >= 0.7) {
          const dbYear = extractYear(dbMovie.movieYear);
          const yearDiff = dbYear ? Math.abs(missingMovie.year - dbYear) : 999;
          
          // Prefer exact title matches, then consider year differences
          if (maxTitleScore >= 0.95 || (maxTitleScore >= 0.8 && yearDiff <= 2)) {
            bestScore = maxTitleScore;
            bestMatch = {
              ...dbMovie,
              titleScore: maxTitleScore,
              yearDiff: yearDiff,
              dbYear: dbYear
            };
          }
        }
      }
      
      if (bestMatch) {
        console.log(`  ✅ MATCH: "${bestMatch.movieTitle}" (${bestMatch.dbYear || 'No year'})`);
        console.log(`     Score: ${(bestMatch.titleScore * 100).toFixed(1)}%, Year diff: ${bestMatch.yearDiff}`);
        
        matches.push({
          missing: missingMovie,
          match: bestMatch
        });
        
        // Check which experiments need to be linked
        const existingExpNumbers = new Set(
          bestMatch.movieExperiments.map(me => me.experiment.experimentNumber)
        );
        
        const experimentsToLink = missingMovie.experiments.filter(expNum => 
          !existingExpNumbers.has(expNum)
        );
        
        if (experimentsToLink.length > 0) {
          console.log(`     Missing experiments: ${experimentsToLink.join(', ')}`);
          
          for (const expNum of experimentsToLink) {
            if (experimentMap.has(expNum)) {
              linkingActions.push({
                movieId: bestMatch.id,
                movieTitle: bestMatch.movieTitle,
                experimentId: experimentMap.get(expNum),
                experimentNumber: expNum
              });
            } else {
              console.log(`     ⚠️  Experiment ${expNum} not found in database`);
            }
          }
        } else {
          console.log(`     ✅ All experiments already linked`);
        }
      } else {
        console.log(`  ❌ No match found`);
        noMatches.push(missingMovie);
      }
      
      console.log('');
    }
    
    // Generate report
    console.log('📊 SUMMARY:');
    console.log(`   Matches found: ${matches.length}`);
    console.log(`   No matches: ${noMatches.length}`);
    console.log(`   Experiments to link: ${linkingActions.length}\n`);
    
    // Generate detailed report
    const report = [];
    report.push('# Fuzzy Movie Matching Report');
    report.push(`Generated: ${new Date().toISOString()}\n`);
    
    report.push('## Summary');
    report.push(`- Movies to match: ${missingMovies.length}`);
    report.push(`- Matches found: ${matches.length}`);
    report.push(`- No matches: ${noMatches.length}`);
    report.push(`- Experiments to link: ${linkingActions.length}\n`);
    
    if (matches.length > 0) {
      report.push(`## ✅ Successful Matches (${matches.length})`);
      report.push('');
      
      matches.forEach((match, index) => {
        report.push(`${index + 1}. **${match.missing.title}** (${match.missing.year})`);
        report.push(`   → **${match.match.movieTitle}** (${match.match.dbYear || 'No year'})`);
        report.push(`   - Database ID: ${match.match.id}`);
        report.push(`   - Match score: ${(match.match.titleScore * 100).toFixed(1)}%`);
        report.push(`   - Year difference: ${match.match.yearDiff} years`);
        if (match.match.movieTmdbId) {
          report.push(`   - TMDb ID: ${match.match.movieTmdbId}`);
        }
        
        const existingExpNumbers = new Set(
          match.match.movieExperiments.map(me => me.experiment.experimentNumber)
        );
        const experimentsToLink = match.missing.experiments.filter(expNum => 
          !existingExpNumbers.has(expNum)
        );
        
        if (experimentsToLink.length > 0) {
          report.push(`   - Experiments to link: ${experimentsToLink.join(', ')}`);
        } else {
          report.push(`   - ✅ All experiments already linked`);
        }
        report.push('');
      });
    }
    
    if (linkingActions.length > 0) {
      report.push(`## 🔗 Experiments to Link (${linkingActions.length})`);
      report.push('These movie-experiment relationships will be created:');
      report.push('');
      
      linkingActions.forEach((action, index) => {
        report.push(`${index + 1}. Link **${action.movieTitle}** (ID: ${action.movieId}) to **Experiment ${action.experimentNumber}**`);
      });
      report.push('');
      
      report.push('### SQL Commands to Execute:');
      report.push('```sql');
      linkingActions.forEach(action => {
        report.push(`INSERT INTO "MovieExperiment" ("movieId", "experimentId", "createdAt") VALUES (${action.movieId}, ${action.experimentId}, NOW());`);
      });
      report.push('```\n');
    }
    
    if (noMatches.length > 0) {
      report.push(`## ❌ No Matches Found (${noMatches.length})`);
      report.push('These movies need to be manually added to the database:');
      report.push('');
      
      noMatches.forEach((movie, index) => {
        report.push(`${index + 1}. **${movie.title}** (${movie.year})`);
        report.push(`   - Experiments: ${movie.experiments.join(', ')}`);
        report.push('');
      });
    }
    
    // Write report
    const reportContent = report.join('\n');
    fs.writeFileSync('./fuzzy-match-report.md', reportContent);
    
    console.log('📄 Detailed report saved to: fuzzy-match-report.md');
    
    // Ask user if they want to apply the linking
    if (linkingActions.length > 0) {
      console.log('\n🔗 Ready to link experiments to movies!');
      console.log(`   This will create ${linkingActions.length} new movie-experiment relationships.`);
      console.log('   Check the report file for details before proceeding.\n');
    }
    
  } catch (error) {
    console.error('Error during fuzzy matching:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fuzzy matching
fuzzyMatchMovies();
