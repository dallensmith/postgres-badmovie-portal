interface OMDbMovieResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: Array<{
    Source: string;
    Value: string;
  }>;
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  DVD: string;
  BoxOffice: string;
  Production: string;
  Website: string;
  Response: string;
  Error?: string;
}

interface EnrichedMovieData {
  // Basic movie info
  title?: string;
  year?: string;
  releaseDate?: string;
  runtime?: number;
  plot?: string;
  poster?: string;
  
  // Cast and crew
  directors?: string[];
  writers?: string[];
  actors?: string[];
  
  // Categories
  genres?: string[];
  countries?: string[];
  languages?: string[];
  studios?: string[]; // Production companies
  
  // Ratings and reviews
  rottenTomatoesRating?: string;
  rottenTomatoesUrl?: string;
  imdbRating?: string;
  imdbVotes?: string;
  metacriticRating?: string;
  contentRating?: string; // MPAA rating (PG, R, etc.)
  
  // Awards and recognition
  awards?: string;
  
  // Financial data
  boxOffice?: string;
  
  // Additional metadata
  dvdRelease?: string;
  websiteUrl?: string;
  plotEnhanced?: string;
}

class OMDbService {
  private apiKey: string;
  private baseUrl = 'http://www.omdbapi.com/';

  constructor() {
    this.apiKey = process.env.OMDB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ OMDB_API_KEY not set in environment variables');
    }
  }

  private async makeRequest(params: Record<string, string>): Promise<OMDbMovieResponse> {
    if (!this.apiKey) {
      throw new Error('OMDb API key not configured');
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set('apikey', this.apiKey);
    
    // Add all parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`OMDb API error: ${response.status} ${response.statusText}`);
    }

    const data: OMDbMovieResponse = await response.json();
    
    if (data.Response === 'False') {
      throw new Error(data.Error || 'OMDb API returned an error');
    }

    return data;
  }

  async getMovieByImdbId(imdbId: string): Promise<EnrichedMovieData> {
    try {
      const data = await this.makeRequest({ 
        i: imdbId,
        plot: 'full' // Get full plot
      });

      return this.transformOMDbData(data);
    } catch (error) {
      console.warn(`OMDb lookup failed for IMDb ID ${imdbId}:`, error);
      return {};
    }
  }

  async getMovieByTitle(title: string, year?: string): Promise<EnrichedMovieData> {
    try {
      const params: Record<string, string> = { 
        t: title,
        plot: 'full'
      };
      
      if (year) {
        params.y = year;
      }

      const data = await this.makeRequest(params);
      return this.transformOMDbData(data);
    } catch (error) {
      console.warn(`OMDb lookup failed for title "${title}"${year ? ` (${year})` : ''}:`, error);
      return {};
    }
  }

  private transformOMDbData(data: OMDbMovieResponse): EnrichedMovieData {
    const enriched: EnrichedMovieData = {};

    // Basic movie information
    if (data.Title && data.Title !== 'N/A') {
      enriched.title = data.Title;
    }

    if (data.Year && data.Year !== 'N/A') {
      enriched.year = data.Year;
    }

    if (data.Released && data.Released !== 'N/A') {
      // Convert OMDb date format "14 Oct 1994" to ISO format "1994-10-14"
      try {
        const date = new Date(data.Released);
        if (!isNaN(date.getTime())) {
          enriched.releaseDate = date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
        }
      } catch (error) {
        console.warn(`Failed to parse OMDb release date: ${data.Released}`);
      }
    }

    if (data.Runtime && data.Runtime !== 'N/A') {
      // Convert "108 min" to number
      const runtimeMatch = data.Runtime.match(/(\d+)/);
      if (runtimeMatch) {
        enriched.runtime = parseInt(runtimeMatch[1], 10);
      }
    }

    if (data.Plot && data.Plot !== 'N/A' && data.Plot !== 'Plot unknown.') {
      enriched.plot = data.Plot;
    }

    if (data.Poster && data.Poster !== 'N/A') {
      enriched.poster = data.Poster;
    }

    // Cast and crew (convert comma-separated strings to arrays)
    if (data.Director && data.Director !== 'N/A') {
      enriched.directors = data.Director.split(',').map(d => d.trim());
    }

    if (data.Writer && data.Writer !== 'N/A') {
      enriched.writers = data.Writer.split(',').map(w => w.trim());
    }

    if (data.Actors && data.Actors !== 'N/A') {
      enriched.actors = data.Actors.split(',').map(a => a.trim());
    }

    // Categories (convert comma-separated strings to arrays)
    if (data.Genre && data.Genre !== 'N/A') {
      enriched.genres = data.Genre.split(',').map(g => g.trim());
    }

    if (data.Country && data.Country !== 'N/A') {
      enriched.countries = data.Country.split(',').map(c => c.trim());
    }

    if (data.Language && data.Language !== 'N/A') {
      enriched.languages = data.Language.split(',').map(l => l.trim());
    }

    if (data.Production && data.Production !== 'N/A') {
      enriched.studios = data.Production.split(',').map(p => p.trim());
    }

    // Ratings and reviews
    const rtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');
    if (rtRating) {
      enriched.rottenTomatoesRating = rtRating.Value;
      // Generate RT URL (approximate - actual URLs are complex)
      const titleSlug = data.Title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      enriched.rottenTomatoesUrl = `https://www.rottentomatoes.com/m/${titleSlug}`;
    }

    const metacriticRating = data.Ratings?.find(r => r.Source === 'Metacritic');
    if (metacriticRating) {
      enriched.metacriticRating = metacriticRating.Value;
    }

    if (data.imdbRating && data.imdbRating !== 'N/A') {
      enriched.imdbRating = data.imdbRating;
    }
    
    if (data.imdbVotes && data.imdbVotes !== 'N/A') {
      enriched.imdbVotes = data.imdbVotes;
    }

    if (data.Rated && data.Rated !== 'N/A') {
      enriched.contentRating = data.Rated;
    }

    // Awards and recognition
    if (data.Awards && data.Awards !== 'N/A') {
      enriched.awards = data.Awards;
    }

    // Financial data
    if (data.BoxOffice && data.BoxOffice !== 'N/A') {
      enriched.boxOffice = data.BoxOffice;
    }

    // Additional metadata
    if (data.DVD && data.DVD !== 'N/A') {
      enriched.dvdRelease = data.DVD;
    }

    if (data.Website && data.Website !== 'N/A') {
      enriched.websiteUrl = data.Website;
    }

    return enriched;
  }

  // Enhanced enrichment that tries multiple lookup methods
  async enrichMovieData(tmdbData: any): Promise<EnrichedMovieData> {
    let enrichedData: EnrichedMovieData = {};

    // First try: Use IMDb ID if available (most accurate)
    if (tmdbData.imdbId) {
      enrichedData = await this.getMovieByImdbId(tmdbData.imdbId);
      
      // If we got good data, return it
      if (Object.keys(enrichedData).length > 0) {
        return enrichedData;
      }
    }

    // Second try: Use title and year
    if (tmdbData.title && tmdbData.year) {
      enrichedData = await this.getMovieByTitle(tmdbData.title, tmdbData.year);
      
      if (Object.keys(enrichedData).length > 0) {
        return enrichedData;
      }
    }

    // Third try: Use title only (less accurate but might work)
    if (tmdbData.title) {
      enrichedData = await this.getMovieByTitle(tmdbData.title);
    }

    return enrichedData;
  }
}

export const omdbService = new OMDbService();
export type { EnrichedMovieData };
