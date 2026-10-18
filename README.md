# OpenSail

Open-source marine navigation system built as a Progressive Web App.

## Overview

OpenSail is a comprehensive marine navigation solution designed for recreational sailors and coastal cruisers. Built with modern web technologies, it provides chart display, route planning, instrument integration, and offline functionality—all accessible through your web browser.

As a Progressive Web App (PWA), OpenSail works on any device with a modern browser and can be installed for a native app-like experience. No app store required, no platform lock-in, just open your browser and start navigating.

## Key Features

- **Offline-First Navigation**: Full functionality without internet connectivity
- **Vector Nautical Charts**: Chart display powered by MapLibre GL JS on free OpenStreetMap tiles (no API token needed)
- **Route Planning**: Create and navigate multi-waypoint routes with real-time guidance
- **Track Recording**: Record and export vessel tracks in GPX format
- **Instrument Integration**: Connect marine instruments via USB or Bluetooth
- **Protocol Support**: NMEA0183, NMEA2000, and SeaTalk protocols
- **AIS Display**: View other vessels with collision warnings
- **Cross-Platform**: Works on Windows, Android, iOS, and any device with a browser
- **PWA Installation**: Install as a standalone app on any platform

## Technology Stack

- **React 19** with TypeScript for type-safe UI development
- **Vite 7** for fast development and optimized builds
- **Redux Toolkit** for centralized state management
- **MapLibre GL JS** for WebGL-based vector map rendering
- **Dexie.js** for IndexedDB storage (routes, tracks, charts)
- **Tailwind CSS** for responsive, mobile-first design
- **Workbox** for Service Worker and offline functionality
- **Vitest** and **Playwright** for comprehensive testing

## Quick Start

### For Users

1. **Access the App**: Open OpenSail in your browser (Chrome or Edge recommended)
2. **Install as PWA**: Click the install icon in the address bar for standalone app experience
3. **Download Charts**: Pre-download nautical charts for your sailing region
4. **Connect Instruments**: Connect GPS and marine instruments via USB or Bluetooth
5. **Start Navigating**: Plan routes, record tracks, and navigate offline

See the [User Guide](pwa/USER_GUIDE.md) for detailed instructions.

### For Developers

```bash
# Navigate to PWA directory
cd pwa

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

See the [Developer Guide](pwa/DEVELOPER_GUIDE.md) for complete setup and contribution guidelines.

## Browser Compatibility

| Feature | Chrome/Edge 89+ | Safari 15.4+ | Firefox 90+ |
|---------|----------------|--------------|-------------|
| Chart Display | ✅ | ✅ | ✅ |
| Route Planning | ✅ | ✅ | ✅ |
| Track Recording | ✅ | ✅ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ |
| USB Instruments | ✅ | ❌ | ❌ |
| Bluetooth Instruments | ✅ | Limited | ❌ |

**Recommended**: Chrome 89+ or Edge 89+ for full functionality including device connections.

## Development Scripts

All development happens in the `pwa/` directory. For convenience, you can run these commands from the root:

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run end-to-end tests

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

## Documentation

- **[User Guide](pwa/USER_GUIDE.md)** - Installation, usage, and troubleshooting for end users
- **[Developer Guide](pwa/DEVELOPER_GUIDE.md)** - Setup, architecture, and contribution guidelines
- **[PWA Architecture](pwa/README.md)** - Technical details and project structure
- **[E2E Tests Summary](pwa/E2E_TESTS_SUMMARY.md)** - Test coverage and results

## Project Structure

```
opensail/
├── pwa/                    # Progressive Web App implementation
│   ├── src/               # Application source code
│   ├── public/            # Static assets and PWA manifest
│   ├── e2e/               # End-to-end tests
│   └── package.json       # PWA dependencies
├── .kiro/                 # Kiro specs and configuration
└── package.json           # Root package.json with convenience scripts
```

## Requirements

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Modern Browser**: Chrome/Edge 89+, Safari 15.4+, or Firefox 90+
- **HTTPS**: Required for PWA features (automatic with recommended hosting)

## Deployment

OpenSail runs at https://opensail.g-zeven.nl: a Docker image (nginx) on a home server behind a Cloudflare Tunnel, updated automatically from `main`. See **[DEPLOY.md](DEPLOY.md)**.

It can also be deployed to any static hosting provider that supports HTTPS (chart archives go in `/charts/`):

### Recommended Hosting Providers

- **Netlify**: Automatic HTTPS, CDN, continuous deployment
- **Vercel**: Automatic HTTPS, edge network, preview deployments
- **Cloudflare Pages**: Global CDN, automatic HTTPS, fast builds

All provide free tiers suitable for personal use.

### Build and Deploy

```bash
cd pwa
npm run build
```

The optimized production build will be in `pwa/dist/` and can be deployed to any static host.

See the [Developer Guide](pwa/DEVELOPER_GUIDE.md#build-and-deployment) for detailed deployment instructions.

## Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### Getting Started

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes and add tests
4. Commit using conventional commits (`feat:`, `fix:`, `docs:`, etc.)
5. Push to your fork and submit a pull request

See the [Developer Guide](pwa/DEVELOPER_GUIDE.md#contributing) for detailed contribution guidelines.

### Areas for Contribution

- Additional marine protocol support
- Chart source integrations
- Weather data providers
- UI/UX improvements
- Performance optimizations
- Documentation improvements
- Internationalization

## Why PWA?

OpenSail is built as a Progressive Web App instead of a native mobile app for several key reasons:

- **Universal Compatibility**: Works on any device with a modern browser
- **No App Store**: Direct deployment, no approval process or fees
- **Instant Updates**: Users always get the latest version via Service Worker
- **Simpler Development**: Standard web technologies, no platform-specific tooling
- **True Cross-Platform**: Single codebase for Windows, Android, iOS, and more
- **Offline-First**: Full functionality without internet connectivity
- **Easy Installation**: Install directly from browser, no app store required

## License

Open source - see LICENSE file for details.

## Support

- **User Issues**: See [User Guide](pwa/USER_GUIDE.md#troubleshooting)
- **Bug Reports**: Open a GitHub issue
- **Feature Requests**: Open a GitHub discussion
- **Development Help**: See [Developer Guide](pwa/DEVELOPER_GUIDE.md)

---

**Happy Sailing! ⛵**
