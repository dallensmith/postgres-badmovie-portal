const API_BASE_URL = '/api'; // Use relative URL for proxy

export interface DashboardStats {
  totalMovies: number;
  totalExperiments: number;
  totalPeople: number;
  averageRating: number;
}

export interface RecentMovie {
  id: number;
  movieTitle: string;
  movieYear: string;
  moviePoster: string | null;
  createdAt: string;
}

export interface RecentExperiment {
  id: number;
  experimentNumber: string;
  eventDate: string;
  experimentMovies: string[];
  createdAt: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivity: {
    recentMovies: RecentMovie[];
    recentExperiments: RecentExperiment[];
  };
}

export interface Experiment {
  id: number;
  experimentNumber: string;
  eventDate: string;
  eventHost: string;
  eventLocation: string;
}

class ApiService {
  private async fetchWithErrorHandling<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  async getDashboardStats(): Promise<DashboardData> {
    return this.fetchWithErrorHandling<DashboardData>('/dashboard/stats');
  }

  async getMovies(): Promise<any> {
    return this.fetchWithErrorHandling<any>('/movies');
  }

  async getExperiments(): Promise<any> {
    return this.fetchWithErrorHandling<any>('/experiments');
  }

  async getExperimentsList(): Promise<Experiment[]> {
    return this.fetchWithErrorHandling<Experiment[]>('/experiments/list');
  }

  async getExperimentsWithMovies(
    page: number = 1, 
    limit: number = 20, 
    search: string = '', 
    sortBy: string = 'date', 
    sortOrder: string = 'desc'
  ): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      sortBy,
      sortOrder
    });
    return this.fetchWithErrorHandling<any>(`/experiments?${params}`);
  }

  async getExperiment(id: number): Promise<any> {
    return this.fetchWithErrorHandling<any>(`/experiments/${id}`);
  }

  async createExperiment(data: any): Promise<any> {
    return this.fetchWithErrorHandling<any>('/experiments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async updateExperiment(id: number, data: any): Promise<any> {
    return this.fetchWithErrorHandling<any>(`/experiments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async deleteExperiment(id: number): Promise<any> {
    return this.fetchWithErrorHandling<any>(`/experiments/${id}`, {
      method: 'DELETE',
    });
  }

  async linkMovieToExperiment(experimentId: number, movieId: number): Promise<any> {
    return this.fetchWithErrorHandling<any>(`/experiments/${experimentId}/movies/${movieId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async unlinkMovieFromExperiment(experimentId: number, movieId: number): Promise<any> {
    return this.fetchWithErrorHandling<any>(`/experiments/${experimentId}/movies/${movieId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();
