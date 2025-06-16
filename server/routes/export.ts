import express from 'express';
import { prisma } from '../index.js';

const router = express.Router();

interface ExportOptions {
  format: 'csv' | 'json';
  scope: 'all' | 'movies' | 'experiments' | 'people';
  includeRelationships: boolean;
  includeMetadata: boolean;
}

// Generate export preview
router.post('/preview', async (req, res) => {
  try {
    const options: ExportOptions = req.body;
    
    const preview = await generateExportPreview(options);
    res.json(preview);
  } catch (error) {
    console.error('Export preview error:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Download export
router.post('/download', async (req, res) => {
  try {
    const options: ExportOptions = req.body;
    
    const { data, filename, contentType } = await generateExportData(options);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (error) {
    console.error('Export download error:', error);
    res.status(500).json({ error: 'Failed to generate export' });
  }
});

async function generateExportPreview(options: ExportOptions) {
  const { scope, includeRelationships, includeMetadata } = options;
  
  let query: any;
  let sampleData: any[] = [];
  let totalRecords = 0;
  let columns: string[] = [];

  switch (scope) {
    case 'movies':
      query = buildMoviesQuery(includeRelationships, includeMetadata);
      totalRecords = await prisma.movie.count();
      sampleData = await (prisma.movie as any).findMany({
        ...query,
        take: 3
      });
      columns = getMovieColumns(includeRelationships, includeMetadata);
      break;

    case 'experiments':
      query = buildExperimentsQuery(includeRelationships, includeMetadata);
      totalRecords = await prisma.experiment.count();
      sampleData = await (prisma.experiment as any).findMany({
        ...query,
        take: 3
      });
      columns = getExperimentColumns(includeRelationships, includeMetadata);
      break;

    case 'people':
      // For now, just actors - could expand to include directors/writers
      totalRecords = await prisma.actor.count();
      sampleData = await prisma.actor.findMany({
        take: 3
      });
      columns = getPeopleColumns(includeMetadata);
      break;

    case 'all':
    default:
      // For 'all', we'll create a flattened view similar to original CSV
      const moviesWithExperiments = await prisma.movie.findMany({
        include: {
          movieExperiments: {
            include: {
              experiment: true
            }
          }
        },
        take: 3
      });
      
      // Flatten the data
      sampleData = flattenMovieExperimentData(moviesWithExperiments, includeMetadata);
      totalRecords = await prisma.movieExperiment.count();
      columns = getAllDataColumns(includeMetadata);
      break;
  }

  // Estimate file size (rough calculation)
  const avgRowSize = JSON.stringify(sampleData[0] || {}).length;
  const estimatedSize = (avgRowSize * totalRecords * 1.2); // 20% overhead
  const estimatedFileSize = formatFileSize(estimatedSize);

  return {
    totalRecords,
    sampleData: sampleData.map(item => flattenObject(item)),
    columns,
    estimatedFileSize
  };
}

async function generateExportData(options: ExportOptions) {
  const { format, scope, includeRelationships, includeMetadata } = options;
  
  let data: any[] = [];
  let filename: string;
  let contentType: string;

  // Fetch the actual data
  switch (scope) {
    case 'movies':
      const query = buildMoviesQuery(includeRelationships, includeMetadata);
      data = await (prisma.movie as any).findMany(query);
      break;

    case 'experiments':
      const expQuery = buildExperimentsQuery(includeRelationships, includeMetadata);
      data = await (prisma.experiment as any).findMany(expQuery);
      break;

    case 'people':
      data = await prisma.actor.findMany();
      break;

    case 'all':
    default:
      const moviesWithExperiments = await prisma.movie.findMany({
        include: {
          movieExperiments: {
            include: {
              experiment: true
            }
          }
        }
      });
      data = flattenMovieExperimentData(moviesWithExperiments, includeMetadata);
      break;
  }

  // Generate output based on format
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  
  if (format === 'csv') {
    const csvData = convertToCSV(data);
    filename = `badmovies-${scope}-${timestamp}.csv`;
    contentType = 'text/csv';
    return { data: csvData, filename, contentType };
  } else {
    const jsonData = JSON.stringify(data, null, 2);
    filename = `badmovies-${scope}-${timestamp}.json`;
    contentType = 'application/json';
    return { data: jsonData, filename, contentType };
  }
}

function buildMoviesQuery(includeRelationships: boolean, includeMetadata: boolean) {
  if (includeRelationships) {
    return {
      include: {
        movieExperiments: {
          include: {
            experiment: true
          }
        }
      }
    };
  }

  if (includeMetadata) {
    return {}; // Return all fields
  }

  return {
    select: {
      id: true,
      movieTitle: true,
      movieOriginalTitle: true,
      movieYear: true,
      movieReleaseDate: true,
      movieRuntime: true,
      movieTagline: true,
      movieOverview: true,
      movieContentRating: true,
      movieBudget: true,
      movieBoxOffice: true,
      moviePoster: true,
      movieBackdrop: true,
      movieTrailer: true,
      movieTmdbId: true,
      movieTmdbUrl: true,
      movieTmdbRating: true,
      movieTmdbVotes: true,
      movieImdbId: true,
      movieImdbUrl: true,
      shown3D: true
    }
  };
}

function buildExperimentsQuery(includeRelationships: boolean, includeMetadata: boolean) {
  if (includeRelationships) {
    return {
      include: {
        movieExperiments: {
          include: {
            movie: true
          }
        }
      }
    };
  }

  if (includeMetadata) {
    return {}; // Return all fields
  }

  return {
    select: {
      id: true,
      experimentNumber: true,
      eventDate: true,
      eventHost: true,
      eventLocation: true,
      eventImage: true,
      eventNotes: true,
      eventAttendees: true
    }
  };
}

function getMovieColumns(includeRelationships: boolean, includeMetadata: boolean): string[] {
  let columns = [
    'id', 'movieTitle', 'movieOriginalTitle', 'movieYear', 'movieReleaseDate',
    'movieRuntime', 'movieTagline', 'movieOverview', 'movieContentRating',
    'movieBudget', 'movieBoxOffice', 'moviePoster', 'movieBackdrop', 'movieTrailer',
    'movieTmdbId', 'movieTmdbUrl', 'movieTmdbRating', 'movieTmdbVotes',
    'movieImdbId', 'movieImdbUrl', 'shown3D'
  ];

  if (includeMetadata) {
    columns.push('syncStatus', 'excludeFromTmdbSync', 'createdAt', 'updatedAt');
  }

  if (includeRelationships) {
    columns.push('experiments');
  }

  return columns;
}

function getExperimentColumns(includeRelationships: boolean, includeMetadata: boolean): string[] {
  let columns = [
    'id', 'experimentNumber', 'eventDate', 'eventHost', 'eventLocation',
    'eventImage', 'eventNotes', 'eventAttendees'
  ];

  if (includeMetadata) {
    columns.push('createdAt', 'updatedAt');
  }

  if (includeRelationships) {
    columns.push('movies');
  }

  return columns;
}

function getPeopleColumns(includeMetadata: boolean): string[] {
  let columns = [
    'id', 'actorName', 'profileImage', 'actorBiography', 'actorBirthday',
    'actorDeathday', 'actorPlaceOfBirth', 'actorMovieCount', 'actorPopularity',
    'actorKnownForDepartment', 'actorImdbId', 'actorImdbUrl', 'actorTmdbUrl'
  ];

  if (includeMetadata) {
    columns.push('syncStatus', 'createdAt', 'updatedAt');
  }

  return columns;
}

function getAllDataColumns(includeMetadata: boolean): string[] {
  let columns = [
    'experiment_number', 'movie_title', 'movie_year', 'event_date', 'event_host',
    'event_location', 'event_image', 'event_notes', 'event_attendees',
    'movie_original_title', 'movie_release_date', 'movie_runtime', 'movie_overview',
    'movie_tagline', 'movie_content_rating', 'movie_budget', 'movie_box_office',
    'movie_poster', 'movie_backdrop', 'movie_trailer', 'movie_tmdb_id',
    'movie_tmdb_url', 'movie_tmdb_rating', 'movie_tmdb_votes', 'movie_imdb_id',
    'movie_imdb_url', 'shown_3d'
  ];

  if (includeMetadata) {
    columns.push('movie_created_at', 'movie_updated_at', 'experiment_created_at', 'experiment_updated_at');
  }

  return columns;
}

function flattenMovieExperimentData(moviesWithExperiments: any[], includeMetadata: boolean) {
  const flattened: any[] = [];

  moviesWithExperiments.forEach(movie => {
    if (movie.movieExperiments.length === 0) {
      // Movie without experiments
      flattened.push(flattenMovieExperimentRow(movie, null, includeMetadata));
    } else {
      // Movie with experiments
      movie.movieExperiments.forEach((movieExperiment: any) => {
        flattened.push(flattenMovieExperimentRow(movie, movieExperiment.experiment, includeMetadata));
      });
    }
  });

  return flattened;
}

function flattenMovieExperimentRow(movie: any, experiment: any, includeMetadata: boolean) {
  const row: any = {
    experiment_number: experiment?.experimentNumber || '',
    movie_title: movie.movieTitle || '',
    movie_year: movie.movieYear || '',
    event_date: experiment?.eventDate || '',
    event_host: experiment?.eventHost || '',
    event_location: experiment?.eventLocation || '',
    event_image: experiment?.eventImage || '',
    event_notes: experiment?.eventNotes || '',
    event_attendees: experiment?.eventAttendees || '',
    movie_original_title: movie.movieOriginalTitle || '',
    movie_release_date: movie.movieReleaseDate || '',
    movie_runtime: movie.movieRuntime || '',
    movie_overview: movie.movieOverview || '',
    movie_tagline: movie.movieTagline || '',
    movie_content_rating: movie.movieContentRating || '',
    movie_budget: movie.movieBudget || '',
    movie_box_office: movie.movieBoxOffice || '',
    movie_poster: movie.moviePoster || '',
    movie_backdrop: movie.movieBackdrop || '',
    movie_trailer: movie.movieTrailer || '',
    movie_tmdb_id: movie.movieTmdbId || '',
    movie_tmdb_url: movie.movieTmdbUrl || '',
    movie_tmdb_rating: movie.movieTmdbRating || '',
    movie_tmdb_votes: movie.movieTmdbVotes || '',
    movie_imdb_id: movie.movieImdbId || '',
    movie_imdb_url: movie.movieImdbUrl || '',
    shown_3d: movie.shown3D || false
  };

  if (includeMetadata) {
    row.movie_created_at = movie.createdAt;
    row.movie_updated_at = movie.updatedAt;
    row.experiment_created_at = experiment?.createdAt || '';
    row.experiment_updated_at = experiment?.updatedAt || '';
  }

  return row;
}

function flattenObject(obj: any): any {
  const flattened: any = {};
  
  for (const key in obj) {
    if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      const nestedFlattened = flattenObject(obj[key]);
      for (const nestedKey in nestedFlattened) {
        flattened[`${key}_${nestedKey}`] = nestedFlattened[nestedKey];
      }
    } else if (Array.isArray(obj[key])) {
      flattened[key] = obj[key].length;
    } else {
      flattened[key] = obj[key];
    }
  }
  
  return flattened;
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Escape CSV values
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

export default router;
