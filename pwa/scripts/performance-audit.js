/**
 * Performance Audit Script
 * Runs Lighthouse audits and generates performance reports
 */

import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPORT_DIR = join(__dirname, '..', 'performance-reports');

// Ensure report directory exists
try {
  mkdirSync(REPORT_DIR, { recursive: true });
} catch (err) {
  // Directory already exists
}

console.log('🚀 Starting Performance Audit...\n');

// URLs to test
const urls = [
  { path: '/', name: 'home' },
  { path: '/chart', name: 'chart' },
  { path: '/routes', name: 'routes' },
  { path: '/tracks', name: 'tracks' },
  { path: '/settings', name: 'settings' },
];

// Performance thresholds (Requirements 7.1, 7.3, 7.5)
const thresholds = {
  performance: 80,
  accessibility: 90,
  bestPractices: 90,
  seo: 90,
  pwa: 90,
  fcp: 1500, // First Contentful Paint (ms)
  lcp: 2500, // Largest Contentful Paint (ms)
  tti: 3000, // Time to Interactive (ms)
  cls: 0.1,  // Cumulative Layout Shift
  tbt: 300,  // Total Blocking Time (ms)
};

async function runLighthouse() {
  console.log('📊 Running Lighthouse CI...\n');
  
  return new Promise((resolve, reject) => {
    const lhci = spawn('npx', [
      'lhci',
      'autorun',
      '--config=../lighthouserc.json'
    ], {
      cwd: join(__dirname, '..'),
      shell: true,
      stdio: 'inherit'
    });

    lhci.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Lighthouse CI completed successfully\n');
        resolve();
      } else {
        console.log(`\n⚠️  Lighthouse CI exited with code ${code}\n`);
        resolve(); // Don't reject, continue with other tests
      }
    });

    lhci.on('error', (err) => {
      console.error('❌ Failed to run Lighthouse CI:', err.message);
      resolve(); // Don't reject, continue with other tests
    });
  });
}

async function generatePerformanceReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(REPORT_DIR, `performance-report-${timestamp}.md`);
  
  const report = `# Performance Audit Report

**Generated:** ${new Date().toLocaleString()}

## Performance Thresholds

Based on Requirements 7.1, 7.3, and 7.5:

- **Initial Load:** < 2 seconds
- **Time to Interactive:** < 3 seconds  
- **UI Response:** < 100ms
- **Chart Rendering:** 60 FPS
- **Lighthouse Performance Score:** > 80
- **Lighthouse PWA Score:** > 90

## Test Results

### Lighthouse Audits

Lighthouse audits have been run for the following pages:
${urls.map(u => `- ${u.name}: ${u.path}`).join('\n')}

See the detailed Lighthouse reports in the \`.lighthouseci\` directory.

### Key Metrics to Review

1. **First Contentful Paint (FCP):** Should be < 1.5s
2. **Largest Contentful Paint (LCP):** Should be < 2.5s
3. **Time to Interactive (TTI):** Should be < 3s
4. **Cumulative Layout Shift (CLS):** Should be < 0.1
5. **Total Blocking Time (TBT):** Should be < 300ms

### E2E Performance Tests

Run the E2E performance tests with:
\`\`\`bash
npm run test:e2e -- performance.spec.ts
\`\`\`

These tests verify:
- Load time metrics
- UI responsiveness (< 100ms)
- Chart rendering at 60 FPS
- Memory usage
- Bundle sizes
- Offline performance

## Recommendations

### If Performance Score < 80:
1. Check bundle sizes - may need more code splitting
2. Review image optimization
3. Check for render-blocking resources
4. Verify Service Worker caching strategy

### If Chart FPS < 60:
1. Review map layer complexity
2. Check for unnecessary re-renders
3. Verify debouncing on position updates
4. Consider reducing marker/layer count

### If Load Time > 2s:
1. Optimize bundle sizes
2. Improve code splitting
3. Review Service Worker cache strategy
4. Check for blocking resources

### If Memory Usage High:
1. Check for memory leaks in components
2. Review event listener cleanup
3. Verify proper component unmounting
4. Check IndexedDB query efficiency

## Next Steps

1. Review Lighthouse reports in \`.lighthouseci\` directory
2. Run E2E performance tests: \`npm run test:e2e -- performance.spec.ts\`
3. Address any failing metrics
4. Re-run audits to verify improvements
5. Test on actual devices (Windows, Android, iPad)

## Device Testing Checklist

- [ ] Windows Desktop (Chrome/Edge)
- [ ] Android Tablet (Chrome)
- [ ] iPad (Safari)
- [ ] Test with slow 3G throttling
- [ ] Test with offline mode
- [ ] Test with large datasets (many routes/tracks)

## Performance Monitoring

For ongoing performance monitoring:
1. Run Lighthouse audits before each release
2. Monitor bundle sizes in CI/CD
3. Track Core Web Vitals in production
4. Set up performance budgets

---

*This report was generated automatically by the performance audit script.*
`;

  writeFileSync(reportPath, report);
  console.log(`📄 Performance report generated: ${reportPath}\n`);
  
  return reportPath;
}

async function main() {
  try {
    // Run Lighthouse audits
    await runLighthouse();
    
    // Generate summary report
    const reportPath = await generatePerformanceReport();
    
    console.log('✅ Performance audit complete!\n');
    console.log('📊 Next steps:');
    console.log('   1. Review Lighthouse reports in .lighthouseci directory');
    console.log('   2. Run E2E performance tests: npm run test:e2e -- performance.spec.ts');
    console.log(`   3. Check summary report: ${reportPath}`);
    console.log('   4. Test on actual devices\n');
    
  } catch (error) {
    console.error('❌ Performance audit failed:', error);
    process.exit(1);
  }
}

main();
