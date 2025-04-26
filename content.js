const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

(async () => {
  console.log("✅ SustainaShop content script loaded");

  try {
    // Load brand database
    const response = await fetch(chrome.runtime.getURL("brand_db.json"));
    const brandDB = await response.json();

    // Try to load certification database - but don't fail if it's not there
    let certDB = {};
    try {
      const certResponse = await fetch(chrome.runtime.getURL("certified_brands_amazon_1000.json"));
      certDB = await certResponse.json();
      console.log("✅ Loaded certification database with", Object.keys(certDB).length, "brands");
    } catch (certErr) {
      console.warn("⚠️ Could not load certification database, falling back to text-based certification detection", certErr);
    }

    let titleEl = document.querySelector("#productTitle, .B_NuCI");
    if (!titleEl) return;

    const title = titleEl.innerText.trim();
    const titleLower = title.toLowerCase();

    // 🌿 Brand Score
    let brandMatch = brandDB.ethical.find(b => titleLower.includes(b.toLowerCase())) || 
                     brandDB.unethical.find(b => titleLower.includes(b.toLowerCase()));
    let brandScore = 10;
    if (brandMatch) {
      brandScore = brandDB.ethical.includes(brandMatch) ? 20 : 0;
    } else {
      brandMatch = "Unknown Brand";
    }
    window.__brandScore = brandScore;
    titleEl.insertAdjacentHTML("afterend", `<div style="background:#e0ffe0;color:#157347;padding:10px;font-weight:bold;margin-top:10px;">🌿 Brand Ethics Score: ${brandScore}/20 (${brandMatch})</div>`);

    // 🚛 Shipping Score (Dynamic with Packer City via OpenAI)
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;

      const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}`).then(r => r.json());
      const userCity = geo.address.city || geo.address.town || geo.address.state || "your location";

      // Check if we've hardcoded the delivery location in the UI
      let deliverToElement = document.querySelector("#glow-ingress-line2, .nav-line-2");
      let deliverCity = null;
      if (deliverToElement) {
        const deliverText = deliverToElement.innerText.trim();
        // Extract pincode from "Deliver to Srikakulam 532201"
        const deliverMatch = deliverText.match(/Deliver to\s+([A-Za-z\s]+)\s*(\d{6})?/i);
        if (deliverMatch && deliverMatch[1]) {
          deliverCity = deliverMatch[1].trim();
        }
      }

      // Alternative: Look for more specific delivery info on the page
      if (!deliverCity) {
        const deliverElements = document.querySelectorAll("span, div, p");
        for (let el of deliverElements) {
          if (el.innerText && el.innerText.includes("Deliver to")) {
            const deliverMatch = el.innerText.match(/Deliver to\s+([A-Za-z\s]+)\s*(\d{6})?/i);
            if (deliverMatch && deliverMatch[1]) {
              deliverCity = deliverMatch[1].trim();
              break;
            }
          }
        }
      }

      if (deliverCity) {
        console.log(`📍 Found delivery city in UI: ${deliverCity}`);
      }

      // Combine location info
      const userLocation = deliverCity || userCity;
      console.log(`📍 User location: ${userLocation}`);

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find seller location
      let packerText = null;
      
      // First try to find it in detail bullets
      const sections = ["#detailBullets_feature_div", "#productDetails_techSpec_section_1", "#productDetails_detailBullets_sections1", "#productDetails_techSpec_section_2"];
      for (let s of sections) {
        const div = document.querySelector(s);
        if (div?.innerText.includes("Packer")) {
          const match = div.innerText.match(/Packer\s*:?\s*(.+?)(\n|$)/i);
          if (match) {
            packerText = match[1].trim();
            break;
          }
        }
      }
      
      // Try looking in tables
      if (!packerText) {
        const tables = document.querySelectorAll("table");
        for (let table of tables) {
          if (table.innerText.includes("Packer")) {
            const rows = table.querySelectorAll("tr");
            for (let row of rows) {
              if (row.innerText.includes("Packer")) {
                const cells = row.querySelectorAll("td, th");
                if (cells.length > 1) {
                  packerText = cells[1].innerText.trim();
                  break;
                }
              }
            }
            if (packerText) break;
          }
        }
      }
      
      // Try looking in lists
      if (!packerText) {
        const listItems = document.querySelectorAll("li");
        for (let item of listItems) {
          if (item.innerText.includes("Packer")) {
            const match = item.innerText.match(/Packer\s*:?\s*(.+?)(\n|$)/i);
            if (match) {
              packerText = match[1].trim();
              break;
            }
          }
        }
      }
      
      // Look in spans and divs
      if (!packerText) {
        const allElements = document.querySelectorAll("span, div, p");
        for (let el of allElements) {
          if (el.innerText && el.innerText.includes("Packer")) {
            const match = el.innerText.match(/Packer\s*:?\s*(.+?)(\n|$)/i);
            if (match) {
              packerText = match[1].trim();
              break;
            }
          }
        }
      }
      
      // Check for importer, manufacturer as fallback
      if (!packerText) {
        const altLabels = ["Importer", "Manufacturer", "Sold by"];
        for (let label of altLabels) {
          for (let s of sections) {
            const div = document.querySelector(s);
            if (div?.innerText.includes(label)) {
              const match = div.innerText.match(new RegExp(`${label}\\s*:?\\s*(.+?)(\\n|$)`, 'i'));
              if (match) {
                packerText = match[1].trim();
                console.log(`⚠️ Using ${label} as fallback for packer info`);
                break;
              }
            }
          }
          if (packerText) break;
          
          // Also look in tables
          const tables = document.querySelectorAll("table");
          for (let table of tables) {
            if (table.innerText.includes(label)) {
              const rows = table.querySelectorAll("tr");
              for (let row of rows) {
                if (row.innerText.includes(label)) {
                  const cells = row.querySelectorAll("td, th");
                  if (cells.length > 1) {
                    packerText = cells[1].innerText.trim();
                    console.log(`⚠️ Using ${label} from table as fallback for packer info`);
                    break;
                  }
                }
              }
              if (packerText) break;
            }
          }
          if (packerText) break;
        }
      }

      console.log("📦 Packer/Seller Text:", packerText);

      let sellerCity = null;
      if (packerText) {
        try {
          const prompt = `Extract ONLY the city name (no pin code, no state, no extra text) from this Indian address. 
If multiple cities are mentioned, choose the primary one where the product is coming from:
"${packerText}"
Only respond with the city name. If no city is found, reply "Unknown".`;

          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                { role: "system", content: "You are a precise city extractor that only returns a single city name from addresses." },
                { role: "user", content: prompt }
              ],
              temperature: 0.1
            })
          }).then(r => r.json());

          try {
            const cityGuessRaw = res.choices?.[0]?.message?.content?.trim() || "";
            console.log("🏙 OpenAI City Extracted:", cityGuessRaw);
            
            const cityGuess = cityGuessRaw.split(/[\n,]+/)[0].trim();  // handle cases like "Mumbai\n"
            if (cityGuess && !/unknown|not found|none/i.test(cityGuess)) {
              sellerCity = cityGuess;
              console.log(`✅ Found seller city: ${sellerCity}`);
            } else {
              console.warn("⚠️ OpenAI couldn't extract city properly.");
              sellerCity = null;
            }
          } catch (e) {
            console.error("❌ Error extracting city from OpenAI response:", e);
            sellerCity = null;
          }
        } catch (e) {
          console.warn("❌ Failed to extract city from packer:", e);
          sellerCity = null;
        }
      }
      
      // Direct detection of shipping info from the UI
      // This checks for shipping location info already in the UI
      if (!sellerCity) {
        // Look for shipping info in already shown UI elements
        const shippingElements = document.querySelectorAll(".twister-plus-shipping-message, .sims-fbt-shipping-details");
        for (let el of shippingElements) {
          if (el.innerText && el.innerText.includes("from")) {
            const match = el.innerText.match(/(?:from|ships from)\s+([A-Za-z\s]+)/i);
            if (match && match[1]) {
              sellerCity = match[1].trim();
              console.log(`📍 Found shipping origin in UI: ${sellerCity}`);
              break;
            }
          }
        }
      }
      
      // Direct regex search on page for "Ships from [location]"
      if (!sellerCity) {
        const pageText = document.body.innerText;
        const shipsFromMatch = pageText.match(/Ships from\s+([A-Za-z\s]+)(?:,|\.|to)/i);
        if (shipsFromMatch && shipsFromMatch[1]) {
          sellerCity = shipsFromMatch[1].trim();
          console.log(`📍 Found ships from text: ${sellerCity}`);
        }
      }
      
      // Look for pre-inserted shipping eco score element
      if (!sellerCity) {
        const scoreElements = document.querySelectorAll("div[style*='background:#e6f7ff']");
        for (let el of scoreElements) {
          if (el.innerText && el.innerText.includes("Shipping Eco Score")) {
            const match = el.innerText.match(/\(([^→]+)→/);
            if (match && match[1]) {
              sellerCity = match[1].trim();
              console.log(`📍 Found seller city in already displayed score: ${sellerCity}`);
              break;
            }
          }
        }
      }

      // Fallback to default when all else fails
      if (!sellerCity) {
        sellerCity = "New Delhi";
        console.warn("⚠️ Using default seller city: New Delhi");
      }

      const coords = async (place) => {
        try {
          console.log(`🔍 Looking up coordinates for: ${place}, India`);
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place + ", India")}`);
          const data = await response.json();
          
          if (!data || data.length === 0) {
            console.warn(`⚠️ Could not find coordinates for ${place}, using defaults`);
            return { lat: 28.61, lon: 77.20 }; // Default New Delhi coordinates
          }
          
          console.log(`📍 Found coordinates for ${place}:`, data[0]);
          return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon)
          };
        } catch (err) {
          console.error(`❌ Error fetching coordinates for ${place}:`, err);
          return { lat: 28.61, lon: 77.20 }; // Default to New Delhi on error
        }
      };

      const from = await coords(sellerCity);
      const to = await coords(userLocation);
      
      console.log(`🗺️ Distance calculation: ${sellerCity} (${from.lat}, ${from.lon}) → ${userLocation} (${to.lat}, ${to.lon})`);

      const dist = (() => {
        const toRad = (v) => (v * Math.PI) / 180;
        const dLat = toRad(to.lat - from.lat);
        const dLon = toRad(to.lon - from.lon);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // Haversine formula
      })();

      console.log(`📏 Calculated distance: ${dist.toFixed(0)} km`);

      // India-specific carbon footprint scoring
      // For India's geography, adjusted distances:
      const shippingScore = dist < 150 ? 20 : // Very local shipping (within same region)
                            dist < 500 ? 15 : // Short distance shipping (neighboring states)
                            dist < 1000 ? 10 : // Medium distance (across several states)
                            dist < 2000 ? 5 : // Long distance (across country)
                            0; // Very long distance or international
      
      window.__shippingScore = shippingScore;
      window.__sellerCity = sellerCity;
      window.__userCity = userLocation;
      window.__shippingDistance = Math.round(dist);
      
      titleEl.insertAdjacentHTML("afterend", `<div style="background:#e6f7ff;color:#006d75;padding:10px;font-weight:bold;margin-top:10px;">🚛 Shipping Eco Score: ${shippingScore}/20 (${sellerCity} → ${userLocation}, ${dist.toFixed(0)} km)</div>`);
    });

    // 🧪 Material Score via OpenAI
    try {
      const bodyText = document.body.innerText.slice(0, 1500);
      const inputText = titleEl.innerText + "\n" + bodyText;

      const materialPrompt = `
You are an eco-materials analyst. Based on this product title and description, rate the **sustainability of the materials used** out of 20.

Only respond with a number from 0 to 20.

Title: ${titleEl.innerText}
Description: ${bodyText}
`;

      const result = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "user", content: materialPrompt }
          ],
          temperature: 0.2
        })
      }).then(r => r.json());

      const reply = result.choices?.[0]?.message?.content?.trim() || "10";
      const materialScore = Math.max(0, Math.min(20, parseInt(reply.match(/\d+/)?.[0] || "10")));

      window.__materialScore = materialScore;
      titleEl.insertAdjacentHTML("afterend", `<div style="background:#fffbe6;color:#614700;padding:10px;font-weight:bold;margin-top:10px;">🧪 Material Score: ${materialScore}/20 (via AI)</div>`);
    } catch (e) {
      console.error("Material scoring failed:", e);
    }

    // 📜 Certification Score with certified_brands_amazon_1000.json
    try {
      const pageContent = document.body.innerText.slice(0, 3000);
      
      // APPROACH 1: Try to find brand directly from title
      const titleWords = title.split(/[\s,\-–—]/); // Split by spaces, commas, and various dashes
      let possibleBrands = [];
      
      // Add first 1-3 words as possible brand names
      if (titleWords.length > 0) possibleBrands.push(titleWords[0]);
      if (titleWords.length > 1) possibleBrands.push(titleWords[0] + " " + titleWords[1]);
      if (titleWords.length > 2) possibleBrands.push(titleWords[0] + " " + titleWords[1] + " " + titleWords[2]);
      
      // Add "by Brand" pattern
      const byMatch = title.match(/by\s+([A-Za-z0-9\s&]+)/i);
      if (byMatch) possibleBrands.push(byMatch[1].trim());
      
      // Look for explicitly labeled brand in page
      const brandMatch = pageContent.match(/Brand[\s:]*([A-Za-z0-9\s&]+)/i);
      if (brandMatch) possibleBrands.push(brandMatch[1].trim());
      
      // If we detected a brand in the earlier brand score, add it too
      if (brandMatch !== "Unknown Brand") {
        possibleBrands.push(brandMatch);
      }
      
      console.log("🔍 Possible brands:", possibleBrands);
      
      // Check each brand against the cert database
      let matchedBrand = null;
      let certData = null;
      
      for (const brand of possibleBrands) {
        // Try direct match
        if (certDB[brand]) {
          matchedBrand = brand;
          certData = certDB[brand];
          break;
        }
        
        // Try case-insensitive direct match
        for (const dbBrand in certDB) {
          if (brand.toLowerCase() === dbBrand.toLowerCase()) {
            matchedBrand = dbBrand;
            certData = certDB[dbBrand];
            break;
          }
        }
        
        // Try partial match (check if DB brand is contained within product brand)
        if (!certData) {
          for (const dbBrand in certDB) {
            if (brand.toLowerCase().includes(dbBrand.toLowerCase())) {
              matchedBrand = dbBrand;
              certData = certDB[dbBrand];
              break;
            }
          }
        }
        
        if (certData) break;
      }
      
      let certScore = 10; // Default score
      let certList = [];
      let flag = "None";
      
      // APPROACH 2: Check for certifications directly in the page text
      // This is a fallback and is also used to supplement approach 1
      const verified = ["FSC", "USDA Organic", "Fair Trade", "Energy Star", "Green Seal", "Wildcraft", "B-Corp", "GOTS", "FairTrade"];
      const suspicious = ["eco-tested", "green grade", "eco-labelled", "EarthSafe"];
      
      if (certData) {
        // Found a match in the certification database
        console.log(`✅ Found brand "${matchedBrand}" in certification database`);
        
        if (certData.ethical_score !== undefined) {
          // Use score from database
          certScore = certData.ethical_score;
          // Make sure it's on a 0-20 scale
          certScore = Math.round((certScore / 20) * 20);
        }
        
        if (certData.certifications && certData.certifications.length > 0) {
          certList = [...certData.certifications];
          flag = "Verified";
        }
      }
      
      // Also look for certifications in the page text to supplement database results
      for (let cert of verified) {
        if (pageContent.toLowerCase().includes(cert.toLowerCase())) {
          // If using database score, don't add more points, just add to the list
          if (!certData) certScore += 5;
          
          if (!certList.includes(cert)) {
            certList.push(cert);
            flag = "Verified";
          }
        }
      }
      
      for (let cert of suspicious) {
        if (pageContent.toLowerCase().includes(cert.toLowerCase())) {
          if (!certData) certScore -= 5;
          
          if (!certList.includes(cert)) {
            certList.push(cert);
            
            // Only override flag if it's not already "Verified"
            if (flag !== "Verified") {
              flag = "Suspicious";
            }
          }
        }
      }
      
      // Ensure score is in valid range
      certScore = Math.max(0, Math.min(20, certScore));
      
      window.__certScore = certScore;
      window.__certifications = certList;
      window.__certFlag = flag;
      
      // Display certification score and info
      titleEl.insertAdjacentHTML("afterend", `<div style="background:#f0fff0;color:#065f46;padding:10px;font-weight:bold;margin-top:10px;">📜 Certification Score: ${certScore}/20 (${flag}: ${certList.join(", ") || "None"})</div>`);
      
    } catch (e) {
      console.error("Certification scoring error:", e);
      
      // Simple fallback if all else fails
      try {
        const content = titleEl.innerText.trim() + "\n" + document.body.innerText.slice(0, 2000);
        const verified = ["FSC Certified", "USDA Organic", "Fair Trade", "Energy Star", "Green Seal", "Wildcraft"];
        const suspicious = ["eco-tested", "green grade", "eco-labelled", "EarthSafe"];
        let certScore = 10, found = [], flag = "None";

        for (let cert of verified) {
          if (content.toLowerCase().includes(cert.toLowerCase())) {
            certScore += 10;
            found.push(cert);
            flag = "Verified";
          }
        }
        for (let cert of suspicious) {
          if (content.toLowerCase().includes(cert.toLowerCase())) {
            certScore -= 5;
            found.push(cert);
            flag = "Suspicious";
          }
        }
        certScore = Math.max(0, Math.min(certScore, 20));
        window.__certScore = certScore;
        titleEl.insertAdjacentHTML("afterend", `<div style="background:#f0fff0;color:#065f46;padding:10px;font-weight:bold;margin-top:10px;">📜 Certification Score: ${certScore}/20 (${flag}: ${found.join(", ") || "None"})</div>`);
      } catch (fallbackError) {
        console.error("Fallback certification scoring error:", fallbackError);
      }
    }
  } catch (e) {
    console.error("❌ Fatal error in SustainaShop content script:", e);
  }
})();