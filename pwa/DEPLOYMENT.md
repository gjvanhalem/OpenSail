# Deployment Guide

This guide covers deploying the OpenSail PWA to production hosting platforms.

## Prerequisites

- Node.js 20+ installed
- Git repository with the PWA code
- Mapbox API token (get from https://account.mapbox.com/access-tokens/)

## Environment Variables

The following environment variables must be configured in your hosting platform:

### Required
- `VITE_MAPBOX_TOKEN`: Your Mapbox API access token

### Optional
- `VITE_API_ENDPOINT`: Backend API endpoint (if using external API)
- `VITE_ENVIRONMENT`: Environment identifier (defaults to production)

## Deployment Options

### Option 1: Netlify (Recommended)

Netlify provides automatic HTTPS, global CDN, and continuous deployment.

#### Setup Steps

1. **Create Netlify Account**
   - Go to https://app.netlify.com/signup
   - Sign up with GitHub, GitLab, or Bitbucket

2. **Connect Repository**
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider
   - Select your repository

3. **Configure Build Settings**
   - Base directory: `pwa`
   - Build command: `npm run build`
   - Publish directory: `pwa/dist`
   - The `netlify.toml` file will automatically configure the rest

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add `VITE_MAPBOX_TOKEN` with your Mapbox token
   - Add any other optional variables

5. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy automatically
   - Future commits will trigger automatic deployments

#### Netlify CLI Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site (first time only)
cd pwa
netlify init

# Deploy to production
netlify deploy --prod
```

#### Custom Domain

1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS records as instructed
4. HTTPS is automatically provisioned

### Option 2: Vercel

Vercel offers edge network deployment with automatic HTTPS.

#### Setup Steps

1. **Create Vercel Account**
   - Go to https://vercel.com/signup
   - Sign up with GitHub, GitLab, or Bitbucket

2. **Import Project**
   - Click "Add New" → "Project"
   - Import your Git repository
   - Select the repository

3. **Configure Project**
   - Framework Preset: Vite
   - Root Directory: `pwa`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - The `vercel.json` file will configure the rest

4. **Set Environment Variables**
   - Add `VITE_MAPBOX_TOKEN` with your Mapbox token
   - Add any other optional variables

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy automatically
   - Future commits trigger automatic deployments

#### Vercel CLI Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd pwa
vercel --prod
```

### Option 3: GitHub Pages

Free hosting for open-source projects.

#### Setup Steps

1. **Configure Repository**
   - Go to repository Settings → Pages
   - Source: GitHub Actions

2. **Create GitHub Actions Workflow**
   - Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: pwa/package-lock.json
      
      - name: Install dependencies
        run: |
          cd pwa
          npm ci
      
      - name: Build
        env:
          VITE_MAPBOX_TOKEN: ${{ secrets.VITE_MAPBOX_TOKEN }}
        run: |
          cd pwa
          npm run build
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: pwa/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

3. **Add Secrets**
   - Go to repository Settings → Secrets and variables → Actions
   - Add `VITE_MAPBOX_TOKEN` secret

4. **Deploy**
   - Push to main branch
   - GitHub Actions will build and deploy automatically

### Option 4: Cloudflare Pages

Fast global CDN with automatic HTTPS.

#### Setup Steps

1. **Create Cloudflare Account**
   - Go to https://dash.cloudflare.com/sign-up
   - Sign up for Cloudflare Pages

2. **Create Project**
   - Go to Workers & Pages → Create application → Pages
   - Connect to Git
   - Select your repository

3. **Configure Build**
   - Framework preset: None
   - Build command: `cd pwa && npm run build`
   - Build output directory: `pwa/dist`
   - Root directory: `/`

4. **Set Environment Variables**
   - Add `VITE_MAPBOX_TOKEN` with your Mapbox token
   - Add `NODE_VERSION` = `20`

5. **Deploy**
   - Click "Save and Deploy"
   - Future commits trigger automatic deployments

## Build Process

### Local Production Build

Test the production build locally before deploying:

```bash
cd pwa

# Install dependencies
npm install

# Create .env file with your Mapbox token
echo "VITE_MAPBOX_TOKEN=your_token_here" > .env

# Build for production
npm run build

# Preview production build
npm run preview
```

The build output will be in `pwa/dist/`.

### Build Optimization

The build process includes:
- TypeScript compilation with type checking
- Code minification and tree shaking
- Asset optimization (images, fonts)
- Code splitting for lazy loading
- Source map generation
- Service Worker generation with Workbox
- PWA manifest generation

### Build Verification

After building, verify:
- [ ] `dist/index.html` exists
- [ ] `dist/assets/` contains JS and CSS bundles
- [ ] `dist/sw.js` Service Worker exists
- [ ] `dist/manifest.webmanifest` exists
- [ ] `dist/pwa-*.png` icons exist

## Post-Deployment Verification

### 1. HTTPS Check
- Verify site loads over HTTPS
- Check for mixed content warnings
- Ensure all resources load securely

### 2. PWA Installation
- Open site in Chrome/Edge
- Check for install prompt in address bar
- Install PWA and verify standalone mode
- Test on mobile devices

### 3. Service Worker
- Open DevTools → Application → Service Workers
- Verify Service Worker is registered and active
- Check cache storage for cached assets

### 4. Offline Functionality
- Load the site
- Turn off network in DevTools
- Refresh page - should load from cache
- Navigate between routes - should work offline

### 5. Performance
- Run Lighthouse audit (DevTools → Lighthouse)
- Target scores:
  - Performance: > 80
  - Accessibility: > 90
  - Best Practices: > 90
  - SEO: > 90
  - PWA: > 90

### 6. Browser Compatibility
- Test in Chrome/Edge (full features)
- Test in Safari (core features)
- Test in Firefox (core features)
- Verify feature detection warnings

### 7. Device Testing
- Test on Windows desktop
- Test on Android tablet
- Test on iPad
- Verify responsive layout

## Monitoring and Updates

### Automatic Updates

The PWA uses `autoUpdate` strategy:
- Service Worker checks for updates on page load
- New version downloads in background
- User sees update notification
- Page reloads to apply update

### Manual Update Trigger

Users can manually check for updates:
- Settings → Check for Updates
- Or reload page with Ctrl+Shift+R (hard refresh)

### Rollback

If deployment has issues:

**Netlify:**
```bash
netlify rollback
```

**Vercel:**
- Go to Deployments
- Find previous working deployment
- Click "Promote to Production"

**GitHub Pages:**
- Revert the commit
- Push to trigger new deployment

## Troubleshooting

### Build Fails

**Issue:** TypeScript errors
```bash
# Check for type errors
cd pwa
npm run build
```
**Solution:** Fix TypeScript errors before deploying

**Issue:** Missing environment variables
```bash
# Verify .env file exists locally
cat .env
```
**Solution:** Add `VITE_MAPBOX_TOKEN` to hosting platform

### Service Worker Not Registering

**Issue:** Service Worker fails to register
**Solution:** 
- Verify HTTPS is enabled
- Check browser console for errors
- Ensure `sw.js` is accessible at root

### PWA Not Installable

**Issue:** Install prompt doesn't appear
**Solution:**
- Verify manifest.webmanifest is valid
- Check all required icons exist
- Ensure HTTPS is enabled
- Test in Chrome/Edge (best PWA support)

### Offline Mode Not Working

**Issue:** App doesn't work offline
**Solution:**
- Check Service Worker is active
- Verify cache storage in DevTools
- Test with DevTools offline mode
- Check Workbox configuration

### Map Not Loading

**Issue:** Mapbox map doesn't display
**Solution:**
- Verify `VITE_MAPBOX_TOKEN` is set correctly
- Check browser console for API errors
- Verify CSP headers allow Mapbox domains
- Test token at https://account.mapbox.com/

## Performance Optimization

### CDN Configuration

Both Netlify and Vercel provide global CDN automatically. For optimal performance:

1. **Enable Compression**
   - Gzip/Brotli enabled by default
   - Verify in Network tab (Content-Encoding header)

2. **Cache Headers**
   - Static assets cached for 1 year
   - HTML cached with revalidation
   - Service Worker cached with no-cache

3. **Image Optimization**
   - Use WebP format where possible
   - Compress PNG icons
   - Lazy load images

### Bundle Size Optimization

Monitor bundle sizes:
```bash
cd pwa
npm run build

# Check bundle sizes in output
# Target: < 500KB initial bundle
```

Optimize if needed:
- Review `vite.config.ts` manual chunks
- Lazy load heavy components
- Remove unused dependencies

## Security

### HTTPS

All hosting platforms provide automatic HTTPS. Verify:
- Certificate is valid
- No mixed content warnings
- HSTS header is set

### Content Security Policy

CSP headers are configured in `netlify.toml` and `vercel.json`:
- Restricts script sources
- Allows Mapbox domains
- Prevents XSS attacks

### Permissions Policy

Configured to allow:
- Geolocation (for GPS)
- USB (for serial instruments)
- Bluetooth (for Bluetooth instruments)

## Cost Considerations

### Netlify
- **Free Tier:** 100GB bandwidth/month, 300 build minutes/month
- **Pro Tier:** $19/month for more bandwidth and builds
- Sufficient for most use cases

### Vercel
- **Hobby Tier:** Free for personal projects
- **Pro Tier:** $20/month for commercial use
- Generous free tier limits

### GitHub Pages
- **Free:** Unlimited for public repositories
- 1GB storage limit
- 100GB bandwidth/month soft limit

### Cloudflare Pages
- **Free Tier:** Unlimited bandwidth, 500 builds/month
- Very generous free tier

## Recommended Setup

For production deployment:

1. **Primary:** Netlify or Vercel
   - Automatic HTTPS
   - Global CDN
   - Easy setup
   - Good free tier

2. **Backup:** GitHub Pages
   - Free for open source
   - Good for redundancy

3. **Custom Domain:** Optional but recommended
   - Professional appearance
   - Better for sharing
   - Easier to remember

## Next Steps

After deployment:
1. Test thoroughly on all target devices
2. Run Lighthouse audits
3. Monitor performance metrics
4. Set up error tracking (optional)
5. Share with users!
