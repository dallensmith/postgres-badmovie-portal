export default function Movies() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Movies</h1>
      
      <div className="bg-dark-800 p-6 rounded-lg shadow-md">
        <p className="text-gray-300">
          Movie management interface coming soon. This will include:
        </p>
        <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
          <li>Browse and search movies</li>
          <li>Add new movies manually or via TMDb</li>
          <li>Edit movie details and relationships</li>
          <li>Manage cast, crew, and production details</li>
          <li>Set up affiliate links</li>
        </ul>
      </div>
    </div>
  );
}
