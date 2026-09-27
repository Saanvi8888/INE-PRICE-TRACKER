import { useState } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import ProductList from "./components/ProductList";
import TrackedProducts from "./components/TrackedProducts";
function App() {

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/products?search=${encodeURIComponent(search)}`
      );
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Search error:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <SearchBar
          search={search}
          setSearch={setSearch}
          handleSearch={handleSearch}
        />

        <TrackedProducts />
        {loading ? (
          <p className="mt-10 text-gray-500">
            Searching products...
          </p>
        ) : (
          <ProductList
            products={products}
            search={search}
          />
        )}

      </main>

    </div>
  );
}

export default App;