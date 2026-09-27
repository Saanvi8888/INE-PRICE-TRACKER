const express = require("express");
const cors = require("cors");
const supabase = require("./supabase");
const { scrapeProduct,searchProducts,getProductVariants } = require("./scraper");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/scrape", async (req, res) => {
    try {
        const { productId, variant } = req.body;

        if (!productId || !variant) {
            return res.status(400).json({
                error: "productId and variant are required"
            });
        }

        const result = await scrapeProduct(Number(productId),variant);
        const { error: historyError } = await supabase.from("scrape_history")
            .insert([
                {
                    product_id: result.productId,
                    product_name: result.productName,
                    variant: result.variant,
                    timestamp: new Date().toISOString(),
                    price: result.currentPrice,
                    stock: result.stock,
                    outcome: result.outcome
                }
            ]);

        if (historyError) {
            console.error("History save failed:", historyError);
            return res.status(500).json({
                error: "Scrape succeeded but history could not be saved"
            });
        }

        console.log("History saved");
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Scraping failed"
        });
    }
});

app.post("/api/track", async (req, res) => {
    try {
        const { productId, productName, variant } = req.body;

        if (!productId || !productName || !variant) {
            return res.status(400).json({
                error: "productId, productName and variant are required"
            });
        }

        const { data, error } = await supabase.from("tracked_products")
            .insert([
                {
                    product_id: Number(productId),
                    product_name: productName,
                    variant: variant
                }
            ])
            .select();

        if (error) {
            console.error(error);
            return res.status(500).json({
                error: "Failed to track product"
            });
        }

        res.json(data[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({error: "Server error"});
    }
});

app.get("/api/tracked-products", async (req, res) => {
  try {
    const { data, error } = await supabase.from("tracked_products").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      return res.status(500).json({error: "Failed to get tracked products"});
    }
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: "Server error"});
  }
});


app.get("/api/history/:productId/:variant", async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    const variant = req.params.variant;

    const { data, error } = await supabase.from("scrape_history").select("*").eq("product_id", productId).eq("variant", variant)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error(error);
      return res.status(500).json({
        error: "Failed to get history"
      });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Server error"
    });
  }
});


app.get("/api/products", async (req, res) => {
    try {
        const search = req.query.search || "";
        if (!search) {
            return res.status(400).json({
                error: "Search term is required"
            });
        }

        const products = await searchProducts(search);
        res.json(products);
    } catch (error) {
        console.error(error)
        res.status(500).json({
            error: "Failed to search products"
        });
    }
});

app.get("/api/products/:id/variants", async (req, res) => {

    try {
        const productId = Number(req.params.id);
        const variants = await getProductVariants(productId);
        res.json(variants);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to get variants"
        });
    }
});


async function runTracking() {
  try {
    const { data: products, error } = await supabase.from("tracked_products").select("*");
    if (error) {
      console.error("Error getting tracked products:", error);
      return;
    }

    console.log("Tracked products:", products.length);

    for (const product of products) {
      console.log("PRODUCT:", product.product_name);
      console.log("VARIANT:", product.variant);

      try {
        const result = await scrapeProduct(
          product.product_id,
          product.variant
        );

        console.log("Scrape result:", result);
        const { error: historyError } = await supabase.from("scrape_history")
          .insert([
            {
              product_id: result.productId,
              product_name: result.productName,
              variant: result.variant,
              timestamp: new Date().toISOString(),
              price: result.currentPrice,
              stock: result.stock,
              outcome: result.outcome
            }
          ]);

        if (historyError) {
          console.error(
            "Error saving history:",
            historyError
          );
        } else {
          console.log("History saved");
        }

      } catch (error) {
        console.error("Scrape failed:", error);

        const { error: historyError } = await supabase.from("scrape_history")
          .insert([
            {
              product_id: product.product_id,
              product_name: product.product_name,
              variant: product.variant,
              timestamp: new Date().toISOString(),
              price: null,
              stock: null,
              outcome: "failed"
            }
          ]);

        if (historyError) {
          console.error(
            "Error saving failed attempt:",
            historyError
          );
        }
      }
    }

  } catch (error) {
    console.error(
      "Scheduled tracking error:",error);
  }
}


app.post("/api/run-scheduled-scrapes", (req, res) => {
  console.log("Scheduled scrape request received");
  runTracking();
  res.json({
    started: true
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);
});