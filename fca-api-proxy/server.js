require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from the current directory

// Filesystem for cache operations
const fs = require('fs');
const path = require('path');

// Cache configuration
const CACHE_FILE = path.join(__dirname, 'company-cache.json');
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Cache management functions
const cacheManager = {
  data: {
    cachedCompanies: [],
    lastUpdated: 0
  },
  
  // Load the cache from file
  load() {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const fileContent = fs.readFileSync(CACHE_FILE, 'utf8');
        this.data = JSON.parse(fileContent);
        console.log(`Loaded ${this.data.cachedCompanies.length} companies from cache`);
      }
    } catch (error) {
      console.error('Error loading cache:', error.message);
    }
    return this.data;
  },
  
  // Save the cache to file
  save() {
    try {
      this.data.lastUpdated = Date.now();
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.data, null, 2));
      console.log(`Saved ${this.data.cachedCompanies.length} companies to cache`);
    } catch (error) {
      console.error('Error saving cache:', error.message);
    }
  },
  
  // Check if cache is valid
  isValid() {
    return this.data.cachedCompanies.length > 0 && 
           (Date.now() - this.data.lastUpdated) < CACHE_DURATION;
  },
  
  // Search the cache for matching companies
  search(query) {
    query = query.toLowerCase();
    return this.data.cachedCompanies.filter(company => {
      const name = company.name.toLowerCase();
      return name.includes(query) || 
             name.split(' ').some(word => word.startsWith(query));
    });
  },
  
  // Add companies to cache (avoiding duplicates)
  addCompanies(companies) {
    // Track existing companies by name to avoid duplicates
    const existingNames = new Set(this.data.cachedCompanies.map(c => c.name));
    
    // Add only new companies
    let newCount = 0;
    for (const company of companies) {
      if (!existingNames.has(company.name)) {
        this.data.cachedCompanies.push(company);
        existingNames.add(company.name);
        newCount++;
      }
    }
    
    if (newCount > 0) {
      console.log(`Added ${newCount} new companies to cache`);
      this.save();
    }
  }
};

// Initialize cache
cacheManager.load();

// FCA API configuration
const FCA_API_CONFIG = {
  baseURL: 'https://register.fca.org.uk/services',
  headers: {
    'x-auth-email': process.env.FCA_API_USERNAME,
    'x-auth-key': process.env.FCA_API_KEY,
    'Content-Type': 'application/json'
  }
};

// Endpoint to get insurance companies with caching
app.get('/api/insurance-companies', async (req, res) => {
  try {
    // Check if we have valid cached data first
    if (cacheManager.isValid()) {
      console.log('Using cached insurance companies data');
      return res.json(cacheManager.data.cachedCompanies);
    }
    
    console.log('Cache invalid or empty, fetching from FCA API...');

    // Make the authenticated request to FCA API
    const response = await axios({
      method: 'GET',
      url: `${FCA_API_CONFIG.baseURL}/V0.1/Search`,
      params: {
        q: 'Insurance', // Search for insurance firms
        type: 'firm',
        per_page: 100
      },
      headers: FCA_API_CONFIG.headers
    });

    // Extract company names from the response based on FCA API format
    // Format documented as returning { Data: [ {Name, "Reference Number", Status}, ... ] }
    let companies = [];
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      companies = response.data.Data.map(item => ({
        name: item.Name,
        reference: item["Reference Number"] || '',
        status: item.Status || 'Unknown'
      }));
      console.log(`Retrieved ${companies.length} companies from FCA API`);
      
      // Update cache with new data
      cacheManager.addCompanies(companies);
    } else {
      console.warn('Unexpected API response format:', JSON.stringify(response.data).substring(0, 200) + '...');
    }

    // Return the fetched companies
    res.json(companies);
  } catch (error) {
    console.error('Error fetching insurance companies:', error.message);
    
    // Detailed error logging to help debugging
    if (error.response) {
      // The request was made and the server responded with a status code outside of 2xx range
      console.error('Response error details:');
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers));
      console.error('Data:', JSON.stringify(error.response.data).substring(0, 500));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from API');
    } else {
      // Something happened in setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    // No fallback - we want to see the actual error
    res.status(500).json({
      error: 'Failed to fetch insurance companies from FCA API',
      message: error.message,
      details: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response details available'
    });
  }
});

// Search endpoint with intelligent caching
app.get('/api/insurance-companies/search', async (req, res) => {
  const query = req.query.q || '';
  
  if (!query) {
    return res.json([]);
  }
  
  // First try to find matches in cache
  const cacheResults = cacheManager.search(query);
  
  // If we have good results from cache, return them
  if (cacheResults.length > 0) {
    console.log(`Found ${cacheResults.length} matches for "${query}" in cache`);
    return res.json(cacheResults.slice(0, 10)); // Limit to 10 results
  }
  
  try {
    // Nothing in cache, search via API
    console.log(`Searching FCA API for: "${query}"`);
    
    // Make API call for search
    const response = await axios({
      method: 'GET',
      url: `${FCA_API_CONFIG.baseURL}/V0.1/Search`,
      params: {
        q: query, // Use the exact query from the user
        type: 'firm',
        per_page: 20 // Increased to get more results
      },
      headers: FCA_API_CONFIG.headers
    });
    
    // Log the response for debugging
    console.log(`FCA API response status: ${response.status}`);
    
    // Parse results from API response
    let results = [];
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      results = response.data.Data.map(item => ({
        name: item.Name,
        reference: item["Reference Number"] || '',
        status: item.Status || 'Unknown'
      }));
      console.log(`Found ${results.length} companies matching "${query}"`);
      
      // Add any new results to our cache for future use
      if (results.length > 0) {
        cacheManager.addCompanies(results);
      }
    } else {
      console.warn('Unexpected API response format for search:', 
                  JSON.stringify(response.data).substring(0, 200) + '...');
    }
    
    res.json(results);
  } catch (error) {
    console.error(`Error searching for "${query}":`, error.message);
    
    // Detailed error logging to help debugging
    if (error.response) {
      console.error('Response error details:');
      console.error('Status:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers));
      console.error('Data:', JSON.stringify(error.response.data).substring(0, 500));
    }
    
    // Return the error to the client
    res.status(500).json({
      error: 'Failed to search for insurance companies',
      message: error.message,
      details: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response details available'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`FCA API proxy server running on port ${PORT}`);
});
