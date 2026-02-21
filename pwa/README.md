# OpenSail PWA

Progressive Web App version of OpenSail marine navigation system.

## 📚 Documentation

- **[User Guide](USER_GUIDE.md)** - Installation, usage, and troubleshooting for end users
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Setup, architecture, and contribution guidelines for developers
- **[E2E Tests Summary](E2E_TESTS_SUMMARY.md)** - End-to-end test coverage and results

## 🚀 Quick Start

### For Users

1. **Access the App**: Open in your browser (Chrome/Edge recommended)
2. **Install as PWA**: Click the install icon in the address bar
3. **Download Charts**: Pre-download charts for offline use
4. **Connect Instruments**: Connect via USB or Bluetooth (Chrome/Edge only)

See the [User Guide](USER_GUIDE.md) for detailed instructions.

### For Developers

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your Mapbox token to .env
# VITE_MAPBOX_TOKEN=your_token_here

# Start development server
npm run dev
```

See the [Developer Guide](DEVELOPER_GUIDE.md) for complete setup instructions.

## 🛠️ Tech Stack

- **React 19.2** with TypeScript 5.9
- **Vite 7.3** for fast development and optimized builds
- **Redux Toolkit 2.2** for state management
- **Mapbox GL JS 3.x** for vector maps
- **Dexie.js 4.x** for IndexedDB storage
- **Tailwind CSS 4.2** for responsive styling
- **Workbox 7.x** for PWA/Service Worker
- **Vitest 1.x** for unit tests
- **Playwright 1.x** for E2E tests

## 📁 Project Structure

```
src/
├── components/     # React UI components
│   ├── chart/     # Map and chart components
│   ├── instruments/ # Instrument display gauges
│   ├── routes/    # Route planning components
│   ├── tracks/    # Track recording components
│   └── ui/        # Shared UI components
├── services/      # Business logic services
│   ├── storage/   # IndexedDB repositories
│   ├── connections/ # Web Serial/Bluetooth wrappers
│   ├── protocols/ # Marine protocol parsers
│   └── workers/   # Web Workers
├── store/         # Redux state management
├── models/        # TypeScript data models
├── utils/         # Utility functions
├── hooks/         # Custom React hooks
└── types/         # TypeScript type definitions
```

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start dev server with HMR
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format with Prettier
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run E2E tests
npm run test:e2e:ui      # Run E2E tests in UI mode
```

## 🌐 Browser Compatibility

| Feature | Chrome/Edge 89+ | Safari 15.4+ | Firefox 90+ |
|---------|----------------|--------------|-------------|
| Chart Display | ✅ | ✅ | ✅ |
| Route Planning | ✅ | ✅ | ✅ |
| Track Recording | ✅ | ✅ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ |
| USB Instruments | ✅ | ❌ | ❌ |
| Bluetooth Instruments | ✅ | Limited | ❌ |

**Recommended**: Chrome 89+ or Edge 89+ for full functionality

## 📋 Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Modern Browser**: Chrome/Edge 89+, Safari 15.4+, or Firefox 90+
- **HTTPS**: Required for PWA features (automatic with recommended hosting)

## 🚢 Features

- **Offline-First**: Full functionality without internet connectivity
- **Chart Display**: Vector nautical charts with Mapbox GL JS
- **Route Planning**: Create and navigate multi-waypoint routes
- **Track Recording**: Record and export vessel tracks (GPX format)
- **Instrument Integration**: Connect via USB (Web Serial) or Bluetooth
- **Protocol Support**: NMEA0183, NMEA2000, SeaTalk
- **AIS Display**: View other vessels with collision warnings
- **Responsive Design**: Works on desktop, tablet, and mobile
- **PWA Installation**: Install as standalone app on any platform

## 🔐 Environment Variables

Create a `.env` file in the `pwa/` directory:

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
VITE_API_ENDPOINT=http://localhost:3000
VITE_ENVIRONMENT=development
```

See `.env.example` for the template.

## 🚀 Deployment

### Recommended Hosting

- **Netlify**: Automatic HTTPS, CDN, continuous deployment
- **Vercel**: Automatic HTTPS, edge network, preview deployments
- **Cloudflare Pages**: Global CDN, automatic HTTPS, fast builds

All provide:
- Automatic HTTPS (required for PWA)
- Static hosting
- Environment variable management
- Continuous deployment from Git

See the [Developer Guide](DEVELOPER_GUIDE.md#build-and-deployment) for detailed deployment instructions.

## 🤝 Contributing

We welcome contributions! Please see the [Developer Guide](DEVELOPER_GUIDE.md#contributing) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process
- Areas for contribution

## 📄 License

Open source - see LICENSE file for details.

## 🆘 Support

- **User Issues**: See [User Guide](USER_GUIDE.md#troubleshooting)
- **Bug Reports**: Open a GitHub issue
- **Feature Requests**: Open a GitHub discussion
- **Development Help**: See [Developer Guide](DEVELOPER_GUIDE.md)

---

**Happy Sailing! ⛵**
