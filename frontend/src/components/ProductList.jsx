import { useState } from "react";
import History from "./History";

function ProductList({ products, search }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [variant, setVariant] = useState("");
  const [result, setResult] = useState(null);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!search) return null;

  const handleSelect = async (product) => {
    setSelectedProduct(product);
    setVariant("");
    setResult(null);
    setVariants([]);
    setLoadingVariants(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${product.id}/variants`);
      const data = await response.json();
      // console.log("VARIANTS FROM BACKEND:", product.name, product.id, data);
      setVariants(data);
    } catch (error) {
      console.error(error);
      setVariants([]);
    }

    setLoadingVariants(false);
  };

  const handleScrape = async () => {
    if (!variant) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/scrape`, {
        method: "POST",
        headers: { "Content-Type":"application/json"},
        body: JSON.stringify({
          productId: selectedProduct.id,
          variant,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error(error);
      setResult({
        outcome: "failed",
        error: "Could not connect to backend",
      });
    }

    setLoading(false);
  };

  const handleTrack = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          variant,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to track");
      }
      console.log("TRACKED:", data);
      alert("Product tracked successfully");
    } catch (error) {
      console.error(error);
      alert("Failed to track product");
    }
  };

  return (
    <div className="mt-10 ">
      <div className="flex items-baseline mb-5 max-w-5xl mx-auto ">
        <h2 className="text-lg font-semibold text-gray-900 text-center">
          Search Results
        </h2>
      </div>

      <div className="grid gap-4 max-w-5xl mx-auto">
        {products.length > 0 ? (
          products.map((product) => {
            const isSelected = selectedProduct?.id === product.id;

            return (
              <div
                key={product.id}
                className={`bg-white border rounded-xl p-5 transition-shadow ${
                  isSelected
                    ? "border-gray-300 shadow-sm"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      {product.name}
                    </h3>

                    <p className="text-gray-500 text-sm mt-1 line-clamp-2">
                      {product.description}
                    </p>

                    <p className="text-xs text-gray-400 mt-2 font-mono">
                      ID: {product.id}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSelect(product)}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected
                        ? "bg-gray-100 text-gray-700"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                </div>

                {isSelected && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Variant
                    </label>

                    {loadingVariants ? (
                      <p className="text-sm text-gray-500">
                        Loading variants...
                      </p>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={variant}
                          onChange={(e) => setVariant(e.target.value)}
                          className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Choose variant</option>
                          {variants.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>

                        <div className="flex gap-2">
                          <button
                            onClick={handleScrape}
                            disabled={!variant || loading}
                            className="px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {loading ? "Scraping..." : "Check Price"}
                          </button>

                          <button
                            onClick={handleTrack}
                            disabled={!variant}
                            className="px-4 py-2.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Track
                          </button>
                        </div>
                      </div>
                    )}

                    {result && (
                      <div className="mt-5 bg-gray-50 border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-gray-700">
                            Price Details
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              result.outcome === "success"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {result.outcome}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                          <div>
                            <p className="text-gray-500 text-xs mb-0.5">
                              Price
                            </p>
                            <p className="font-medium text-gray-900">
                              {result.currentPrice
                                ? `Rs.${result.currentPrice.toLocaleString()}`
                                : "N/A"}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500 text-xs mb-0.5">
                              Stock
                            </p>
                            <p className="font-medium text-gray-900">
                              {result.stock ?? "N/A"}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500 text-xs mb-0.5">
                              Availability
                            </p>
                            <p className="font-medium text-gray-900">
                              {result.availability || "N/A"}
                            </p>
                          </div>

                          <div>
                            <p className="text-gray-500 text-xs mb-0.5">
                              Seller
                            </p>
                            <p className="font-medium text-gray-900 truncate">
                              {result.seller || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isSelected && variant && (
                  <History productId={selectedProduct.id} variant={variant} />
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">
              No products found. Try a different search.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductList;