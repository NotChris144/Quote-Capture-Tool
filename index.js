// This is a redirect file for Render.com deployment
// It points to the actual server.js file in the fca-api-proxy directory
console.log('Starting Quote Capture Tool API...');
console.log('Redirecting to fca-api-proxy/server.js');

// Simply require the actual server file
require('./fca-api-proxy/server.js');
