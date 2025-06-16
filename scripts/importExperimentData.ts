import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface CSVRow {
  experiment_number: string;
  movie_title: string;
  event_date: string;
  event_host: string;
  post_url: string;
  event_encore: string;
  event_location: string;
  event_image_wp_id: string;
  event_image: string;
  event_notes: string;
  event_attendees: string;
  movie_year: string;
  movie_tmdb_id: string;
  movie_imdb_id: string;
}

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const data: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (may need enhancement for complex CSV)
    const values = line.split(',');
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim().replace(/"/g, '') : '';
    });
    
    data.push(row as CSVRow);
  }

  return data;
}

async function findMatchingMovie(csvRow: CSVRow) {
  // Try to match by TMDb ID first
  if (csvRow.movie_tmdb_id) {
    const movie = await prisma.movie.findFirst({
      where: { movieTmdbId: csvRow.movie_tmdb_id }
    });
    if (movie) return movie;
  }

  // Try to match by IMDB ID
  if (csvRow.movie_imdb_id) {
    const movie = await prisma.movie.findFirst({
      where: { movieImdbId: csvRow.movie_imdb_id }
    });
    if (movie) return movie;
  }

  // Try to match by title and year
  if (csvRow.movie_title && csvRow.movie_year) {
    const movie = await prisma.movie.findFirst({
      where: {
        movieTitle: {
          contains: csvRow.movie_title,
          mode: 'insensitive'
        },
        movieYear: csvRow.movie_year
      }
    });
    if (movie) return movie;
  }

  return null;
}

async function importExperimentData() {
  try {
    console.log('🎬 Starting experiment data import...');
    
    const csvPath = path.join(process.cwd(), 'Bad-Movie-Database.csv');
    const csvData = await parseCSV(csvPath);
    
    console.log(`📊 Found ${csvData.length} CSV rows`);

    const experiments = new Map<string, any>();
    const movieExperimentPairs: Array<{movieId: number, experimentNumber: string}> = [];
    let matchedMovies = 0;
    let unmatchedMovies = 0;

    // Process each CSV row
    for (const row of csvData) {
      if (!row.experiment_number) continue;

      // Collect unique experiments
      if (!experiments.has(row.experiment_number)) {
        experiments.set(row.experiment_number, {
          experimentNumber: row.experiment_number,
          eventDate: new Date(row.event_date),
          eventHost: row.event_host,
          postUrl: row.post_url,
          eventEncore: row.event_encore.toLowerCase() === 'true',
          eventLocation: row.event_location,
          eventImageWpId: row.event_image_wp_id ? parseInt(row.event_image_wp_id) : null,
          eventImage: row.event_image,
          eventNotes: row.event_notes,
          eventAttendees: row.event_attendees
        });
      }

      // Try to match movie
      const matchingMovie = await findMatchingMovie(row);
      if (matchingMovie) {
        movieExperimentPairs.push({
          movieId: matchingMovie.id,
          experimentNumber: row.experiment_number
        });
        matchedMovies++;
        console.log(`✅ Matched: ${row.movie_title} (${row.movie_year}) -> ${matchingMovie.movieTitle} (ID: ${matchingMovie.id})`);
      } else {
        unmatchedMovies++;
        console.log(`❌ No match: ${row.movie_title} (${row.movie_year})`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Experiments found: ${experiments.size}`);
    console.log(`   Movies matched: ${matchedMovies}`);
    console.log(`   Movies unmatched: ${unmatchedMovies}`);

    // Import experiments
    console.log('\n🎯 Importing experiments...');
    for (const [experimentNumber, experimentData] of experiments) {
      try {
        await prisma.experiment.upsert({
          where: { experimentNumber },
          update: experimentData,
          create: experimentData
        });
        console.log(`✅ Imported experiment: ${experimentNumber}`);
      } catch (error) {
        console.error(`❌ Error importing experiment ${experimentNumber}:`, error);
      }
    }

    // Import movie-experiment relationships
    console.log('\n🔗 Creating movie-experiment relationships...');
    for (const pair of movieExperimentPairs) {
      try {
        const experiment = await prisma.experiment.findUnique({
          where: { experimentNumber: pair.experimentNumber }
        });

        if (experiment) {
          await prisma.movieExperiment.upsert({
            where: {
              movieId_experimentId: {
                movieId: pair.movieId,
                experimentId: experiment.id
              }
            },
            update: {},
            create: {
              movieId: pair.movieId,
              experimentId: experiment.id
            }
          });
          console.log(`✅ Linked movie ${pair.movieId} to experiment ${pair.experimentNumber}`);
        }
      } catch (error) {
        console.error(`❌ Error linking movie ${pair.movieId} to experiment ${pair.experimentNumber}:`, error);
      }
    }

    console.log('\n🎉 Import completed successfully!');

  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importExperimentData();
