// Instructions:
// 1. Once your API is deployed to Render, replace YOUR_RENDER_API_URL below
// 2. Run this script with: node update-api-config.js
// 3. This will update your insurance-companies.js file with the correct URLs

const fs = require('fs');
const path = require('path');

// ============= EDIT THIS VALUE =============
const RENDER_API_URL = 'https://YOUR_RENDER_API_URL.onrender.com';
// ==========================================

const insuranceCompaniesJsPath = path.join(__dirname, 'insurance-companies.js');

try {
  // Read the current file
  let content = fs.readFileSync(insuranceCompaniesJsPath, 'utf8');
  
  // Replace all localhost URLs with Render URL
  content = content.replace(/http:\/\/localhost:3000/g, RENDER_API_URL);
  
  // Write the updated content back
  fs.writeFileSync(insuranceCompaniesJsPath, content, 'utf8');
  
  console.log('✅ Successfully updated insurance-companies.js with Render API URL!');
} catch (error) {
  console.error('❌ Error updating file:', error.message);
}
