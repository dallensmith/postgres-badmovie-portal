export default function Dashboard() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 horror-text text-primary-500">
        Bad Movies Portal Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-dark-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Total Movies</h3>
          <p className="text-3xl font-bold text-primary-400">Loading...</p>
        </div>
        
        <div className="bg-dark-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Experiments</h3>
          <p className="text-3xl font-bold text-primary-400">Loading...</p>
        </div>
        
        <div className="bg-dark-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">People</h3>
          <p className="text-3xl font-bold text-primary-400">Loading...</p>
        </div>
        
        <div className="bg-dark-800 p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-2">Avg Rating</h3>
          <p className="text-3xl font-bold text-primary-400">Loading...</p>
        </div>
      </div>
      
      <div className="bg-dark-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Bad Movies Portal</h2>
        <p className="text-gray-300 mb-4">
          This PostgreSQL-first admin portal helps you manage "bad movie viewing experiments" - 
          community events where groups watch intentionally terrible movies together.
        </p>
        <p className="text-gray-300">
          Use this portal to manage your movie database, organize experiments, and maintain 
          data integrity between WordPress/Pods and your PostgreSQL database.
        </p>
      </div>
    </div>
  );
}
