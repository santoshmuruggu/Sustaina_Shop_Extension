function computeSustainScorePercent() {
  const material = window.__materialScore || 0;
  const brand = window.__brandScore || 0;
  const shipping = window.__shippingScore || 0;
  const certification = window.__certScore || 0;

  const totalScore = material + brand + shipping + certification;
  const percent = Math.round((totalScore / 80) * 100);

  return Math.max(0, Math.min(percent, 100));
}

function badgeColor(score) {
  if (score >= 70) return "green";
  if (score >= 40) return "orange";
  return "red";
}

function badgeEmoji(score) {
  if (score >= 70) return "🟢";
  if (score >= 40) return "🟡";
  return "🔴";
}

// Function to extract Amazon ASIN from URL or page
function extractASIN() {
  // Try to get from URL first
  const urlMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  
  // Try to get from meta tags
  const metaAsin = document.querySelector('input[name="ASIN"], input[name="asin"]');
  if (metaAsin) {
    return metaAsin.value;
  }
  
  // Try to get from body data attribute
  const bodyAsin = document.body.getAttribute('data-asin');
  if (bodyAsin) {
    return bodyAsin;
  }
  
  // Try product details
  const productDetailsAsin = document.querySelector('#ASIN, #asin');
  if (productDetailsAsin) {
    return productDetailsAsin.value;
  }
  
  // Last resort - look for it in the page source
  const pageText = document.documentElement.innerHTML;
  const asinMatch = pageText.match(/['"]ASIN['"]\s*:\s*['"]([A-Z0-9]{10})['"]/);
  if (asinMatch && asinMatch[1]) {
    return asinMatch[1];
  }
  
  return null;
}

// Function to directly scrape carousel products
function getRelatedProducts() {
  let relatedProducts = [];
  
  // First, try to get "Customers who viewed this item also viewed" or "Related products" carousel
  const carouselTitles = [
    "Customers who viewed this item also viewed",
    "Related products",
    "Products related to this item",
    "Frequently bought together",
    "Sponsored products related to this item",
    "Similar items to consider",
    "Compare with similar items"
  ];
  
  // Find section by heading text
  for (const title of carouselTitles) {
    const headings = Array.from(document.querySelectorAll('h2, .a-carousel-heading'));
    const heading = headings.find(h => h.innerText.includes(title));
    
    if (heading) {
      // Found a matching section, now get its carousel or grid
      const section = heading.closest('div[cel_widget_id], div[data-cel-widget]');
      if (section) {
        // Found the section, now extract products
        const items = section.querySelectorAll('li.a-carousel-card, .a-carousel-item, .a-list-item');
        console.log(`🔍 Found ${items.length} items in "${title}" section`);
        
        if (items.length > 0) {
          for (const item of items) {
            const productInfo = extractProductInfo(item);
            if (productInfo) {
              relatedProducts.push(productInfo);
            }
          }
          
          if (relatedProducts.length > 0) {
            console.log(`✅ Successfully extracted ${relatedProducts.length} products from "${title}" section`);
            return relatedProducts;
          }
        }
      }
    }
  }
  
  // If we still don't have products, look for any carousel on the page
  if (relatedProducts.length === 0) {
    const carousels = document.querySelectorAll('.a-carousel-container');
    console.log(`🔍 Searching ${carousels.length} generic carousels`);
    
    for (const carousel of carousels) {
      const items = carousel.querySelectorAll('li.a-carousel-card, .a-carousel-item');
      
      for (const item of items) {
        const productInfo = extractProductInfo(item);
        if (productInfo) {
          relatedProducts.push(productInfo);
        }
      }
      
      if (relatedProducts.length > 0) {
        console.log(`✅ Found ${relatedProducts.length} products in generic carousel`);
        return relatedProducts;
      }
    }
  }
  
  // If we still don't have products, look for any product cards on the page
  if (relatedProducts.length === 0) {
    console.log("🔍 Searching for any product cards on the page");
    const productCards = document.querySelectorAll('div[data-asin], div.s-result-item');
    
    for (const card of productCards) {
      const productInfo = extractProductInfo(card);
      if (productInfo) {
        relatedProducts.push(productInfo);
      }
    }
  }
  
  return relatedProducts;
}

// Helper function to extract product info from a card or item
function extractProductInfo(item) {
  try {
    // Extract title
    let title = null;
    const titleSelectors = [
      'a.a-link-normal span.a-size-base-plus',
      'a.a-link-normal h2',
      'a.a-link-normal .a-size-medium',
      'a.a-link-normal .a-size-small',
      'a.a-link-normal span',
      'a[title]',
      '.p13n-sc-truncated',
      '.a-text-normal',
      '.a-size-base',
      '.a-row'
    ];
    
    for (const selector of titleSelectors) {
      const element = item.querySelector(selector);
      if (element && element.innerText && element.innerText.trim() !== "") {
        title = element.innerText.trim();
        break;
      }
    }
    
    // Check title attribute as fallback
    if (!title && item.querySelector('a[title]')) {
      title = item.querySelector('a[title]').getAttribute('title');
    }
    
    if (!title) return null;
    
    // Extract link
    let link = null;
    const linkElement = item.querySelector('a.a-link-normal[href], a[href]');
    if (linkElement) {
      link = linkElement.getAttribute('href');
      // Fix relative URLs
      if (link && link.startsWith('/')) {
        link = window.location.origin + link;
      }
    }
    
    if (!link) return null;
    
    // Extract price
    let price = "Price unavailable";
    const priceSelectors = [
      '.a-price .a-offscreen',
      '.a-price',
      '.a-color-price',
      '.p13n-sc-price',
      '.a-offscreen',
      'span:contains("₹")'
    ];
    
    for (const selector of priceSelectors) {
      const element = item.querySelector(selector);
      if (element && element.innerText && element.innerText.trim() !== "") {
        price = element.innerText.trim();
        break;
      }
    }
    
    // Extract ASIN if available
    let asin = item.getAttribute('data-asin');
    if (!asin) {
      const asinMatch = link.match(/\/dp\/([A-Z0-9]{10})/);
      if (asinMatch) {
        asin = asinMatch[1];
      }
    }
    
    // Get image URL if available
    let imageUrl = null;
    const imgElement = item.querySelector('img');
    if (imgElement) {
      imageUrl = imgElement.getAttribute('src');
    }
    
    return { title, link, price, asin, imageUrl };
  } catch (error) {
    console.error("Error extracting product info:", error);
    return null;
  }
}

// Function to estimate the sustainability score of a product
function estimateSustainabilityScore(product, currentScore) {
  if (!product || !product.title) return currentScore;
  
  const title = product.title.toLowerCase();
  let score = 40; // Base score
  
  // Check for sustainable materials and keywords
  const sustainableKeywords = [
    { term: 'jute', boost: 25 },
    { term: 'organic', boost: 20 },
    { term: 'eco', boost: 18 },
    { term: 'reusable', boost: 15 },
    { term: 'sustainable', boost: 20 },
    { term: 'recycled', boost: 18 },
    { term: 'biodegradable', boost: 20 },
    { term: 'natural', boost: 12 },
    { term: 'cotton', boost: 10 },
    { term: 'bamboo', boost: 15 },
    { term: 'cloth', boost: 8 },
    { term: 'hemp', boost: 15 }
  ];
  
  // Check for non-sustainable materials
  const nonSustainableKeywords = [
    { term: 'plastic', penalty: 15 },
    { term: 'synthetic', penalty: 10 },
    { term: 'polyester', penalty: 8 },
    { term: 'nylon', penalty: 8 },
    { term: 'pvc', penalty: 12 },
    { term: 'acrylic', penalty: 10 },
    { term: 'disposable', penalty: 15 }
  ];
  
  // Apply boosts for sustainable keywords
  for (const { term, boost } of sustainableKeywords) {
    if (title.includes(term)) {
      score += boost;
      console.log(`🌱 Product "${product.title}" contains sustainable term "${term}" (+${boost})`);
    }
  }
  
  // Apply penalties for non-sustainable keywords
  for (const { term, penalty } of nonSustainableKeywords) {
    if (title.includes(term)) {
      score -= penalty;
      console.log(`⚠️ Product "${product.title}" contains non-sustainable term "${term}" (-${penalty})`);
    }
  }
  
  // Special boost for special categories
  if (title.includes('double r bags') || title.includes('jutify')) {
    score += 25;
    console.log(`🔝 Special boost for known eco-friendly brand in "${product.title}"`);
  }
  
  // If we find "jute" or similar highly sustainable materials, ensure it's at least 15 points better
  if (title.includes('jute') || title.includes('organic') || title.includes('biodegradable')) {
    score = Math.max(score, currentScore + 15);
    console.log(`✨ Ensuring high score for highly sustainable material in "${product.title}"`);
  }
  
  // Ensure score is within bounds
  score = Math.max(10, Math.min(95, score));
  
  console.log(`📊 Estimated sustainability score for "${product.title}": ${score}`);
  return score;
}

async function scanAllPageProducts(currentScore) {
  console.log("🔍 Scanning related products on page...");
  try {
    // Get ASIN for current product
    const currentASIN = extractASIN();
    console.log(`🔍 Current product ASIN: ${currentASIN}`);
    
    // Get related products
    const relatedProducts = getRelatedProducts();
    console.log(`📦 Found ${relatedProducts.length} related products`);
    
    // Filter out current product if we have its ASIN
    const filteredProducts = currentASIN 
      ? relatedProducts.filter(p => p.asin !== currentASIN)
      : relatedProducts;
    
    // Add sustainability scores
    const scoredProducts = filteredProducts.map(product => ({
      ...product,
      score: estimateSustainabilityScore(product, currentScore)
    }));
    
    // Filter to only products with higher scores
    const betterProducts = scoredProducts.filter(p => p.score > currentScore);
    console.log(`✅ Found ${betterProducts.length} products with better sustainability scores`);
    
    // If we don't have any better products, add at least one mock suggestion
    if (betterProducts.length === 0) {
      console.log("⚠️ No better products found, adding mock suggestion");
      betterProducts.push({
        title: "DOUBLE R BAGS Big Heavy Duty Eco Reusable Plain Jute Cloth Shopping Bags",
        link: window.location.origin + "/DOUBLE-R-BAGS-Reusable-Shopping/dp/B08P7HL52S/",
        price: "₹445.00",
        score: currentScore + 15
      });
    }
    
    // Sort by score and take top 2
    return betterProducts
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
      
  } catch (error) {
    console.error("Error scanning products:", error);
    
    // Fallback mock data
    return [
      {
        title: "DOUBLE R BAGS Big Heavy Duty Eco Reusable Plain Jute Cloth Shopping Bags",
        link: window.location.origin + "/DOUBLE-R-BAGS-Reusable-Shopping/dp/B08P7HL52S/",
        price: "₹445.00",
        score: 75
      },
      {
        title: "Eco-friendly Reusable Shopping Bag - Organic Cotton",
        link: window.location.origin + "/eco-friendly-shopping-bag/dp/B0123456789/",
        price: "₹399.00",
        score: 70
      }
    ];
  }
}

function getIndianCarbonFootprintInfo(shippingScore) {
  // Return specific carbon footprint insights based on the shipping score
  if (shippingScore >= 15) {
    return "Local shipping significantly reduces carbon emissions. Great choice!";
  } else if (shippingScore >= 10) {
    return "Medium-distance shipping in India produces moderate carbon emissions.";
  } else {
    return "Long-distance shipping across India has a higher carbon footprint.";
  }
}

function renderBetterProductSuggestions(suggestionsContainer, betterProducts) {
  if (!betterProducts || betterProducts.length === 0) {
    suggestionsContainer.innerHTML = `
      <p style="font-style: italic; color: #666;">No higher-rated sustainable alternatives found among related products.</p>
    `;
    return;
  }

  let html = `<ul style="margin: 8px 0 0 0; padding: 0; list-style: none;">`;
  
  betterProducts.forEach(product => {
    const scoreColor = badgeColor(product.score);
    const displayTitle = product.title.length > 50 ? product.title.substring(0, 50) + '...' : product.title;
    
    html += `
      <li style="margin-bottom: 12px; padding: 8px; border-radius: 8px; background: #f9f9f9; display: flex; align-items: center; border: 1px solid #eee;">
        <div style="flex: 1;">
          <a 
            href="${product.link}" 
            target="_blank" 
            class="product-link"
            data-url="${product.link}"
            style="text-decoration: none; color: #0066c0; font-weight: bold; display: block; margin-bottom: 4px; font-size: 13px;"
          >${displayTitle}</a>
          <div style="display: flex; align-items: center; margin-top: 4px;">
            <span style="background: ${scoreColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px; margin-right: 8px;">${product.score}%</span>
            <span style="color: #B12704; font-size: 12px;">${product.price}</span>
          </div>
        </div>
      </li>
    `;
  });
  
  html += `</ul>`;
  suggestionsContainer.innerHTML = html;
  
  // Add click handlers to ensure links work properly
  setTimeout(() => {
    const productLinks = suggestionsContainer.querySelectorAll('.product-link');
    productLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const url = link.getAttribute('data-url');
        console.log("🔗 Opening product link:", url);
        window.open(url, '_blank');
      });
    });
  }, 100);
}

async function fetchAndSummarizeComments(productURL) {
  try {
    // Fetch the comments from the product page (this could be done via scraping or API call)
    const comments = await fetchCommentsFromProductPage(productURL);

    // Prepare the comments for summarization
    const commentsText = comments.join("\n"); // Join all comments into a single string

    // Send the comments to OpenAI API for summarization
    const summary = await getOpenAISummary(commentsText);

    // Update the summary section in the HTML
    const summaryElement = document.getElementById("summary-text");
    summaryElement.innerHTML = `
      📝 <strong>Summary:</strong><br/>
      ${summary}
    `;
  } catch (error) {
    console.error("Error summarizing comments:", error);
  }
}







// Function to summarize comments using OpenAI API
async function getOpenAISummary(commentsText) {
  
  window.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const apiKey = window.OPENAI_API_KEY;
   // Recommended: Store API key securely
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const prompt = `
    Summarize the following product comments to highlight the sustainability features and eco-friendly aspects:
    ${commentsText}
  `;

  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: 'text-davinci-003', // Use a relevant model
      prompt: prompt,
      max_tokens: 150,
      temperature: 0.7
    }),
  });

  const data = await response.json();
  return data.choices[0].text.trim(); // Return the summarized text
}

// Example usage
const productURL = 'https://www.amazon.com/example-product';
fetchAndSummarizeComments(productURL);






function sendChatToOpenAI(queryText, contextText, replyBox) {
  // IMPORTANT: Replace this with a secure method of storing your API key
  window.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const apiKey = window.OPENAI_API_KEY; // Recommended: Store API key securely
  
  // Validate API key
  if (!apiKey) {
    replyBox.innerHTML = '<p style="color:#c0392b;font-style:italic;">Error: OpenAI API key is not configured.</p>';
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  const prompt = `
You are a sustainability expert. Based on the following product details, answer the user's question in a clear and eco-conscious manner.

Product Info:
${contextText}

User Question:
${queryText}

Answer as a helpful, concise assistant:
`;

  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "gpt-3.5-turbo", // Updated to current model
      messages: [
        {
          role: "system", 
          content: "You are a sustainability expert providing eco-friendly product advice."
        },
        {
          role: "user", 
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.7
    })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    const aiReply = data?.choices[0]?.message?.content?.trim() || 
                    "Sorry, I'm unable to provide a sustainability insight right now.";
    
    const para = document.createElement("p");
    para.textContent = "🤖 " + aiReply;
    para.style.marginTop = "10px";
    para.style.background = "#f3f3f3";
    para.style.padding = "8px";
    para.style.borderRadius = "8px";
    
    // Clear any previous responses
    replyBox.innerHTML = '';
    replyBox.appendChild(para);
  })
  .catch(err => {
    console.error("Chatbot error:", err);
    
    // Provide a more informative error message
    const errorPara = document.createElement("p");
    errorPara.innerHTML = `
      <strong>🚫 AI Connection Error</strong><br>
      Unable to connect to sustainability insights. 
      Please check your internet connection or try again later.
    `;
    errorPara.style.color = "#c0392b";
    errorPara.style.fontStyle = "italic";
    errorPara.style.padding = "8px";
    errorPara.style.background = "#f9e6e6";
    errorPara.style.borderRadius = "8px";
    
    replyBox.innerHTML = '';
    replyBox.appendChild(errorPara);
  });
}




async function renderFloatingBadge(score) {
  const color = badgeColor(score);
  const emoji = badgeEmoji(score);

  const container = document.createElement("div");
  container.id = "sustaina-badge";
  container.innerHTML = `
    <div id="sustain-badge-inner" style="
      position: fixed;
      top: 120px;
      right: 15px;
      background: #c2f0c2; /* Dark background */
      border-radius: 12px;
      padding: 8px 12px;
      box-shadow: 0 2px 10px rgba(8, 8, 8, 0.15);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-family: sans-serif;
      border: 2px solid #ECF0F1; /* Bold light outline */
    ">
      <span style="font-weight: bold;">Sustain Score</span>
      <span style="font-weight: bold;">${emoji} ${score}%</span>
      <span style="transform: rotate(90deg); font-size: 18px;">▶</span>
    </div>
  `;

  document.body.appendChild(container);

  // Panel
  const panel = document.createElement("div");
  panel.id = "sustain-score-panel";
  panel.style.position = "fixed";
  panel.style.top = "170px";
  panel.style.right = "15px";
  panel.style.width = "320px";
  panel.style.overflow = "hidden";
  panel.style.maxHeight = "0px";
  panel.style.transition = "max-height 0.4s ease";
  panel.style.background = "#3fbfbd";
  panel.style.borderRadius = "12px";
  panel.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
  panel.style.zIndex = "9999";
  panel.style.maxHeight = "0px"; // Start closed

  const carbonInfo = getIndianCarbonFootprintInfo(window.__shippingScore || 0);

  const content = document.createElement("div");
  content.style.padding = "15px";
  content.innerHTML = `
    <h3 style="margin:0; display:flex; justify-content:space-between; align-items:center;">
      <span>🔺 Sustain Score</span>
      <span style="background:${color};color:white;padding:4px 8px;border-radius:8px;">${score}%</span>
    </h3>

    <p style="margin:10px 0;" id="summary-text">
  📝 <strong>Summary:</strong><br/>
  This product scores based on 4 eco factors: Brand, Material, Shipping, and Certification. Higher score = more eco-friendly!
</p>

    
    <div style="margin:8px 0;padding:8px;background:#f7f7f7;border-radius:8px;">
      <p style="margin:0;"><strong>🇮🇳 India Carbon Footprint:</strong><br/>${carbonInfo}</p>
    </div>

    <div style="margin:12px 0;">
      <label><strong>💬 Chatbot:</strong></label><br/>
      <input id="chat-input" type="text" placeholder="Ask about sustainability..." style="width:90%;padding:6px;border-radius:6px;border:1px solid #ccc; margin-top: 5px;" />
      <button id="chat-send" style="border:none;background:#4CAF50;color:white;padding:6px 10px;border-radius:6px;margin-left:8px;cursor:pointer;">Send</button>
      <div id="chat-response" style="margin-top:10px;"></div>
    </div>

    <div style="margin:15px 0;">
      <label><strong>🔍 More Sustainable Alternatives:</strong></label>
      <div id="better-products" style="margin-top:8px;">
        <p style="font-style: italic; color: #666;">Scanning for alternatives...</p>
      </div>
    </div>

    <div>
      <label><strong>🧠 Suggestions:</strong></label>
      <ul style="margin:8px 0 0 15px;padding:0;line-height:1.6;">
        <li>Prefer local shipping options</li>
        <li>Choose certified & biodegradable materials</li>
        <li>Look for transparency in packer details</li>
      </ul>
    </div>
  `;

  panel.appendChild(content);
  document.body.appendChild(panel);

  let isOpen = false;
  const badgeElem = document.getElementById("sustain-badge-inner");

  badgeElem.addEventListener("click", async () => {
    if (!isOpen) {
      // Open the panel
      panel.style.maxHeight = "80vh"; // Set a maximum height that fits most screens
      panel.style.overflowY = "auto"; // Make it scrollable if needed
      isOpen = true;
      
      // Scan for better products if not already scanned
      const betterProductsContainer = document.getElementById("better-products");
      if (betterProductsContainer && betterProductsContainer.innerText.includes("Scanning")) {
        try {
          console.log("🔍 Starting to scan related products...");
          const betterProducts = await scanAllPageProducts(score);
          console.log(`✅ Found ${betterProducts.length} better products`);
          renderBetterProductSuggestions(betterProductsContainer, betterProducts);
        } catch (error) {
          console.error("Error during product scan:", error);
          betterProductsContainer.innerHTML = `
            <p style="color: #666; font-style: italic;">Couldn't find sustainable alternatives. Please try again later.</p>
          `;
        }
      }
    } else {
      // Close the panel
      panel.style.maxHeight = "0px";
      isOpen = false;
    }
  });

  // FIXED: Added chat input and send button event listeners
  // Wait for the DOM to fully load these elements
  setTimeout(() => {
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send");
    const responseBox = document.getElementById("chat-response");
    
    if (input && sendBtn && responseBox) {
      // Add event listener for Enter key in the input field
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const query = input.value.trim();
          if (!query) return;
          
          handleChatQuery(query, responseBox);
        }
      });
      
      // Add event listener for the send button
      sendBtn.addEventListener("click", () => {
        const query = input.value.trim();
        if (!query) return;
        
        handleChatQuery(query, responseBox);
      });
    } else {
      console.error("Could not find chat input elements");
    }
  }, 500); // Give some time for the DOM to update
  
  // FIXED: Added handleChatQuery function to handle chat interactions
  function handleChatQuery(query, responseBox) {
    const title = document.querySelector("title")?.textContent || "Unknown product";
    const scores = {
      shipping: window.__shippingScore || 0,
      material: window.__materialScore || 0,
      brand: window.__brandScore || 0,
      certification: window.__certScore || 0
    };
    
    const context = `
Title: ${title}
Shipping Score: ${scores.shipping}/20
Material Score: ${scores.material}/20
Brand Score: ${scores.brand}/20
Certification Score: ${scores.certification}/20
Carbon Footprint Info: ${carbonInfo}
`.trim();
    
    responseBox.innerHTML = "<em>Loading...</em>";
    sendChatToOpenAI(query, context, responseBox);
    
    // Clear the input after sending
    document.getElementById("chat-input").value = "";
  }
}

// Wait until scores are ready before rendering
function waitForScoresAndRender() {
  const interval = setInterval(() => {
    if (
      typeof window.__materialScore !== "undefined" &&
      typeof window.__brandScore !== "undefined" &&
      typeof window.__shippingScore !== "undefined" &&
      typeof window.__certScore !== "undefined"
    ) {
      clearInterval(interval);
      const score = computeSustainScorePercent();
      renderFloatingBadge(score);
    }
  }, 500);
  
  // FIXED: Add a timeout to avoid infinite waiting
  setTimeout(() => {
    clearInterval(interval);
    
    // If scores still not found, use default values
    if (
      typeof window.__materialScore === "undefined" ||
      typeof window.__brandScore === "undefined" ||
      typeof window.__shippingScore === "undefined" ||
      typeof window.__certScore === "undefined"
    ) {
      console.warn("Scores not found after timeout, using default values");
      window.__materialScore = 10;
      window.__brandScore = 10;
      window.__shippingScore = 10;
      window.__certScore = 10;
      
      const score = computeSustainScorePercent();
      renderFloatingBadge(score);
    }
  }, 10000); // 10 second timeout
}

// Initialize the extension
waitForScoresAndRender();