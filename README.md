# Quote Capture Tool

A tool for capturing insurance quote data with FCA API integration for company lookups.

## Components

### 1. Quote Capture Tool
Frontend interface for entering and managing quote data from competitors.

### 2. FCA API Proxy
Backend service that interfaces with the FCA Financial Services Register API to retrieve UK insurance company data.

## Features
- Insurance company autocomplete with intelligent caching
- Direct integration with FCA API
- Local file-based cache to minimize API calls
- Clean, modern UI for quote data entry

## Setup
1. Install dependencies: `npm install`
2. Create `.env` file in the fca-api-proxy directory with:
   ```
   FCA_API_USERNAME=your_fca_email@example.com
   FCA_API_KEY=your_fca_api_key
   PORT=3000
   ```
3. Start API proxy: `node fca-api-proxy/server.js`
4. Start frontend server: `npx serve quote-capture-tool`
