import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

type ExportFormat = 'csv' | 'json';
type ExportScope = 'all' | 'movies' | 'experiments' | 'people';

interface ExportOptions {
  format: ExportFormat;
  scope: ExportScope;
  includeRelationships: boolean;
  includeMetadata: boolean;
}

interface PreviewData {
  totalRecords: number;
  sampleData: any[];
  columns: string[];
  estimatedFileSize: string;
}

export default function Export() {
  const navigate = useNavigate();
  const [options, setOptions] = useState<ExportOptions>({
    format: 'csv',
    scope: 'all',
    includeRelationships: true,
    includeMetadata: true
  });
  
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Generate preview when options change
  useEffect(() => {
    generatePreview();
  }, [options]);

  const generatePreview = async () => {
    setIsPreviewLoading(true);
    try {
      const previewData = await apiService.getExportPreview(options);
      setPreview(previewData);
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const blob = await apiService.exportData(options);
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `badmovies-${options.scope}-${timestamp}.${options.format}`;
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold horror-text text-primary-500">
            Database Export
          </h1>
          <p className="text-gray-400 mt-2">
            Export your data for backup, analysis, or migration
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-dark-700 hover:bg-dark-600 border border-dark-600 hover:border-primary-500 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Export Options */}
        <div className="bg-dark-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="text-2xl mr-3">⚙️</span>
            Export Options
          </h2>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOptions({...options, format: 'csv'})}
                className={`p-4 rounded-lg border transition-colors ${
                  options.format === 'csv'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-dark-600 bg-dark-700 hover:border-primary-500'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <div className="font-medium">CSV</div>
                  <div className="text-xs text-gray-400">Spreadsheet format</div>
                </div>
              </button>
              <button
                onClick={() => setOptions({...options, format: 'json'})}
                className={`p-4 rounded-lg border transition-colors ${
                  options.format === 'json'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-dark-600 bg-dark-700 hover:border-primary-500'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">📄</div>
                  <div className="font-medium">JSON</div>
                  <div className="text-xs text-gray-400">Structured data</div>
                </div>
              </button>
            </div>
          </div>

          {/* Scope Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              What to Export
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setOptions({...options, scope: 'all'})}
                className={`p-3 rounded-lg border transition-colors text-left ${
                  options.scope === 'all'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-dark-600 bg-dark-700 hover:border-primary-500'
                }`}
              >
                <div className="font-medium">🎯 Everything</div>
                <div className="text-xs text-gray-400">All data with relationships</div>
              </button>
              <button
                onClick={() => setOptions({...options, scope: 'movies'})}
                className={`p-3 rounded-lg border transition-colors text-left ${
                  options.scope === 'movies'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-dark-600 bg-dark-700 hover:border-primary-500'
                }`}
              >
                <div className="font-medium">🎬 Movies Only</div>
                <div className="text-xs text-gray-400">Movie data and metadata</div>
              </button>
              <button
                onClick={() => setOptions({...options, scope: 'experiments'})}
                className={`p-3 rounded-lg border transition-colors text-left ${
                  options.scope === 'experiments'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-dark-600 bg-dark-700 hover:border-primary-500'
                }`}
              >
                <div className="font-medium">🧪 Experiments Only</div>
                <div className="text-xs text-gray-400">Experiment data and links</div>
              </button>
              <button
                onClick={() => setOptions({...options, scope: 'people'})}
                className={`p-3 rounded-lg border transition-colors text-left ${
                  options.scope === 'people'
                    ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                    : 'border-dark-600 bg-dark-700 hover:border-primary-500'
                }`}
              >
                <div className="font-medium">👥 People Only</div>
                <div className="text-xs text-gray-400">Actors, directors, writers</div>
              </button>
            </div>
          </div>

          {/* Additional Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Additional Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeRelationships}
                  onChange={(e) => setOptions({...options, includeRelationships: e.target.checked})}
                  className="mr-3 rounded"
                />
                <span className="text-sm">Include Relationships</span>
                <span className="ml-2 text-xs text-gray-400">(movie-experiment links, cast, crew)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeMetadata}
                  onChange={(e) => setOptions({...options, includeMetadata: e.target.checked})}
                  className="mr-3 rounded"
                />
                <span className="text-sm">Include Metadata</span>
                <span className="ml-2 text-xs text-gray-400">(sync status, timestamps, IDs)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-dark-800 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <span className="text-2xl mr-3">👁️</span>
            Data Preview
          </h2>

          {isPreviewLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-pulse text-primary-400">
                🔄 Generating preview...
              </div>
            </div>
          ) : preview ? (
            <div>
              {/* Preview Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-dark-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Total Records</div>
                  <div className="text-2xl font-bold text-primary-400">
                    {preview.totalRecords.toLocaleString()}
                  </div>
                </div>
                <div className="bg-dark-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">Estimated Size</div>
                  <div className="text-2xl font-bold text-primary-400">
                    {preview.estimatedFileSize}
                  </div>
                </div>
              </div>

              {/* Column Preview */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Columns ({preview.columns.length})</h3>
                <div className="bg-dark-700 p-3 rounded max-h-32 overflow-y-auto">
                  <div className="text-xs text-gray-300 space-y-1">
                    {preview.columns.map((column, index) => (
                      <div key={index} className="flex items-center">
                        <span className="w-4 h-4 bg-primary-500 rounded-full mr-2 text-xs flex items-center justify-center text-white">
                          {index + 1}
                        </span>
                        {column}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sample Data */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Sample Data (First 3 Records)</h3>
                <div className="bg-dark-700 rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-dark-600 sticky top-0">
                        <tr>
                          {preview.columns.slice(0, 4).map((column, index) => (
                            <th key={index} className="p-2 text-left font-medium">
                              {column}
                            </th>
                          ))}
                          {preview.columns.length > 4 && (
                            <th className="p-2 text-left font-medium text-gray-400">
                              +{preview.columns.length - 4} more...
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleData.map((row, index) => (
                          <tr key={index} className="border-t border-dark-600">
                            {preview.columns.slice(0, 4).map((column, colIndex) => (
                              <td key={colIndex} className="p-2 text-gray-300">
                                <div className="truncate max-w-32">
                                  {String(row[column] || '')}
                                </div>
                              </td>
                            ))}
                            {preview.columns.length > 4 && (
                              <td className="p-2 text-gray-400">...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-4 rounded-lg text-white font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Exporting... {exportProgress}%</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Download Export</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              Select export options to see preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
