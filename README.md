# SustainaShop AI 🌱

## Overview

SustainaShop AI is a Chrome extension that provides real-time sustainability scoring for products on e-commerce platforms like Amazon and Flipkart. The extension helps environmentally conscious shoppers make more informed purchasing decisions by analyzing products across four key sustainability metrics.

![SustainaShop AI Badge](https://placeholder-image.com/sustainashop-badge.png)

## Features

### 🔄 Real-time Product Scoring

SustainaShop analyzes products and displays a sustainability score (0-100%) based on four key factors:

- **🌿 Brand Ethics Score**: Evaluates the brand's sustainability commitment using our ethical brands database
- **🚛 Shipping Eco Score**: Calculates the carbon footprint based on shipping distance
- **🧪 Material Score**: Evaluates the sustainability of product materials
- **📜 Certification Score**: Identifies verified eco-certifications and labels

### 🔍 Sustainable Alternatives

- Automatically scans related products to suggest more sustainable alternatives with higher eco-scores
- Compares prices and sustainability scores side by side

### 💬 Sustainability Chatbot

- Built-in AI chatbot powered by OpenAI to answer sustainability-specific questions about products
- Provides personalized advice based on the product context

### 📊 Carbon Footprint Insights

- Location-aware shipping distance calculation
- India-specific carbon footprint information
- Visualization of shipping environmental impact

## Installation

### From Chrome Web Store
1. Visit the [SustainaShop AI Chrome Web Store page](#)
2. Click "Add to Chrome"
3. The extension will automatically work on supported e-commerce sites

### For Developers
1. Clone this repository:
   ```
   git clone https://github.com/yourusername/sustainashop-ai.git
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the cloned repository folder
5. Configure your OpenAI API key in the extension settings

## Configuration

The extension requires an OpenAI API key for material classification and chatbot functionality:

1. Get an API key from [OpenAI](https://platform.openai.com/)
2. Set the API key in the extension's options page (right-click on the extension icon → Options)

## How It Works

### Brand Ethics Analysis
- Compares product brand against our database of ethical and unethical companies
- Awards scores based on ethical standing and corporate sustainability practices

### Material Sustainability
- Uses AI to analyze product descriptions and identify sustainable materials
- Classifies materials into categories (biodegradable, plastic, eco-friendly, etc.)

### Shipping Distance Calculation
- Determines product shipping origin location
- Calculates shipping distance to user location
- Scores products based on shipping carbon footprint

### Certification Verification
- Detects legitimate eco-certifications (FSC, USDA Organic, Fair Trade, etc.)
- Flags suspicious "greenwashing" certifications

## Technologies Used

- **Frontend**: JavaScript, HTML, CSS
- **AI Integration**: OpenAI GPT-3.5 for material classification and chatbot
- **Geolocation**: OpenStreetMap Nominatim API for distance calculations
- **Data Storage**: JSON databases for brand ethics and certifications

## Privacy

SustainaShop AI respects your privacy:
- No personal shopping data is stored or transmitted
- Location data is used only for shipping distance calculation and never stored
- All AI queries are anonymized

## Contributing

Contributions are welcome! Please check out our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Load unpacked extension from the `dist` folder

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Eco-certification data provided by [EcoCert Database](https://example.com)
- Ethical brands database developed with assistance from [Sustainable Brands Initiative](https://example.com)

---

Made with ❤️ for the planet 🌎
