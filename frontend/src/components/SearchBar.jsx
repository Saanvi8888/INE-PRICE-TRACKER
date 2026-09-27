function SearchBar({ search, setSearch, handleSearch }) {
  return (
    <div className="max-w-2xl mx-auto text-center">
      <label className="block text-sm font-medium text-gray-600 mb-2">
        Search Product
      </label>

      <div className="flex gap-3">

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Enter product name..."
          className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Search
        </button>

      </div>

    </div>
  );
}

export default SearchBar;