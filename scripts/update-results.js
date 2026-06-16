// Minimal updater: refreshes generatedAt and preserves the current data shape.
// Replace or extend this script with your chosen scores API when ready.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'results.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.generatedAt = new Date().toISOString();
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log('Updated generatedAt:', data.generatedAt);
