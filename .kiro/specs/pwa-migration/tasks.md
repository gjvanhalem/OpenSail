# Implementation Plan: PWA Migration

- [x] 1. Set up new Vite + React + TypeScript project structure







  - Initialize Vite project with React and TypeScript templates
  - Configure Tailwind CSS for styling
  - Set up ESLint and Prettier for code quality
  - Configure path aliases for clean imports
  - _Requirements: 8.1, 8.2_

- [x] 2. Configure PWA infrastructure





  - [x] 2.1 Install and configure Workbox for Service Worker


    - Add Workbox Vite plugin
    - Configure caching strategies for app shell, charts, and API data
    - Set up offline fallback page
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [x] 2.2 Create Web App Manifest


    - Define app metadata (name, icons, theme colors)
    - Configure display mode as standalone
    - Add icon assets for different sizes
    - _Requirements: 1.3, 1.4, 1.5_
  
  - [x] 2.3 Implement PWA installation prompt


    - Detect PWA installability
    - Show custom install UI
    - Handle installation events
    - _Requirements: 1.4_

- [x] 3. Set up IndexedDB storage layer






  - [x] 3.1 Install and configure Dexie.js

    - Define database schema for routes, waypoints, tracks, AIS, logbook, tiles
    - Create database initialization
    - Set up version migrations
    - _Requirements: 3.1, 3.2_
  

  - [x] 3.2 Implement repository pattern for data access

    - Create generic Repository interface
    - Implement RouteRepository with CRUD operations
    - Implement WaypointRepository
    - Implement TrackRepository with compression
    - Implement AISRepository with TTL cleanup
    - Implement LogbookRepository
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 3.3 Implement chart tile caching service


    - Create TileCache interface
    - Implement tile storage in IndexedDB
    - Add LRU eviction for storage management
    - Implement region-based cache clearing
    - _Requirements: 2.3, 5.5_

- [x] 4. Port existing TypeScript models and utilities





  - [x] 4.1 Copy and adapt data models


    - Port Position, Route, Waypoint, Track, AISTarget models
    - Port LogbookEntry and WeatherData models
    - Update imports and dependencies
    - _Requirements: 3.1_
  
  - [x] 4.2 Port protocol parsers


    - Copy NMEA0183Parser.ts
    - Copy NMEA2000Parser.ts
    - Copy SeaTalkParser.ts
    - Update for browser environment (remove Node.js dependencies)
    - _Requirements: 4.3_
  
  - [x] 4.3 Port calculation utilities


    - Copy distance and bearing calculations
    - Copy coordinate transformations
    - Copy route validation logic
    - _Requirements: 5.2_

- [x] 5. Set up Redux state management





  - [x] 5.1 Install Redux Toolkit and React-Redux


    - Configure Redux store
    - Set up Redux DevTools
    - Create root reducer
    - _Requirements: 7.2_
  

  - [x] 5.2 Create state slices

    - Create navigationSlice (position, heading, speed)
    - Create routesSlice (active route, waypoints)
    - Create tracksSlice (recording state, current track)
    - Create aisSlice (targets, CPA warnings)
    - Create instrumentsSlice (connections, data streams)
    - Create uiSlice (sidebar, modals, fullscreen)
    - _Requirements: 7.2_

- [x] 6. Implement responsive layout and routing





  - [x] 6.1 Set up React Router


    - Install React Router
    - Define route structure (/chart, /routes, /tracks, /logbook, /settings)
    - Create route components
    - _Requirements: 6.1, 6.2_
  
  - [x] 6.2 Create responsive layout components


    - Implement Layout component with responsive breakpoints
    - Create Navigation component with mobile menu
    - Create Sidebar component with collapsible behavior
    - Implement fullscreen mode toggle
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Integrate Mapbox GL JS for chart display





  - [x] 7.1 Set up Mapbox GL JS


    - Install mapbox-gl and react-map-gl
    - Configure Mapbox access token
    - Create ChartView component with basic map
    - _Requirements: 5.1_
  
  - [x] 7.2 Implement vessel position marker


    - Create VesselMarker component
    - Connect to navigation state
    - Add heading indicator
    - Implement smooth position updates
    - _Requirements: 5.2_
  
  - [x] 7.3 Implement route and track layers


    - Create RouteLayer component to display planned routes
    - Create TrackLayer component to display recorded tracks
    - Add waypoint markers
    - Implement layer toggling
    - _Requirements: 5.4_
  
  - [x] 7.4 Implement AIS layer


    - Create AISLayer component
    - Display AIS targets with vessel icons
    - Show CPA warnings visually
    - Implement target selection and info display
    - _Requirements: 5.4_
  
  - [x] 7.5 Optimize map performance


    - Implement viewport-based rendering
    - Add debouncing for map updates
    - Configure map style for performance
    - Test 60 FPS target
    - _Requirements: 7.1, 7.3_

- [x] 8. Implement Web Serial API for USB instruments





  - [x] 8.1 Create SerialConnection class


    - Implement Web Serial API wrapper
    - Add connection/disconnection logic
    - Implement data streaming
    - Add error handling
    - _Requirements: 4.1_
  
  - [x] 8.2 Create instrument connection UI


    - Build InstrumentManager component
    - Add serial port selection
    - Show connection status
    - Display received data
    - _Requirements: 4.1, 4.3_
  
  - [x] 8.3 Connect protocol parsers to serial data


    - Wire NMEA0183Parser to serial stream
    - Wire NMEA2000Parser to serial stream
    - Wire SeaTalkParser to serial stream
    - Dispatch parsed data to Redux store
    - _Requirements: 4.3, 4.4_

- [x] 9. Implement Web Bluetooth API for Bluetooth instruments




  - [x] 9.1 Create BluetoothConnection class


    - Implement Web Bluetooth API wrapper
    - Add device discovery and pairing
    - Implement data streaming
    - Add error handling and reconnection
    - _Requirements: 4.2_
  
  - [x] 9.2 Add Bluetooth UI to InstrumentManager


    - Add Bluetooth device scanning
    - Show available devices
    - Handle pairing flow
    - Display connection status
    - _Requirements: 4.2, 4.3_
  
  - [x] 9.3 Connect protocol parsers to Bluetooth data


    - Wire parsers to Bluetooth stream
    - Handle Bluetooth-specific data formats
    - Dispatch parsed data to Redux store
    - _Requirements: 4.3, 4.4_

- [x] 10. Implement route planning features





  - [x] 10.1 Create RoutePlanner component


    - Build route creation UI
    - Implement waypoint addition by map click
    - Show route distance and bearing
    - Add route save/load functionality
    - _Requirements: 3.1_
  
  - [x] 10.2 Create WaypointEditor component


    - Build waypoint editing form
    - Allow coordinate input
    - Add waypoint notes
    - Implement waypoint reordering
    - _Requirements: 3.1_
  
  - [x] 10.3 Implement route calculations


    - Calculate total distance
    - Calculate bearings between waypoints
    - Estimate travel time
    - Validate route for hazards (if chart data available)
    - _Requirements: 3.1_

- [x] 11. Implement track recording




  - [x] 11.1 Create track recording service


    - Implement TrackRecorder class
    - Add start/stop/pause functionality
    - Store track points in IndexedDB
    - Implement track compression for storage efficiency
    - _Requirements: 3.3_
  

  - [x] 11.2 Create track display UI

    - Build TrackList component
    - Show recorded tracks with metadata
    - Implement track playback on map
    - Add track export (GPX format)
    - _Requirements: 3.2_

- [x] 12. Implement instrument display panels






  - [x] 12.1 Create instrument gauge components

    - Build SpeedGauge component
    - Build DepthGauge component
    - Build WindGauge component
    - Build HeadingCompass component
    - _Requirements: 4.4_
  

  - [x] 12.2 Create instrument panel layout

    - Build InstrumentPanel container
    - Implement customizable layout
    - Add gauge configuration
    - Connect to instrument data from Redux
    - _Requirements: 4.4_

- [x] 13. Implement offline chart tile caching





  - [x] 13.1 Create chart download UI


    - Build region selector on map
    - Show download progress
    - Display cached regions
    - Add cache management (clear regions)
    - _Requirements: 2.3, 3.4_
  
  - [x] 13.2 Implement tile download and caching


    - Download tiles for selected region
    - Store tiles in IndexedDB via TileCache
    - Implement cache-first strategy in Service Worker
    - Handle cache quota exceeded
    - _Requirements: 2.3, 5.5_

- [x] 14. Implement settings and configuration





  - [x] 14.1 Create Settings component


    - Build settings UI with sections
    - Add map preferences (units, chart style)
    - Add instrument preferences
    - Add offline mode toggle
    - _Requirements: 3.4_
  
  - [x] 14.2 Persist settings to IndexedDB


    - Create SettingsRepository
    - Load settings on app start
    - Save settings on change
    - _Requirements: 3.1, 3.2_

- [x] 15. Implement error handling and notifications






  - [x] 15.1 Create ErrorHandler service

    - Implement global error boundary
    - Add error logging
    - Create user-friendly error messages
    - _Requirements: 4.5_

  

  - [x] 15.2 Create notification system

    - Build Toast/Notification component
    - Add notification queue
    - Implement different severity levels
    - Connect to error handler and app events
    - _Requirements: 2.5, 3.4, 4.5_

- [x] 16. Implement browser compatibility detection






  - [x] 16.1 Create feature detection utility

    - Detect Web Serial API support
    - Detect Web Bluetooth API support
    - Detect Service Worker support
    - Detect IndexedDB support
    - _Requirements: 1.1, 1.2, 4.1, 4.2_
  
  - [x] 16.2 Add compatibility warnings


    - Show warnings for unsupported features
    - Recommend compatible browsers
    - Provide fallback options
    - _Requirements: 1.1, 1.2_

- [x] 17. Optimize performance






  - [x] 17.1 Implement code splitting

    - Split routes into separate bundles
    - Lazy load heavy components (map, charts)
    - Optimize bundle sizes
    - _Requirements: 7.1, 7.5, 8.3_
  

  - [x] 17.2 Optimize rendering performance

    - Add React.memo to expensive components
    - Implement virtual scrolling for lists
    - Debounce map updates
    - Use Web Workers for heavy computations
    - _Requirements: 7.2, 7.3_
  

  - [x] 17.3 Optimize storage operations

    - Batch IndexedDB writes
    - Implement efficient queries with indexes
    - Add data compression for tracks
    - Monitor and optimize memory usage
    - _Requirements: 7.5_

- [x] 18. Write tests








  - [x] 18.1 Write unit tests



    - Test protocol parsers with known sentences
    - Test route calculations
    - Test data transformations
    - Test repository operations (mocked IndexedDB)
    - _Requirements: 8.5_
  
  - [x] 18.2 Write integration tests



    - Test Service Worker caching
    - Test IndexedDB operations
    - Test map interactions
    - Test state management
    - _Requirements: 8.5_
  
  - [x] 18.3 Write E2E tests with Playwright

    - Test complete user workflows
    - Test offline functionality
    - Test PWA installation
    - Test cross-browser compatibility
    - _Requirements: 1.1, 1.2, 2.2, 8.5_

- [x] 19. Update documentation






  - [x] 19.1 Update steering documents

    - Update tech.md with new stack
    - Update product.md with PWA approach
    - Document browser requirements
    - _Requirements: 8.1_
  


  - [x] 19.2 Create user documentation

    - Write installation guide
    - Document offline usage
    - Create instrument connection guide
    - Add troubleshooting section
    - _Requirements: 1.3, 4.1, 4.2_

  
  - [x] 19.3 Create developer documentation

    - Document project structure
    - Add development setup guide
    - Document build and deployment process
    - Add contribution guidelines
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [-] 20. Deploy and test


  - [x] 20.1 Set up deployment pipeline


    - Configure build process
    - Set up hosting (Netlify/Vercel)
    - Configure HTTPS
    - Set up environment variables
    - _Requirements: 8.4_
  
  - [x] 20.2 Test on target devices


    - Test on Windows desktop browsers
    - Test on Android tablets
    - Test on iPad
    - Verify PWA installation on each platform
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [x] 20.3 Performance testing





    - Run Lighthouse audits
    - Test offline functionality
    - Measure load times
    - Verify 60 FPS chart rendering
    - _Requirements: 7.1, 7.3, 7.5_
