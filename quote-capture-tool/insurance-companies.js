// Insurance Companies Data Manager
// This file manages the fetching and caching of insurance company data

/**
 * Configuration for the insurance companies service
 */
const CONFIG = {
    // API key for FCA Financial Services Register
    API_KEY: '6af0a792ac59ac2c423a943781af0729',
    // Base URL for our proxy server
    API_BASE_URL: 'http://localhost:3000',
    // API endpoints - matching server.js configuration
    API_ENDPOINT: 'http://localhost:3000/api/insurance-companies',
    API_SEARCH_ENDPOINT: 'http://localhost:3000/api/insurance-companies/search',
    // Cache settings
    CACHE_KEY: 'insurance_companies_cache',
    CACHE_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    CACHE_TIMESTAMP_KEY: 'insurance_companies_timestamp',
    // Fallback list of major UK insurance companies in case API is unavailable
    FALLBACK_COMPANIES: [
        "Admiral", "Ageas", "Aioi Nissay Dowa Insurance", "Allianz", "Aviva", 
        "AXA", "Churchill", "Covéa Insurance", "Direct Line", "Esure", 
        "First Central", "Hastings Direct", "Highway Insurance", "Liverpool Victoria (LV=)", 
        "Markerstudy", "More Than", "NFU Mutual", "Privilege", "RAC", 
        "RSA Insurance Group", "Saga", "Sabre Insurance", "Sheila's Wheels", 
        "Tesco Bank", "The AA", "The Co-operative Insurance", "Ticker", "Zurich"
    ]
};

/**
 * InsuranceCompaniesService - Manages the list of insurance companies
 */
class InsuranceCompaniesService {
    constructor() {
        this.companies = [];
        this.initialized = false;
    }

    /**
     * Initialize the service
     */
    async init() {
        if (this.initialized) {
            return;
        }

        await this.loadCompanies();
        this.initialized = true;
    }

    /**
     * Load companies from cache or API
     */
    async loadCompanies() {
        try {
            // Try to load from cache first
            if (await this.loadFromCache()) {
                console.log('Loaded insurance companies from cache');
                return;
            }

            // If not in cache or cache is expired, fetch fresh data
            await this.fetchInsuranceCompanies();
        } catch (error) {
            console.error('Error loading companies:', error);
            // Fallback to default list
            this.companies = CONFIG.FALLBACK_COMPANIES;
        }
    }

    /**
     * Load insurance companies from cache
     * @returns {boolean} True if loaded from cache successfully
     */
    async loadFromCache() {
        try {
            const cachedData = localStorage.getItem(CONFIG.CACHE_KEY);
            const timestamp = localStorage.getItem(CONFIG.CACHE_TIMESTAMP_KEY);

            if (!cachedData || !timestamp) {
                return false;
            }

            // Check if cache is expired
            const cacheAge = Date.now() - parseInt(timestamp);
            if (cacheAge > CONFIG.CACHE_DURATION) {
                return false;
            }

            this.companies = JSON.parse(cachedData);
            
            // If cache is more than 80% through its lifetime, refresh in background
            if (cacheAge > CONFIG.CACHE_DURATION * 0.8) {
                this.fetchInsuranceCompanies().catch(error => {
                    console.error('Background cache refresh failed:', error);
                });
            }
            
            return true;
        } catch (error) {
            console.error('Error checking cache freshness:', error);
            return false;
        }
    }

    /**
     * Save companies to cache
     */
    saveToCache(companies) {
        try {
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(companies));
            localStorage.setItem(CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    }

    /**
     * Fetch insurance companies from the FCA API proxy server
     * with fallback to local data if the API is unavailable
     */
    async fetchInsuranceCompanies() {
        try {
            console.log('Fetching insurance companies from FCA API proxy...');
            
            // Make a request to our proxy server
            const response = await fetch(CONFIG.API_ENDPOINT);
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Extract just the names and sort them
            this.companies = data.map(company => company.name)
                .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            
            console.log(`Loaded ${this.companies.length} insurance companies from FCA API`);
            
            // Save to cache
            this.saveToCache(this.companies);
            
            return this.companies;
        } catch (error) {
            console.error('Error fetching from FCA API proxy:', error);
            console.log('Falling back to local data sources...');
            
            // Fall back to our simulated data sources if API fails
            const fcaSourceData = await this.simulateApiFetch('fca');
            const abiSourceData = await this.simulateApiFetch('abi');
            const mibSourceData = await this.simulateApiFetch('mib');
            const brokerSourceData = await this.simulateApiFetch('brokers');
            
            // Combine all sources and deduplicate
            let allCompanies = [
                ...CONFIG.FALLBACK_COMPANIES,
                ...fcaSourceData,
                ...abiSourceData,
                ...mibSourceData,
                ...brokerSourceData
            ];
            
            // Deduplicate and sort
            this.companies = [...new Set(allCompanies)].sort((a, b) => 
                a.toLowerCase().localeCompare(b.toLowerCase())
            );
            
            console.log(`Loaded ${this.companies.length} insurance companies from local sources`);
            
            // Save to cache
            this.saveToCache(this.companies);
            
            return this.companies;
        }
    }

    /**
     * Simulate API fetch from different data sources
     * In a real implementation, these would be actual API calls
     * @param {string} source - The data source to fetch from
     */
    async simulateApiFetch(source) {
        // In a real implementation, this would make API calls to different data sources
        // This is just for demonstration purposes
        const delay = Math.random() * 500 + 300; // Random delay between 300-800ms
        
        return new Promise(resolve => {
            setTimeout(() => {
                switch(source) {
                    case 'fca':
                        // Financial Conduct Authority data
                        resolve([
                            "AA Insurance Services", "ABC Insurance", "Abacus Insurance", "Abbey Insurance",
                            "Admiral Insurance", "Adrian Flux Insurance Services", "Advantage Insurance",
                            "Age Co Insurance", "Ageas Insurance", "AIG Insurance", "Allianz Insurance",
                            "Animal Friends Insurance", "Ansvar Insurance", "Aon Insurance", "Arch Insurance",
                            "Asda Insurance", "Aspen Insurance", "Assurant Insurance", "Autonet Insurance",
                            "Aviva Insurance", "AXA Insurance", "Axis Insurance", "Bankstone Insurance"
                        ]);
                        break;
                    case 'abi':
                        // Association of British Insurers data
                        resolve([
                            "Be Wiser Insurance", "Bell Insurance", "Berkeley Insurance", "Bewiser Insurance",
                            "BGL Insurance", "Bikesure Insurance", "Binomial Insurance", "Birmingham Midshires Insurance",
                            "Bluefin Insurance", "BMI Insurance", "Brightside Insurance", "British Insurance",
                            "Budget Insurance", "By Miles Insurance", "Canopius Insurance", "Carole Nash Insurance",
                            "Carrot Insurance", "Castle Cover Insurance", "Caunce O'Hara Insurance", "CFC Insurance",
                            "Chartered Insurance", "Chubb Insurance", "Churchill Insurance", "CIS Insurance"
                        ]);
                        break;
                    case 'mib':
                        // Motor Insurers Bureau data
                        resolve([
                            "Co-operative Insurance", "Columbus Insurance", "Cornhill Insurance", "Covea Insurance",
                            "Covéa Insurance", "Debenhams Insurance", "Diamond Insurance", "Direct Insurance",
                            "Direct Line Insurance", "EBike Insurance", "Ecclesiastical Insurance", "Endsleigh Insurance",
                            "Equity Insurance", "Esure Insurance", "EUI Insurance", "Everest Insurance",
                            "Excess Direct Insurance", "First Central Insurance", "First Directory Insurance",
                            "Fish Insurance", "Footman James Insurance", "General Accident Insurance", "Go Skippy Insurance",
                            "Groupama Insurance", "Guardian Insurance", "Halifax Insurance", "Hastings Insurance"
                        ]);
                        break;
                    case 'brokers':
                        // Insurance broker listings
                        resolve([
                            "Hedgehog Insurance", "Hiscox Insurance", "Ingenie Insurance", "Insure & Go Insurance",
                            "Insure Pink Insurance", "Insure The Box Insurance", "John Lewis Insurance", "Kwik Fit Insurance",
                            "L&G Insurance", "Legal & General Insurance", "Liverpool Victoria Insurance", "Lloyds Bank Insurance",
                            "LV Insurance", "Marmalade Insurance", "M&S Insurance", "MCE Insurance", "More Than Insurance",
                            "Motorcycle Direct Insurance", "Mulsanne Insurance", "Nationwide Insurance", "NFU Mutual Insurance",
                            "Ocaso Insurance", "One Call Insurance", "Performance Direct Insurance", "Petplan Insurance",
                            "Plantec Assist Insurance", "Post Office Insurance", "Privilege Insurance", "Provident Insurance"
                        ]);
                        break;
                    default:
                        resolve([]);
                }
            }, delay);
        });
    }

    /**
     * Search for insurance companies matching a query
     * Uses our new FCA API proxy with intelligent caching
     */
    async search(query, limit = 5) {
        console.log('Search method called with query:', query);
        
        // Return empty array for empty queries
        if (!query || query.trim().length === 0) {
            return [];
        }
        
        // Trim and prepare the query
        query = query.trim();
        console.log(`Searching for insurance company: ${query}`);
        
        try {
            // Try to initialize if not already done
            if (!this.initialized) {
                await this.init();
            }
            
            // Make the API request
            const response = await fetch(`${CONFIG.API_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`);
            
            if (!response.ok) {
                throw new Error(`Search failed with status: ${response.status}`);
            }
            
            // Parse results
            const results = await response.json();
            console.log(`Found ${results.length} matches for "${query}" via API`);
            
            // Return just the company names, limited to requested amount
            if (results.length > 0) {
                return results.map(item => item.name).slice(0, limit);
            }
        } catch (error) {
            console.warn('API search failed:', error.message);
        }
        
        // Fall back to client-side search as a last resort
        console.log('Falling back to client-side search');
        return this.clientSideSearch(query, limit);
    }
    
    /**
     * Client-side advanced fuzzy search implementation
     * Used as fallback when the API is unavailable
     */
    clientSideSearch(query, limit = 5) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        
        query = query.toLowerCase().trim();
        
        // Prepare company names for search
        const companySearchData = this.companies.map(company => ({
            name: company,
            lowerName: company.toLowerCase(),
            words: company.toLowerCase().split(/\s+/) // Split into words for partial matching
        }));
        
        // Calculate match scores for each company
        const scoredMatches = companySearchData.map(company => {
            let score = 0;
            const { lowerName, words } = company;
            
            // Exact match scores highest
            if (lowerName === query) {
                score += 100;
            }
            // Starting with query is very good
            else if (lowerName.startsWith(query)) {
                score += 80;
            }
            // Contains query as a substring
            else if (lowerName.includes(query)) {
                score += 60;
                // Bonus for matching at word boundary
                if (lowerName.includes(' ' + query) || lowerName.startsWith(query)) {
                    score += 15;
                }
            }
            
            // Check for partial word matches
            for (const word of words) {
                if (word === query) {
                    score += 50; // Exact word match
                } else if (word.startsWith(query)) {
                    score += 40; // Word starts with query
                } else if (query.length > 3 && word.includes(query)) {
                    score += 30; // Word contains query (for longer queries)
                }
            }
            
            // Check for acronym match (e.g. "LV" for "Liverpool Victoria")
            const possibleAcronym = words.map(word => word[0]).join('');
            if (possibleAcronym.includes(query)) {
                score += 45;
            }
            
            // Check for typos and misspellings using Levenshtein distance
            const levenshteinScore = this.levenshteinSimilarity(query, lowerName);
            if (levenshteinScore > 0.7) { // High similarity
                score += Math.round(levenshteinScore * 40);
            }
            
            return { company: company.name, score };
        });
        
        // Filter out low scores and sort by highest score
        const matches = scoredMatches
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.company)
            .slice(0, limit);
            
        return matches;
    }
    
    /**
     * Calculate Levenshtein similarity between two strings
     * Returns a value between 0 and 1, where 1 means identical
     */
    levenshteinSimilarity(s1, s2) {
        // If either string is empty, similarity is 0
        if (!s1.length || !s2.length) return 0;
        
        // If strings are identical, similarity is 1
        if (s1 === s2) return 1;
        
        // Calculate Levenshtein distance
        const track = Array(s2.length + 1).fill(null).map(() => 
            Array(s1.length + 1).fill(null));
        
        for (let i = 0; i <= s1.length; i += 1) {
            track[0][i] = i;
        }
        
        for (let j = 0; j <= s2.length; j += 1) {
            track[j][0] = j;
        }
        
        for (let j = 1; j <= s2.length; j += 1) {
            for (let i = 1; i <= s1.length; i += 1) {
                const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, // Deletion
                    track[j - 1][i] + 1, // Insertion
                    track[j - 1][i - 1] + cost // Substitution
                );
            }
        }
        
        const distance = track[s2.length][s1.length];
        const maxLength = Math.max(s1.length, s2.length);
        
        // Convert distance to similarity score (0-1)
        return 1 - (distance / maxLength);
    }
}

// Create and expose singleton instance on window object
const insuranceCompaniesService = new InsuranceCompaniesService();
// Expose the service globally for the script.js to access
window.InsuranceCompaniesService = insuranceCompaniesService;

// Initialize the service immediately when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing insurance service');
    window.InsuranceCompaniesService.init().then(() => {
        console.log('Insurance service initialized successfully');
    }).catch(error => {
        console.error('Failed to initialize insurance service:', error);
    });
});
