const fs = require('fs');
const path = require('path');

const directoryPaths = ['./app'];

const replacements = [
  // Base colors
  { regex: /bg-\[var\(--color-bg\)\]/g, replacement: 'bg-bg' },
  { regex: /bg-\[var\(--color-surface\)\]/g, replacement: 'bg-surface' },
  { regex: /text-\[var\(--color-primary-strong\)\]/g, replacement: 'text-primary-strong' },
  { regex: /text-\[var\(--color-primary\)\]/g, replacement: 'text-primary' },
  { regex: /text-\[var\(--color-muted\)\]/g, replacement: 'text-muted' },
  { regex: /text-\[var\(--color-text\)\]/g, replacement: 'text-text' },
  { regex: /border-\[var\(--color-border\)\]/g, replacement: 'border-border' },
  { regex: /bg-\[var\(--color-primary\)\]/g, replacement: 'bg-primary' },
  { regex: /bg-\[var\(--color-accent-soft\)\]/g, replacement: 'bg-accent-soft' },
  { regex: /hover:bg-\[var\(--color-accent-soft\)\]/g, replacement: 'hover:bg-accent-soft' },
  { regex: /hover:bg-\[var\(--color-primary-strong\)\]/g, replacement: 'hover:bg-primary-strong' },
  { regex: /focus:ring-\[var\(--color-accent\)\]/g, replacement: 'focus:ring-accent' },
  { regex: /focus-within:ring-\[var\(--color-accent\)\]/g, replacement: 'focus-within:ring-accent' },
  { regex: /border-\[var\(--color-accent\)\]/g, replacement: 'border-accent' },
  { regex: /divide-\[var\(--color-border\)\]/g, replacement: 'divide-border' },

  // Hardcoded hex colors
  { regex: /bg-\[#f1e8db\]/g, replacement: 'bg-cat-aftercare-bg' },
  { regex: /text-\[#7a5f3c\]/g, replacement: 'text-cat-aftercare-text' },

  // Hardcoded status colors
  // Red (Error)
  { regex: /text-red-500/g, replacement: 'text-error' },
  { regex: /text-red-600/g, replacement: 'text-error-strong' },
  { regex: /bg-red-100/g, replacement: 'bg-error-bg-strong' },
  { regex: /bg-red-50/g, replacement: 'bg-error-bg' },
  { regex: /border-red-200/g, replacement: 'border-error-border' },
  { regex: /hover:text-red-500/g, replacement: 'hover:text-error' },
  { regex: /hover:text-red-600/g, replacement: 'hover:text-error-strong' },

  // Green (Success)
  { regex: /text-green-500/g, replacement: 'text-success' },
  { regex: /text-green-600/g, replacement: 'text-success-strong' },
  { regex: /bg-green-100/g, replacement: 'bg-success-bg-strong' },
  { regex: /bg-green-50/g, replacement: 'bg-success-bg' },
  { regex: /border-green-200/g, replacement: 'border-success-border' },

  // Blue (Info)
  { regex: /text-blue-500/g, replacement: 'text-info' },
  { regex: /text-blue-600/g, replacement: 'text-info-strong' },
  { regex: /text-blue-700/g, replacement: 'text-info-text' },
  { regex: /bg-blue-100/g, replacement: 'bg-info-bg-strong' },
  { regex: /bg-blue-50/g, replacement: 'bg-info-bg' },
  { regex: /border-blue-200/g, replacement: 'border-info-border' },

  // Grays
  { regex: /text-gray-500/g, replacement: 'text-muted' },
  { regex: /text-gray-600/g, replacement: 'text-muted' },
  { regex: /text-gray-700/g, replacement: 'text-text' },
  { regex: /text-gray-800/g, replacement: 'text-text' },
  { regex: /border-gray-300/g, replacement: 'border-border' },
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walkDir(file));
    } else { 
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

let allFiles = [];
directoryPaths.forEach(dir => {
  allFiles = allFiles.concat(walkDir(dir));
});

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(({regex, replacement}) => {
    content = content.replace(regex, replacement);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
