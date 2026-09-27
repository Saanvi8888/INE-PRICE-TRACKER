const { chromium } = require("playwright");

async function scrapeProduct(productId, selectedVariant) {
//   const browser = await chromium.launch({
//     headless: false,
//     channel: "chrome",
//   });
    const browser = await chromium.launch({
        headless: process.env.NODE_ENV === "production",
        ...(process.env.NODE_ENV !== "production"
            ? { channel: "chrome" }
            : {})
    });

  const page = await browser.newPage();
  let productName = "";

  try {
    function cleanText(text) {
      return (text || "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    function cleanPrice(text) {
      let cleaned = cleanText(text)
        .replace(/\u00A0/g, " ")
        .replace(/Rs\.?/gi, "")
        .replace(/₹/g, "")
        .trim();

      cleaned = cleaned.replace(/[０-９]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0xfee0)
      );

      cleaned = cleaned.replace(/\.\d{2}$/, ""); 
      cleaned = cleaned.replace(/[,\s.]/g, ""); 

      const match = cleaned.match(/\d+/);
      return match ? Number(match[0]) : null;
    }

    function cleanDiscount(text) {
      const match = text.match(/\d+/);
      return match ? Number(match[0]) : null;
    }

    function extractStock(text) {
      const cleaned = cleanText(text);

      if (/sold out/i.test(cleaned)) return 0;

      const patterns = [
        /AVAILABLE\s*\(\s*([\d,]+)\s*\)/i,
        /([\d,]+)\s+UNITS?\s+AVAILABLE/i,
        /([\d,]+)\s+AVAILABLE/i,
        /LAST\s+FEW\s*:\s*([\d,]+)/i,
        /STOCK\s*:\s*([\d,]+)\s*REMAINING/i,
      ];

      for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match) return Number(match[1].replace(/,/g, ""));
      }

      return null;
    }

    async function handleCookies() {
        try {
            const button = page.locator('button[aria-label="Allow cookies"]');
            if ((await button.count()) &&(await button.isVisible())) {
                console.log("Clicking Allow cookies...");
                await button.click({force: true}).catch(() => {});
                await page.waitForTimeout(500);
            }
            const consentScrim = page.locator(".consent-scrim");
            if ((await consentScrim.count()) &&(await consentScrim.isVisible())) {
                console.log("Consent scrim still visible waiting...");
                await consentScrim.waitFor({
                    state: "hidden",
                    timeout: 5000
                });
            }
        } catch (error) {
            console.log("Cookie handling:", error.message);
        }
    }
    

    async function simulateHover(locator) {
        const box = await locator.boundingBox().catch(() => null);
        console.log("HOVER BOX:", box);
        if (!box) {
            console.log(" No bounding box");
            return false;
        }
        const y = box.y + box.height / 2;
        console.log(`Moving across: ${box.x} → ${box.x + box.width}`);
        await page.mouse.move(box.x, y);
        const steps = 30;
        for (let i = 1; i <= steps; i++) {
            const x = box.x + (box.width * i) / steps;
            await page.mouse.move(x, y);
            await page.waitForTimeout(50);
        }
        return true;
    }
    
    async function attemptPriceCheck(priceButton, pricePanel) {
        try {
            console.log("Waiting for quote API...");

            const responsePromise = page.waitForResponse(
                (response) =>
                    response.url().includes("/api/v2/items/") &&
                    response.url().includes("/quote"),
                { timeout: 10000 }
            );
            await priceButton.click()
            const response = await responsePromise;
            console.log("QUOTE URL:", response.url());
            console.log("QUOTE STATUS:", response.status());
            await page.waitForTimeout(1000);

            return "loaded";

        } catch (error) {
            console.log("Quote request failed:", error.message);
            return "timeout";
        }
    }

    console.log("STARTING PRODUCT SCRAPE");
    console.log("Product ID:", productId);
    console.log("Selected Variant:", selectedVariant);

    await page.goto(`https://demo.inelabteamdev.com/item/${productId}`, {
      waitUntil: "networkidle",
    });

    await handleCookies();

    productName = cleanText(await page.locator("h1").innerText());
    console.log("Product:", productName);
    console.log("ID:", productId);

    const variantButtons = page.locator("button[aria-pressed]");
    const variantCount = await variantButtons.count();

    // console.log(`Variants available: ${variantCount}`);
    let selectedButton = null;

    for (let v = 0; v < variantCount; v++) {
      const button = variantButtons.nth(v);
      const variantName = cleanText(await button.innerText());

      console.log(`Available variant: ${variantName}`);

      if (variantName.toLowerCase() === selectedVariant.toLowerCase()) {
        selectedButton = button;
        break;
      }
    }

    if (!selectedButton) {
      console.log(`Variant "${selectedVariant}" not found`);

      return {
        productId,
        productName,
        variant: selectedVariant,
        currentPrice: null,
        originalPrice: null,
        discount: null,
        seller: "",
        delivery: "",
        availability: "",
        stock: null,
        rating: null,
        ratingCount: "",
        outcome: "failed",
      };
    }

    const variantName = cleanText(await selectedButton.innerText());

    console.log("\n--------------------------------");
    console.log(`VARIANT: ${variantName}`);
    console.log("--------------------------------");

    await selectedButton.click();
    await page.waitForTimeout(500);
    const pricePanel = page.locator(".offer-panel");
    const priceMessage = pricePanel.locator(".offer-msg");
    const priceSubMessage = pricePanel.locator(".offer-submsg");
    console.log("Waiting for price panel...");

    try {
      await pricePanel.waitFor({ state: "visible", timeout: 10000 });
    } catch {
      console.log("Locked price panel not found.");
    }

    const availabilityLocatorEarly = page.locator(".avail-pill");
    let earlyAvailability = "";

    for (let i = 1; i <= 3; i++) {
      if (await availabilityLocatorEarly.count()) {
        earlyAvailability = cleanText(await availabilityLocatorEarly.first().innerText());
      }

      console.log(`Availability check ${i}:`, earlyAvailability);
      if (/sold out/i.test(earlyAvailability)) break;
      await page.waitForTimeout(500);
    }

    if (/sold out/i.test(earlyAvailability)) {
      console.log(`⏭️ ${variantName}: SOLD OUT`);

      return {
        productId,
        productName,
        variant: variantName,
        currentPrice: null,
        originalPrice: null,
        discount: null,
        seller: "",
        delivery: "",
        availability: earlyAvailability,
        stock: 0,
        rating: null,
        ratingCount: "",
        outcome: "success",
      };
    }

    const priceButton = page.locator('button[aria-label="Check today’s price"]');
    console.log("Waiting for price button...");

    try {
      await priceButton.waitFor({ state: "visible", timeout: 10000 });
    } catch {
      console.log("Check today's price button not found.");

      return {
        productId,
        productName,
        variant: variantName,
        currentPrice: null,
        originalPrice: null,
        discount: null,
        seller: "",
        delivery: "",
        availability: "",
        stock: null,
        rating: null,
        ratingCount: "",
        outcome: "failed",
      };
    }
    console.log("Simulating hover over price panel...");

    const consentScrim = page.locator(".consent-scrim");

    if (await consentScrim.isVisible().catch(() => false)) {
        console.log("Consent popup still open");

        const allowButton = page.locator('button[aria-label="Allow cookies"]');
        if (await allowButton.isVisible().catch(() => false)) {
            await allowButton.click({ force: true }).catch(() => {});
            await page.waitForTimeout(500);
        }
    }


    let unlocked = false;
    for (let attempt = 1; attempt <= 6; attempt++) {
        console.log(`Hover attempt ${attempt}`);
        await simulateHover(priceMessage);
        await page.waitForTimeout(200);

        await simulateHover(priceSubMessage);
        await page.waitForTimeout(200);

        await simulateHover(priceButton);
        await page.waitForTimeout(500);

        const enabled = await priceButton.isEnabled().catch(() => false);
        console.log(`Hover attempt ${attempt} = enabled: ${enabled}`);
        if (enabled) {
            unlocked = true;
            console.log("PRICE BUTTON ENABLED");
            break;
        }
    }

    if (!unlocked) {
      console.log(`${variantName}: Failed to unlcok`);

      return {
        productId,
        productName,
        variant: variantName,
        currentPrice: null,
        originalPrice: null,
        discount: null,
        seller: "",
        delivery: "",
        availability: "",
        stock: null,
        rating: null,
        ratingCount: "",
        outcome: "failed",
      };
    }

    let panelState = "unknown";
    let successfulAttempt = 0;
    const MAX_RETRIES = 4;

    for (let retry = 1; retry <= MAX_RETRIES; retry++) {
      console.log(`\nPrice check attempt ${retry}/${MAX_RETRIES}`);

      panelState = await attemptPriceCheck(priceButton, pricePanel);

      if (panelState === "loaded") {
        successfulAttempt = retry;
        break;
      }

      if (panelState === "reverted" || panelState === "timeout") {
        console.log("Retrying after revert");
        await simulateHover(pricePanel);
        await page.waitForTimeout(500);

        const stillThere = await priceButton.isVisible().catch(() => false);

        if (!stillThere) {
          console.log("Price button gone after revert - giving up.");
          break;
        }

        continue;
      }

      break;
    }

    if (panelState !== "loaded") {
      console.log(`${variantName}: PRICE NOT LOADED`);

      const availabilityCheck = page.locator(".avail-pill");
      let status = "";

      if (await availabilityCheck.count()) {
        status = cleanText(await availabilityCheck.first().innerText());
        console.log("Availability:", status);
      }

      return {
        productId,
        productName,
        variant: variantName,
        currentPrice: null,
        originalPrice: null,
        discount: null,
        seller: "",
        delivery: "",
        availability: status,
        stock: extractStock(status),
        rating: null,
        ratingCount: "",
        outcome: "failed",
      };
    }

    await page.waitForTimeout(500);
    const offerRow = pricePanel.locator(".offer-row");
    const offerText = cleanText(await offerRow.innerText());

    console.log("OFFER ROW TEXT:", offerText);

    const priceMatches = offerText.match(/₹\s*[\d,]+(?:\.\d{2})?/g) || [];

    if (priceMatches.length === 0) {
      throw new Error("Could not find price in offer row");
    }

    const currentPrice = cleanPrice(priceMatches[priceMatches.length - 1]);

    console.log("Current price:", currentPrice);
    const originalPriceLocator = page.locator('.offer-row span[style*="line-through"]').first();
    let originalPrice = null;

    if (await originalPriceLocator.count()) {
      originalPrice = cleanPrice(await originalPriceLocator.innerText());
    }

    const discountLocator = page.locator(".offer-row span").filter({ hasText: /saving/i }).first();

    let discount = null;
    if (await discountLocator.count()) {
      discount = cleanDiscount(await discountLocator.innerText());
    }

    const sellerLocator = page.locator(".offer-facts small").filter({ hasText: /^Seller:/i }).first();
    let seller = "";

    if (await sellerLocator.count()) {
      const sellerText = await sellerLocator.innerText();
      seller = cleanText(sellerText.replace(/^Seller:\s*/i, ""));
    }

    const deliveryLocator = page.locator(".offer-facts small").filter({ hasText: /delivery|delivered|arrives/i }).first();
    let delivery = "";

    if (await deliveryLocator.count()) {
      delivery = cleanText(await deliveryLocator.innerText());
    }

    const availabilityLocator = page.locator(".avail-pill");
    let availability = "";

    if (await availabilityLocator.count()) {
      availability = cleanText(await availabilityLocator.first().innerText());
    }

    const stock = extractStock(availability);

    const ratingLocator = page
      .locator('.offer-facts [aria-label^="Rated"]')
      .first();

    let rating = null;

    if (await ratingLocator.count()) {
      const ratingLabel = await ratingLocator.getAttribute("aria-label");

      if (ratingLabel) {
        const match = ratingLabel.match(/Rated\s+([\d.]+)\s+out of/i);
        if (match) rating = Number(match[1]);
      }
    }

    const ratingCountLocator = page.locator('.offer-facts [aria-label^="Rated"] small').first();
    let ratingCount = "";
    if (await ratingCountLocator.count()) {
      ratingCount = cleanText(await ratingCountLocator.innerText());
    }


    const data = {
      productId,
      productName,
      variant: variantName,
      currentPrice,
      originalPrice,
      discount,
      seller,
      delivery,
      availability,
      stock,
      rating,
      ratingCount,
      outcome: successfulAttempt > 1 ? "retried" : "success",
    };

    console.log("\n========== RESULT ==========");
    console.log(data);
    return data;
  } catch (error) {
    console.error("SCRAPER ERROR:", error.message);

    return {
      productId,
      productName,
      variant: selectedVariant,
      currentPrice: null,
      originalPrice: null,
      discount: null,
      seller: "",
      delivery: "",
      availability: "",
      stock: null,
      rating: null,
      ratingCount: "",
      outcome: "failed",
      error: error.message,
    };
  } finally {
    await browser.close();
  }
}

async function searchProducts(search) {
//   const browser = await chromium.launch({
//     headless: false,
//     channel: "chrome"
//   });
const browser = await chromium.launch({
    headless: process.env.NODE_ENV === "production",
    ...(process.env.NODE_ENV !== "production"
        ? { channel: "chrome" }
        : {})
});

  try {
    const page = await browser.newPage();
    const products = [];
    let pageNumber = 1;
    let totalPages = 1;
    while (pageNumber <= totalPages) {
      console.log(`Fetching catalog page ${pageNumber}/${totalPages}`);
      await page.goto(
        `https://demo.inelabteamdev.com/api/v2/listings?page=${pageNumber}&limit=20`,
        { waitUntil: "networkidle" }
      );

      const data = await page.locator("body").innerText();
      const listing = JSON.parse(data);
      totalPages = listing.totalPages;
      for (const product of (Array.isArray(listing.results)? listing.results : [])) {
        if (search && !product.name.toLowerCase().includes(search.toLowerCase())) {
          continue;
        }

        products.push({
          id: product.id,
          name: product.name
        });

        console.log("FOUND PRODUCT:",product.name,"ID:",product.id);
      }
      pageNumber++;
    }
    return products;
  } finally {
    await browser.close();
  }
}

async function getProductVariants(productId) {
    // const browser = await chromium.launch({
    //     headless: false,
    //     channel: "chrome"
    // });
    const browser = await chromium.launch({
        headless: process.env.NODE_ENV === "production",
        ...(process.env.NODE_ENV !== "production"
            ? { channel: "chrome" }
            : {})
    });

    try {
        const page = await browser.newPage();
        await page.goto(
            `https://demo.inelabteamdev.com/item/${productId}`,
            { waitUntil: "networkidle" }
        );

        const cookieButton = page.locator('button[aria-label="Allow cookies"]');

        if (await cookieButton.count() > 0) {
            await cookieButton.click();
        }

        const variantButtons = page.locator('button[aria-pressed]');
        const variants = [];
        const count = await variantButtons.count();
        for (let i = 0; i < count; i++) {
            const text = (await variantButtons.nth(i).innerText()).trim();
            if (text) {
                variants.push(text);
            }
        }
        return variants;
    } finally {
        await browser.close();
    }
}
module.exports = {scrapeProduct,searchProducts,getProductVariants};
