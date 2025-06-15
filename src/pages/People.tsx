export default function People() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">People</h1>
      
      <div className="bg-dark-800 p-6 rounded-lg shadow-md">
        <p className="text-gray-300">
          People management interface coming soon. This will include:
        </p>
        <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2">
          <li>Browse actors, directors, and writers</li>
          <li>Add new people to the database</li>
          <li>Edit biographies and career details</li>
          <li>View filmographies and relationships</li>
          <li>Sync with TMDb data</li>
        </ul>
      </div>
    </div>
  );
}
