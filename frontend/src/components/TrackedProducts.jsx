import { useEffect, useState } from "react";

function TrackedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrackedProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tracked-products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("TRACKED PRODUCTS ERROR:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTrackedProducts();
  }, []);

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Tracked Products
          </h2>
          {!loading && products.length > 0 && (
            <span className="text-sm text-gray-400">
              {products.length} {products.length === 1 ? "item" : "items"}
            </span>
          )}
        </div>

        <button
          onClick={loadTrackedProducts}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500">
            No products are being tracked yet.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Select a product and click "Track" to start monitoring prices.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium text-gray-900 truncate">
                  {product.product_name}
                </h3>

                <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                  Tracking
                </span>
              </div>

              <p className="text-sm text-gray-500 mt-1.5 truncate">
                {product.variant}
              </p>

              <p className="text-xs text-gray-400 mt-2 font-mono">
                ID: {product.product_id}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TrackedProducts;