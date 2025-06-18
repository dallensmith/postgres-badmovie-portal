import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import Navbar from './components/layout/Navbar';
import Dashboard from './pages/Dashboard';
import Movies from './pages/Movies';
import Experiments from './pages/Experiments';
import CreateExperimentPage from './pages/CreateExperimentPage';
import ExperimentDetail from './pages/ExperimentDetail';
import People from './pages/People';
import Export from './pages/Export';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-dark-900 text-white">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/movies" element={<Movies />} />
              <Route path="/experiments" element={<Experiments />} />
              <Route path="/experiments/new" element={<CreateExperimentPage />} />
              <Route path="/experiments/:id/edit" element={<CreateExperimentPage />} />
              <Route path="/experiments/:id" element={<ExperimentDetail />} />
              <Route path="/people" element={<People />} />
              <Route path="/export" element={<Export />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
