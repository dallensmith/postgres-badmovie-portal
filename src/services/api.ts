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

class ApiService {
  private async fetchWithErrorHandling<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      
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
}

export const apiService = new ApiService();
