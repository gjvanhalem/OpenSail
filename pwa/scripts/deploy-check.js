#!/usr/bin/env node

/**
 * Pre-deployment checklist script
 * Verifies that the build is ready for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

console.log('🔍 Running pre-deployment checks...\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: Dist directory exists
console.log('✓ Checking dist directory...');
if (!fs.existsSync(distDir)) {
  console.error('❌ ERROR: dist/ directory not found. Run "npm run build" first.');
  hasErrors = true;
} else {
  console.log('  ✓ dist/ directory exists');
}

// Check 2: Essential files exist
console.log('\n✓ Checking essential files...');
const essentialFiles = [
  'index.html',
  'manifest.webmanifest',
  'sw.js'
];

essentialFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ ERROR: ${file} not found`);
    hasErrors = true;
  } else {
    console.log(`  ✓ ${file} exists`);
  }
});

// Check 3: PWA icons exist
console.log('\n✓ Checking PWA icons...');
const iconFiles = [
  'pwa-192x192.png',
  'pwa-512x512.png'
];

iconFiles.forEach(icon => {
  const iconPath = path.join(distDir, icon);
  if (!fs.existsSync(iconPath)) {
    console.error(`  ❌ ERROR: ${icon} not found`);
    hasErrors = true;
  } else {
    const stats = fs.statSync(iconPath);
    console.log(`  ✓ ${icon} exists (${(stats.size / 1024).toFixed(2)} KB)`);
  }
});

// Check 4: Assets directory
console.log('\n✓ Checking assets...');
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.error('  ❌ ERROR: assets/ directory not found');
  hasErrors = true;
} else {
  const files = fs.readdirSync(assetsDir);
  const jsFiles = files.filter(f => f.endsWith('.js'));
  const cssFiles = files.filter(f => f.endsWith('.css'));
  
  console.log(`  ✓ Found ${jsFiles.length} JavaScript bundles`);
  console.log(`  ✓ Found ${cssFiles.length} CSS files`);
  
  // Check bundle sizes
  let totalSize = 0;
  files.forEach(file => {
    const filePath = path.join(assetsDir, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
    
    // Warn if individual bundle is too large
    if (file.endsWith('.js') && stats.size > 500 * 1024) {
      console.warn(`  ⚠️  WARNING: ${file} is large (${(stats.size / 1024).toFixed(2)} KB)`);
      hasWarnings = true;
    }
  });
  
  console.log(`  ✓ Total assets size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  if (totalSize > 5 * 1024 * 1024) {
    console.warn('  ⚠️  WARNING: Total assets size exceeds 5MB');
    hasWarnings = true;
  }
}

// Check 5: Manifest validation
console.log('\n✓ Validating manifest...');
const manifestPath = path.join(distDir, 'manifest.webmanifest');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    requiredFields.forEach(field => {
      if (!manifest[field]) {
        console.error(`  ❌ ERROR: Manifest missing required field: ${field}`);
        hasErrors = true;
      } else {
        console.log(`  ✓ ${field}: ${typeof manifest[field] === 'object' ? 'defined' : manifest[field]}`);
      }
    });
    
    // Check icons
    if (manifest.icons && manifest.icons.length > 0) {
      console.log(`  ✓ ${manifest.icons.length} icons defined`);
      
      // Check for required sizes
      const sizes = manifest.icons.map(icon => icon.sizes);
      if (!sizes.includes('192x192')) {
        console.warn('  ⚠️  WARNING: No 192x192 icon defined');
        hasWarnings = true;
      }
      if (!sizes.includes('512x512')) {
        console.warn('  ⚠️  WARNING: No 512x512 icon defined');
        hasWarnings = true;
      }
    }
  } catch (error) {
    console.error(`  ❌ ERROR: Invalid manifest JSON: ${error.message}`);
    hasErrors = true;
  }
}

// Check 6: Service Worker validation
console.log('\n✓ Validating Service Worker...');
const swPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  const swSize = fs.statSync(swPath).size;
  
  console.log(`  ✓ Service Worker size: ${(swSize / 1024).toFixed(2)} KB`);
  
  // Check for Workbox
  if (swContent.includes('workbox')) {
    console.log('  ✓ Workbox detected');
  } else {
    console.warn('  ⚠️  WARNING: Workbox not detected in Service Worker');
    hasWarnings = true;
  }
  
  // Check for precache manifest
  if (swContent.includes('precacheAndRoute') || swContent.includes('precache')) {
    console.log('  ✓ Precache configuration found');
  } else {
    console.warn('  ⚠️  WARNING: No precache configuration found');
    hasWarnings = true;
  }
}

// Check 7: Environment variables
console.log('\n✓ Checking environment configuration...');
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Check for placeholder tokens (indicates missing env vars)
  if (indexContent.includes('undefined') ||
      indexContent.includes('VITE_')) {
    console.warn('  ⚠️  WARNING: Possible missing environment variables detected');
    console.warn('     Make sure the optional VITE_ variables are set before building');
    hasWarnings = true;
  } else {
    console.log('  ✓ No placeholder tokens detected');
  }
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('\n❌ DEPLOYMENT CHECK FAILED');
  console.error('Please fix the errors above before deploying.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️  DEPLOYMENT CHECK PASSED WITH WARNINGS');
  console.warn('Review the warnings above. Deployment may proceed.\n');
  process.exit(0);
} else {
  console.log('\n✅ DEPLOYMENT CHECK PASSED');
  console.log('Build is ready for deployment!\n');
  process.exit(0);
}
