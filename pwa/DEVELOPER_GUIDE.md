# OpenSail Developer Guide

This guide provides comprehensive information for developers who want to contribute to OpenSail or understand its architecture.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [Key Technologies](#key-technologies)
5. [Development Workflow](#development-workflow)
6. [Testing](#testing)
7. [Build and Deployment](#build-and-deployment)
8. [Contributing](#contributing)

---

## Development Setup

### Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher (comes with Node.js)
- **Git**: For version control
- **Modern Browser**: Chrome/Edge recommended for development

### Initial Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/opensail.git
   cd opensail/pwa
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your configuration:
   ```
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   VITE_API_ENDPOINT=http://localhost:3000
   VITE_ENVIRONMENT=development
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

### Development Tools

- **VS Code**: Recommended IDE with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - Vite

- **Browser DevTools**:
  - Chrome DevTools for debugging
  - Redux DevTools extension for state inspection
  - Lighthouse for PWA audits

---

## Project Structure

```
pwa/
├── public/                 # Static assets
│   ├── manifest.json      # PWA manifest
│   ├── icons/             # App icons (various sizes)
│   └── offline.html       # Offline fallback page
│
├── src/
│   ├── components/        # React components
│   │   ├── chart/        # Map and chart components
│   │   │   ├── ChartView.tsx
│   │   │   ├── VesselMarker.tsx
│   │   │   ├── RouteLayer.tsx
│   │   │   ├── TrackLayer.tsx
│   │   │   └── AISLayer.tsx
│   │   │
│   │   ├── instruments/  # Instrument display components
│   │   │   ├── InstrumentPanel.tsx
│   │   │   ├── SpeedGauge.tsx
│   │   │   ├── DepthGauge.tsx
│   │   │   ├── WindGauge.tsx
│   │   │   └── HeadingCompass.tsx
│   │   │
│   │   ├── routes/       # Route planning components
│   │   │   ├── RoutePlanner.tsx
│   │   │   ├── RouteList.tsx
│   │   │   ├── WaypointEditor.tsx
│   │   │   └── RouteDetails.tsx
│   │   │
│   │   ├── tracks/       # Track recording components
│   │   │   ├── TrackRecorder.tsx
│   │   │   ├── TrackList.tsx
│   │   │   └── TrackDetails.tsx
│   │   │
│   │   └── ui/           # Shared UI components
│   │       ├── Layout.tsx
│   │       ├── Navigation.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       └── Toast.tsx
│   │
│   ├── services/         # Business logic services
│   │   ├── storage/      # IndexedDB repositories
│   │   │   ├── database.ts
│   │   │   ├── RouteRepository.ts
│   │   │   ├── WaypointRepository.ts
│   │   │   ├── TrackRepository.ts
│   │   │   ├── AISRepository.ts
│   │   │   ├── LogbookRepository.ts
│   │   │   └── TileCache.ts
│   │   │
│   │   ├── connections/  # Device connection services
│   │   │   ├── SerialConnection.ts
│   │   │   ├── BluetoothConnection.ts
│   │   │   └── ConnectionManager.ts
│   │   │
│   │   ├── protocols/    # Marine protocol parsers
│   │   │   ├── NMEA0183Parser.ts
│   │   │   ├── NMEA2000Parser.ts
│   │   │   ├── SeaTalkParser.ts
│   │   │   └── ProtocolStub.ts
│   │   │
│   │   └── workers/      # Web Workers
│   │       ├── trackProcessor.worker.ts
│   │       └── calculationWorker.ts
│   │
│   ├── store/            # Redux state management
│   │   ├── index.ts      # Store configuration
│   │   ├── navigationSlice.ts
│   │   ├── routesSlice.ts
│   │   ├── tracksSlice.ts
│   │   ├── aisSlice.ts
│   │   ├── instrumentsSlice.ts
│   │   └── uiSlice.ts
│   │
│   ├── models/           # TypeScript data models
│   │   ├── Position.ts
│   │   ├── Route.ts
│   │   ├── Waypoint.ts
│   │   ├── Track.ts
│   │   ├── AISTarget.ts
│   │   └── LogbookEntry.ts
│   │
│   ├── utils/            # Utility functions
│   │   ├── calculations.ts
│   │   ├── coordinates.ts
│   │   ├── validation.ts
│   │   └── formatting.ts
│   │
│   ├── hooks/            # Custom React hooks
│   │   ├── useGeolocation.ts
│   │   ├── useInstruments.ts
│   │   ├── useOfflineStatus.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── types/            # TypeScript type definitions
│   │   ├── index.ts
│   │   ├── api.ts
│   │   └── global.d.ts
│   │
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
│
├── e2e/                  # End-to-end tests
│   ├── chart-display.spec.ts
│   ├── route-planning.spec.ts
│   ├── track-recording.spec.ts
│   ├── offline.spec.ts
│   └── pwa-installation.spec.ts
│
├── .env.example          # Environment variables template
├── .eslintrc.json        # ESLint configuration
├── .prettierrc           # Prettier configuration
├── index.html            # HTML entry point
├── package.json          # Dependencies and scripts
├── playwright.config.ts  # Playwright configuration
├── postcss.config.js     # PostCSS configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
└── vitest.config.ts      # Vitest configuration
```

---

## Architecture Overview

### High-Level Architecture

OpenSail follows a modern React architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Environment                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   React UI   │  │ Service      │  │  Web APIs    │     │
│  │  Components  │  │ Worker       │  │ (Bluetooth,  │     │
│  │              │  │              │  │  Serial, GPS)│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│  ┌──────▼──────────────────▼──────────────────▼───────┐    │
│  │           Application State (Redux)                 │    │
│  └──────┬──────────────────┬──────────────────┬───────┘    │
│         │                  │                  │              │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐     │
│  │  IndexedDB   │  │  Mapbox GL   │  │  Protocol    │     │
│  │  Storage     │  │  JS          │  │  Parsers     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns

#### 1. Repository Pattern
All data access goes through repository classes that abstract IndexedDB operations:

```typescript
interface Repository<T> {
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}
```

#### 2. Service Layer
Business logic is encapsulated in service classes:
- `ConnectionManager`: Handles device connections
- `TrackRecorder`: Manages track recording
- `RouteCalculator`: Performs navigation calculations

#### 3. Redux State Management
Centralized state with Redux Toolkit:
- Slices for different domains (navigation, routes, tracks, etc.)
- Async thunks for side effects
- Selectors for derived state

#### 4. Component Composition
React components follow composition patterns:
- Container components handle logic
- Presentational components handle UI
- Custom hooks for reusable logic

---

## Key Technologies

### React 19.x
- Functional components with hooks
- Concurrent features for better performance
- Suspense for lazy loading

### TypeScript 5.9
- Strict type checking enabled
- Type-safe Redux with RTK
- Interface-driven development

### Vite 7.x
- Fast HMR (Hot Module Replacement)
- Optimized production builds
- Plugin ecosystem

### Redux Toolkit 2.x
- Simplified Redux setup
- Built-in immutability with Immer
- RTK Query for API calls (optional)

### Dexie.js 4.x
- IndexedDB wrapper with better API
- TypeScript support
- Transactions and queries

### Mapbox GL JS 3.x
- WebGL-based vector maps
- Custom layers and markers
- Smooth animations

### Tailwind CSS 3.x
- Utility-first CSS
- Responsive design
- Custom theme configuration

### Workbox 7.x
- Service Worker generation
- Caching strategies
- Background sync

---

## Development Workflow

### Running the Development Server

```bash
npm run dev
```

Features:
- Hot Module Replacement (HMR)
- Fast refresh for React components
- TypeScript type checking
- ESLint integration

### Code Style

We use Prettier and ESLint for consistent code style:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Type Checking

TypeScript is configured with strict mode:

```bash
# Check types
npm run type-check
```

### Git Workflow

1. **Create a Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**:
   - Write code
   - Add tests
   - Update documentation

3. **Commit Changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   
   Follow conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `style:` Formatting
   - `refactor:` Code restructuring
   - `test:` Adding tests
   - `chore:` Maintenance

4. **Push and Create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

---

## Testing

### Unit Tests (Vitest)

Run unit tests:
```bash
npm run test
```

Run with coverage:
```bash
npm run test:coverage
```

Watch mode:
```bash
npm run test:watch
```

Example unit test:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateDistance } from '../utils/calculations';

describe('calculateDistance', () => {
  it('calculates distance between two points', () => {
    const point1 = { latitude: 0, longitude: 0 };
    const point2 = { latitude: 1, longitude: 1 };
    const distance = calculateDistance(point1, point2);
    expect(distance).toBeCloseTo(157.2, 1);
  });
});
```

### Integration Tests

Integration tests verify multiple components working together:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setupDatabase } from '../services/storage/database';
import { RouteRepository } from '../services/storage/RouteRepository';

describe('RouteRepository Integration', () => {
  let repository: RouteRepository;

  beforeEach(async () => {
    const db = await setupDatabase();
    repository = new RouteRepository(db);
  });

  it('creates and retrieves a route', async () => {
    const route = await repository.create({
      name: 'Test Route',
      waypoints: []
    });
    
    const retrieved = await repository.getById(route.id);
    expect(retrieved).toEqual(route);
  });
});
```

### E2E Tests (Playwright)

Run E2E tests:
```bash
npm run test:e2e
```

Run in UI mode:
```bash
npm run test:e2e:ui
```

Example E2E test:
```typescript
import { test, expect } from '@playwright/test';

test('user can create a route', async ({ page }) => {
  await page.goto('/');
  
  // Open route planner
  await page.click('text=Routes');
  await page.click('text=New Route');
  
  // Add waypoints
  await page.click('.map-container', { position: { x: 100, y: 100 } });
  await page.click('.map-container', { position: { x: 200, y: 200 } });
  
  // Save route
  await page.fill('input[name="routeName"]', 'Test Route');
  await page.click('text=Save');
  
  // Verify route appears in list
  await expect(page.locator('text=Test Route')).toBeVisible();
});
```

### Testing Best Practices

1. **Write tests first** (TDD) when possible
2. **Test behavior**, not implementation
3. **Use meaningful test names**
4. **Keep tests isolated** and independent
5. **Mock external dependencies** (APIs, hardware)
6. **Test edge cases** and error conditions
7. **Maintain high coverage** (aim for >80%)

---

## Build and Deployment

### Production Build

Create an optimized production build:

```bash
npm run build
```

Output is in the `dist/` directory.

### Preview Production Build

Test the production build locally:

```bash
npm run preview
```

### Build Configuration

The build is configured in `vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'OpenSail',
        short_name: 'OpenSail',
        theme_color: '#1e40af',
        icons: [/* ... */]
      },
      workbox: {
        runtimeCaching: [/* ... */]
      }
    })
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: true
  }
});
```

### Deployment Options

#### Netlify

1. **Connect Repository**:
   - Link your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`

2. **Configure Environment**:
   - Add environment variables in Netlify dashboard
   - `VITE_MAPBOX_TOKEN`
   - `VITE_API_ENDPOINT`

3. **Deploy**:
   - Automatic deployment on push to main branch
   - Preview deployments for pull requests

#### Vercel

1. **Import Project**:
   - Import from GitHub
   - Framework preset: Vite
   - Root directory: `pwa`

2. **Configure**:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Add environment variables

3. **Deploy**:
   - Automatic deployments
   - Preview URLs for branches

#### Cloudflare Pages

1. **Create Project**:
   - Connect GitHub repository
   - Build command: `npm run build`
   - Build output: `dist`

2. **Environment Variables**:
   - Add in Cloudflare dashboard

3. **Deploy**:
   - Automatic deployments
   - Global CDN distribution

### Environment Variables

Required for production:

```
VITE_MAPBOX_TOKEN=your_production_token
VITE_API_ENDPOINT=https://api.yourdomain.com
VITE_ENVIRONMENT=production
```

### HTTPS Requirement

PWA features require HTTPS. All recommended hosting providers provide automatic HTTPS.

For self-hosting, use:
- Let's Encrypt for free SSL certificates
- Nginx or Apache as reverse proxy
- Certbot for automatic certificate renewal

---

## Contributing

### Getting Started

1. **Fork the Repository**
2. **Clone Your Fork**
3. **Create a Branch**
4. **Make Changes**
5. **Write Tests**
6. **Submit Pull Request**

### Code Review Process

1. **Automated Checks**:
   - TypeScript compilation
   - ESLint checks
   - Unit tests
   - E2E tests
   - Build verification

2. **Manual Review**:
   - Code quality
   - Architecture fit
   - Documentation
   - Test coverage

3. **Approval and Merge**:
   - At least one approval required
   - All checks must pass
   - Squash and merge to main

### Contribution Guidelines

#### Code Style

- Follow existing patterns
- Use TypeScript strictly
- Write self-documenting code
- Add comments for complex logic
- Keep functions small and focused

#### Documentation

- Update README if needed
- Add JSDoc comments for public APIs
- Update user guide for new features
- Include inline code comments

#### Testing

- Write unit tests for new functions
- Add integration tests for features
- Include E2E tests for user workflows
- Maintain or improve coverage

#### Commit Messages

Follow conventional commits:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding tests
- `chore`: Maintenance tasks

### Areas for Contribution

#### High Priority
- Additional marine protocol support
- Chart source integrations
- Weather data providers
- Performance optimizations

#### Medium Priority
- UI/UX improvements
- Additional instrument gauges
- Export/import formats
- Internationalization

#### Low Priority
- Theme customization
- Advanced route planning
- Social features
- Analytics

### Getting Help

- **GitHub Discussions**: Ask questions
- **GitHub Issues**: Report bugs
- **Pull Requests**: Propose changes
- **Documentation**: Read the docs

---

## Performance Optimization

### Bundle Size

Monitor bundle size:
```bash
npm run build -- --mode analyze
```

Optimization techniques:
- Code splitting by route
- Lazy loading components
- Tree shaking unused code
- Minification and compression

### Runtime Performance

- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Debounce frequent updates
- Use Web Workers for heavy computations

### Memory Management

- Clean up event listeners
- Limit AIS history retention
- Implement LRU cache for tiles
- Monitor memory usage in DevTools

---

## Debugging

### Browser DevTools

- **Console**: Log messages and errors
- **Network**: Monitor API calls and tile loading
- **Application**: Inspect Service Worker, IndexedDB, storage
- **Performance**: Profile rendering and JavaScript execution
- **Lighthouse**: Audit PWA, performance, accessibility

### Redux DevTools

- Inspect state changes
- Time-travel debugging
- Action replay
- State diff visualization

### Common Issues

#### Service Worker Not Updating

```javascript
// Force update in development
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
}
```

#### IndexedDB Quota Exceeded

```javascript
// Check storage usage
if ('storage' in navigator && 'estimate' in navigator.storage) {
  const estimate = await navigator.storage.estimate();
  console.log(`Using ${estimate.usage} of ${estimate.quota} bytes`);
}
```

---

## Security Considerations

### API Keys

- Never commit API keys to repository
- Use environment variables
- Rotate keys regularly
- Restrict key permissions

### Content Security Policy

Configure CSP headers:
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.mapbox.com;
```

### Data Privacy

- All data stored locally by default
- No tracking or analytics without consent
- Clear privacy policy
- GDPR compliance

---

## Resources

### Documentation

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [Dexie.js](https://dexie.org/)
- [Workbox](https://developers.google.com/web/tools/workbox)

### Marine Protocols

- [NMEA0183 Reference](http://www.nmea.org/)
- [NMEA2000 Documentation](https://www.nmea.org/content/STANDARDS/NMEA_2000)
- [SeaTalk Protocol](https://www.thomasknauf.de/seatalk.htm)

### PWA Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker Cookbook](https://serviceworke.rs/)
- [Web.dev](https://web.dev/)

---

**Happy Coding! ⚓**
