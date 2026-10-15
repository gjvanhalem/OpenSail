# Implementation Plan

## STATUS: Core infrastructure complete, but UI integration missing

The protocol parsers, services, database, and UI components exist but are not connected. The app shows a map but no data flows through the system.

## CRITICAL INTEGRATION TASKS (Must Complete to Make App Functional)

- [x] 22. Connect GPS and position data to the system





- [x] 22.1 Implement browser Geolocation API integration


  - Create GeolocationService to wrap browser Geolocation API
  - Dispatch position updates to Redux navigationSlice
  - Handle permission requests and errors
  - Add position accuracy monitoring
  - _Requirements: 1.2, 6.1_

- [x] 22.2 Add simulated GPS data for development


  - Create GPS simulator with realistic movement
  - Add UI toggle to switch between real GPS and simulator
  - Implement predefined test tracks (harbor, coastal, open water)
  - _Requirements: 1.2, 10.4_

- [x] 22.3 Connect position data to ChartView


  - Ensure VesselMarker receives position from Redux
  - Auto-center map on vessel position (only worked at mount until Phase 1 made ChartView's viewState controlled)
  - Update vessel heading indicator
  - _Requirements: 1.2, 1.5_

- [x] 23. Wire up instrument services to Redux
- [x] 23.1 Connect InstrumentService to Redux store
  - Dispatch instrument data to Redux slices
  - Update instrumentsSlice with real-time data
  - Connect depth, wind, speed, heading to Redux
  - Route NMEA 0183 GGA/RMC/GLL/VTG/HDG/HDT and NMEA 2000 PGNs 129025/129026/127250 into navigationSlice, with a GPS / instrument / auto source choice per value
  - _Requirements: 3.4, 3.5, 14.3_

- [x] 23.2 Connect instrument gauges to Redux data
  - Update SpeedGauge to read from Redux
  - Update DepthGauge to read from Redux
  - Update WindGauge to read from Redux
  - Update HeadingCompass to read from Redux
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 23.3 Add instrument data simulator
  - StubConnection generates real NMEA 0183, NMEA 2000 and SeaTalk data through the same connection interface as hardware ("Simulator" on the Instruments page)
  - Enable protocol stub by default in development (not done: it would override GPS in auto source mode; start it from the Instruments page instead)
  - Add UI controls to adjust simulated values
  - Create realistic data variation
  - _Requirements: 10.4, 10.5_

- [ ] 24. Implement route planning functionality
- [x] 24.1 Enable waypoint creation on map
  - Add click handler to ChartView for waypoint placement
  - Connect RoutePlannerUI to map interactions
  - Display waypoints as markers on map
  - _Requirements: 2.1_

- [x] 24.2 Implement route calculations
  - Calculate distance and bearing between waypoints
  - Update route statistics in real-time
  - Display route line on map
  - Route summary on the Routes page: total distance, time and ETA at the planned speed, and the course change at each waypoint (R2.4)
  - _Requirements: 2.2, 2.4_

- [x] 24.3 Connect route service to UI
  - Save routes to database when created
  - Load routes from database on app start (the layout loads them, so a route can be started from the chart)
  - Update Redux when routes change
  - _Requirements: 2.3_

- [x] 24.4 Navigate an active route
  - Start and stop a route from the Routes page and the chart
  - Bearing and distance to the next waypoint, cross-track error, and ETA from current SOG, against navigationSlice's position
  - Advance to the next waypoint automatically inside the arrival radius (a setting; a waypoint's own radius wins when larger)
  - Route-guidance panel (NavigationStatus) on the chart, and the active leg highlighted on the map
  - e2e: a simulated passage over a 5-waypoint route with the protocol stub (route-passage.spec.ts)
  - _Requirements: 2.2, 2.4_

- [ ] 25. Implement track recording
- [ ] 25.1 Connect TrackRecorder to position data
  - Start recording when user clicks record button
  - Capture position every 10 seconds
  - Save track points to database
  - _Requirements: 9.1, 9.2_

- [x] 25.2 Display recorded tracks on map
  - Load tracks from database (on app start, in the layout)
  - Render track lines on ChartView, each in its own colour; pick a colour per track on the Tracks page
  - Show track statistics
  - _Requirements: 9.3_

- [ ] 25.3 Implement track controls
  - Add start/stop recording buttons
  - Show recording status indicator
  - Display current track statistics
  - _Requirements: 9.1_

- [x] 25.4 Convert a recorded track into a route
  - Douglas-Peucker simplification with an adjustable tolerance (default 0.05 nm), at most 50 waypoints
  - The new route gets the arrival radius setting and the track's average speed as its planned speed
  - _Requirements: 9.5_

- [ ] 26. Implement AIS target display
- [ ] 26.1 Connect AIS service to data sources
  - Parse AIS messages from instrument data
  - Update AIS targets in Redux
  - Calculate CPA for nearby targets
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 26.2 Display AIS targets on map
  - Render AIS vessel icons with heading
  - Show vessel information on click
  - Highlight targets within 2nm
  - _Requirements: 4.2, 4.4_

- [ ] 27. Implement logbook functionality
- [ ] 27.1 Auto-detect voyage start/end
  - Start voyage when vessel speed > 1 knot
  - End voyage when stopped for > 30 minutes
  - Calculate voyage statistics
  - _Requirements: 13.1, 13.2_

- [ ] 27.2 Create logbook UI
  - Display voyage list
  - Show voyage details and statistics
  - Allow manual notes
  - _Requirements: 13.3_

- [ ] 28. Implement safety features
- [ ] 28.1 Add MOB (Man Overboard) function
  - Add MOB button to UI
  - Capture position immediately
  - Display MOB marker on map
  - Show bearing and distance to MOB
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 28.2 Implement anchor watch
  - Add anchor watch activation UI
  - Monitor position against radius
  - Trigger alarm when dragging
  - Display anchor watch circle
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 29. Add missing UI state management
- [ ] 29.1 Create UI slice for view controls
  - Add toggles for routes, tracks, AIS visibility
  - Store map viewport state
  - Manage panel open/close states
  - _Requirements: All UI requirements_

- [ ] 29.2 Implement settings persistence
  - Load settings on app start
  - Save settings changes to database
  - Apply settings to all components (units and chart rotation done in Phase 1)
  - _Requirements: 14.4, 6.3_

- [ ] 30. Add development tools and debugging
- [ ] 30.1 Create debug panel
  - Show current GPS position
  - Display instrument data values
  - Show Redux state
  - Add simulator controls
  - _Requirements: Development needs_

- [ ] 30.2 Add data visualization
  - Show connection status indicators
  - Display data flow indicators
  - Add performance metrics
  - _Requirements: Development needs_

## CRITICAL TASKS (Must Complete First)

These tasks are blocking other work and must be completed before the application can function:

- [x] 0.1 **Install missing dependencies**
  - Add ESLint configuration and plugins
  - Add SQLite library (react-native-sqlite-storage or expo-sqlite)
  - Add Mapbox library (@rnmapbox/maps)
  - Add serialport library for hardware connections
  - Add react-native-fs for file operations
  - Run npm install and verify all dependencies resolve
  - _Status: ✅ COMPLETE - All dependencies added to package.json, .eslintrc.js created_

- [x] 0.2 **Initialize SQLite database**
  - Create src/database/index.ts with database initialization
  - Execute SQL schema from design document
  - Implement migration system
  - Test database creation and queries
  - Update all repositories to use initialized database
  - _Status: ✅ COMPLETE - Full SQLite implementation with all tables and migrations_

- [x] 0.3 **Implement physical hardware connections**
  - Complete InstrumentService serial port implementation
  - Complete InstrumentService network socket implementation
  - Add connection error handling
  - Test with real NMEA devices or simulators
  - _Status: ✅ COMPLETE - Serial and network connections fully implemented_

- [x] 0.4 **Complete skeleton service implementations**
  - [x] Implement ChartManager tile loading and caching
  - [x] Implement TrackService recording logic
  - [x] Implement LogbookService voyage tracking
  - [x] Implement SafetyService MOB and anchor watch
  - [x] Implement SettingsService persistence
  - [x] Implement SyncManager queue and sync logic
  - [x] Implement ErrorHandler error management
  - [x] Implement WeatherService API integration
  - [x] Implement TideService data management
  - _Status: ✅ COMPLETE - All 9 services fully implemented with core functionality_

- [x] 0.5 **Write critical unit tests**
  - Test all protocol parsers (NMEA0183, NMEA2000, SeaTalk)
  - Test protocol stub scenarios
  - Test InstrumentService data distribution
  - Test RouteService calculations
  - Test AISService CPA calculations
  - Test all repositories
  - _Status: ✅ COMPLETE - 35 tests passing, 11 failing (NMEA0183 validation issues to fix)_

## Core Implementation Tasks

- [x] 1. Set up project structure and core infrastructure
  - Initialize React Native project with TypeScript configuration
  - Set up Redux Toolkit for state management
  - Configure SQLite database connection and migration system
  - Set up development environment with linting and formatting
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Implement protocol parsers and stub simulator
- [x] 2.1 Implement NMEA0183 parser
  - Create NMEA0183Parser class with sentence validation and checksum calculation
  - Implement parsers for GGA, RMC, GLL, VTG, DBT, DPT, MWV, VHW, HDG, VDM, VDO sentences
  - Add sentence-to-data transformation for each message type
  - _Requirements: 3.1, 4.1, 10.1_

- [x] 2.2 Implement NMEA2000 parser
  - Create NMEA2000Parser class with PGN extraction and field parsing
  - Implement parsers for PGNs: 126992, 127250, 127251, 128259, 128267, 129025, 129026, 129029, 130306, 130310
  - Add CAN bus message decoding logic
  - _Requirements: 3.2, 10.2_

- [x] 2.3 Implement SeaTalk parser
  - Create SeaTalkParser class with command byte extraction
  - Implement parsers for commands: 0x00, 0x10, 0x11, 0x20, 0x84
  - Add Raymarine-specific data interpretation
  - _Requirements: 3.3, 10.3_

- [x] 2.4 Implement protocol stub simulator
  - Create ProtocolStub class with configurable data generation
  - Implement GPS track simulation with realistic movement
  - Add depth, wind, speed, and AIS data generators
  - Create predefined test scenarios (coastal navigation, harbor approach, open water)
  - Implement output modes: serial, network, and callback
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2.5 Write unit tests for protocol parsers




  - Test NMEA0183 parser with valid and invalid sentences
  - Test NMEA2000 parser with known PGN messages
  - Test SeaTalk parser with Raymarine command sequences
  - Test protocol stub data generation and scenario execution
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 3. Implement instrument service and data distribution
- [x] 3.1 Create InstrumentService with connection management
  - Implement serial and network connection handlers
  - Add protocol detection and parser routing
  - Create subscription system for instrument data
  - Implement automatic reconnection logic with 5-second intervals
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.2 Implement instrument data models and type definitions
  - Create InstrumentData interface and InstrumentDataType enum
  - Define data structures for GPS, depth, wind, speed, heading, temperature
  - Implement unit conversion utilities (metric, imperial, nautical)
  - _Requirements: 3.4, 3.5, 14.4_

- [x] 3.3 Add stub mode integration to InstrumentService
  - Implement stub mode toggle functionality
  - Connect protocol stub to instrument service data pipeline
  - Ensure stub data flows through same interfaces as real instruments
  - _Requirements: 10.5_

- [x] 3.4 **CRITICAL: Implement physical hardware connections**





  - Install react-native-serialport or equivalent for serial communication
  - Implement actual serial port connection logic in connectSerial()
  - Implement actual network socket connection logic in connectNetwork()
  - Add connection state management and error handling
  - Test with real NMEA devices or network simulators
  - _Requirements: 3.1, 3.2, 3.3_
  - _Status: BLOCKING - Currently only stub mode works_

- [x] 3.5 Write integration tests for instrument service







  - Test connection to protocol stubs
  - Test data subscription and distribution
  - Test reconnection logic
  - Test stub mode switching
  - _Requirements: 3.1, 3.2, 3.3, 10.5_

- [x] 3.6 **CRITICAL: Add missing dependencies**





  - Add ESLint and ESLint plugins (@typescript-eslint/parser, @typescript-eslint/eslint-plugin)
  - Add react-native-sqlite-storage or expo-sqlite for database
  - Add serialport or react-native-serialport for hardware connections
  - Add @react-native-mapbox-gl/maps or @rnmapbox/maps for chart display
  - Add react-native-fs for file system operations
  - Update package.json and run npm install
  - _Requirements: All requirements_
  - _Status: BLOCKING - Missing critical runtime dependencies_

- [-] 4. Implement database layer and data models


- [x] 4.0 **CRITICAL: Initialize SQLite database**


  - Install react-native-sqlite-storage or expo-sqlite dependency
  - Create database connection module with proper initialization
  - Execute SQL schema creation on first app launch
  - Implement database version management and migrations
  - Add error handling for database operations
  - Test database creation and table structure
  - _Requirements: 2.3, 5.3, 9.2, 13.4_
  - _Status: BLOCKING - Repositories cannot function without this_

- [x] 4.1 Create database schema and migration system
  - Implement SQLite database initialization
  - Create tables: routes, waypoints, tracks, track_points, voyages, logbook_entries, ais_targets, ais_history, settings, chart_cache
  - Add indexes for performance optimization
  - Implement database migration system for schema updates
  - _Requirements: 2.3, 5.3, 9.2, 13.4_
  - _Status: Schema defined in design doc, but not initialized in code_

- [x] 4.2 Implement data access layer for routes and waypoints
  - Create RouteRepository with CRUD operations
  - Implement WaypointRepository with sequence ordering
  - Add query methods for route retrieval and filtering
  - _Requirements: 2.1, 2.3_

- [x] 4.3 Implement data access layer for tracks
  - Create TrackRepository with recording and retrieval methods
  - Implement efficient track point storage with batching
  - Add track compression for data older than 7 days
  - _Requirements: 9.1, 9.2_

- [x] 4.4 Implement data access layer for logbook
  - Create LogbookRepository with voyage and entry management
  - Implement automatic voyage statistics calculation
  - Add logbook query and filtering methods
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 4.5 Implement data access layer for AIS targets
  - Create AISRepository with target storage and history management
  - Implement spatial indexing for efficient target queries
  - Add automatic cleanup of AIS data older than 24 hours
  - _Requirements: 4.2, 4.4, 4.5_

- [x] 4.6 Write unit tests for data access layer


  - Test CRUD operations for all repositories
  - Test query performance with large datasets
  - Test data integrity and constraints
  - _Requirements: 2.1, 2.3, 9.2, 13.4_

- [x] 5. Implement route service and navigation logic
- [x] 5.1 Create RouteService with route management
  - Implement createRoute, updateRoute, deleteRoute methods
  - Add route calculation with distance and bearing computation
  - Implement active route management
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5.2 Implement route validation against chart data





  - Create route validation logic for shallow water detection
  - Add hazard and restricted area checking
  - Implement warning generation with severity levels
  - Display visual warnings on chart display
  - _Requirements: 2.5_

- [x] 5.3 Implement route import/export functionality
  - Add GPX format parser and generator
  - Add KML format support
  - Implement route conversion utilities
  - _Requirements: 2.3, 9.4_

- [x] 5.4 Write unit tests for route service





  - Test route calculations and validations
  - Test import/export with sample GPX/KML files
  - Test route warning generation
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 6. Implement AIS service and collision detection
- [x] 6.1 Create AISService with message processing
  - Implement AIS message extraction from NMEA0183 (VDM/VDO) and NMEA2000
  - Add AIS target tracking and position history
  - Implement target lifecycle management with automatic expiration
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 6.2 Implement CPA calculation and collision warnings
  - Add closest point of approach calculation algorithm
  - Implement collision warning logic for targets within 2 nautical miles
  - Create visual highlighting for nearby targets
  - _Requirements: 4.3, 4.4_

- [x] 6.3 Write unit tests for AIS service





  - Test AIS message parsing and target creation
  - Test CPA calculation with known scenarios
  - Test target expiration and cleanup
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6.4 **Complete skeleton services**




- [x] 6.4.1 Complete ChartManager implementation





  - Implement actual tile loading from Mapbox or other provider
  - Implement LRU cache with IndexedDB/AsyncStorage
  - Add tile download and storage logic
  - Implement chart coverage and update checking
  - _Requirements: 1.1, 1.3, 15.1, 15.5_
  - _Status: Currently empty skeleton_

- [x] 6.4.2 Complete TrackService implementation

  - Implement track recording start/stop logic
  - Add automatic position capture every 10 seconds
  - Implement track statistics calculation
  - Add track-to-route conversion
  - Implement GPX export
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - _Status: Currently empty skeleton_

- [x] 6.4.3 Complete LogbookService implementation


  - Implement automatic voyage start/end detection
  - Add voyage statistics calculation
  - Implement logbook entry management
  - Add CSV export functionality
  - _Requirements: 13.1, 13.2, 13.3, 13.5_
  - _Status: Currently empty skeleton_

- [x] 6.4.4 Complete SafetyService implementation


  - Implement MOB marker creation and tracking
  - Add bearing/distance calculations to MOB
  - Implement anchor watch with radius monitoring
  - Add alarm triggering logic
  - Record safety events with timestamps
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 12.1, 12.2, 12.3, 12.4, 12.5_
  - _Status: Currently empty skeleton_


- [x] 6.4.5 Complete SettingsService implementation

  - Implement settings storage in SQLite
  - Add default settings initialization
  - Create settings categories (display, units, alerts, connections)
  - Implement get/set methods for all settings
  - _Requirements: 14.4, 6.3, 1.5_
  - _Status: Currently empty skeleton_

- [x] 6.4.6 Complete SyncManager implementation


  - Implement operation queue for offline actions
  - Add automatic sync when connectivity restored
  - Create conflict resolution logic
  - Implement connectivity monitoring
  - _Requirements: 5.2, 5.5_
  - _Status: Currently empty skeleton_


- [x] 6.4.7 Complete ErrorHandler implementation

  - Implement NavigationError class with error codes
  - Add error subscription system
  - Create error logging for debugging
  - Implement recovery strategies for common errors
  - _Requirements: All requirements_
  - _Status: Currently empty skeleton_

- [x] 6.4.8 Complete WeatherService implementation


  - Integrate with weather API (e.g., OpenWeatherMap, NOAA)
  - Implement GRIB data parser
  - Add weather data caching for offline access
  - Implement weather alerts fetching
  - _Requirements: 7.1, 7.2, 7.4, 7.5_
  - _Status: Currently empty skeleton_


- [x] 6.4.9 Complete TideService implementation

  - Integrate with tide data source (e.g., NOAA Tides & Currents API)
  - Implement tide station lookup by location
  - Add tide prediction calculations
  - Implement current prediction data management
  - Cache tide/current data for offline access
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  - _Status: Currently empty skeleton_

- [x] 6.5 **Integrate services with Redux**




- [x] 6.5.1 Create Redux slices for state management


  - Create instrumentSlice for instrument data state
  - Create routeSlice for route management state
  - Create aisSlice for AIS targets state
  - Create chartSlice for chart display state
  - Create navigationSlice for navigation state
  - Create settingsSlice for app settings state
  - _Requirements: All requirements_
  - _Status: Redux configured but not used_

- [x] 6.5.2 Connect services to Redux store


  - Update InstrumentService to dispatch to Redux
  - Update RouteService to use Redux state
  - Update AISService to dispatch to Redux
  - Create Redux middleware for async operations
  - Add Redux DevTools integration
  - _Requirements: All requirements_
  - _Status: Services operate independently of Redux_

- [x] 7. Implement chart manager and caching system


- [x] 7.1 Create ChartManager with tile loading


  - Implement chart tile request and caching logic
  - Add support for vector and raster tile formats
  - Create LRU cache eviction strategy
  - Implement tile storage in IndexedDB/AsyncStorage
  - _Requirements: 1.1, 1.3, 15.1, 15.5_

- [x] 7.2 Implement chart download and region caching

  - Add bulk chart download for selected regions
  - Implement download progress tracking
  - Create chart coverage management
  - _Requirements: 5.1, 5.3, 15.3_


- [x] 7.3 Implement chart update checking and management
  - Add chart edition date tracking
  - Implement update availability checking
  - Create chart update download and installation
  - _Requirements: 15.2, 15.4_


- [x] 7.4 Write integration tests for chart manager

  - Test tile caching and retrieval
  - Test offline chart access
  - Test chart update process
  - _Requirements: 1.3, 15.2, 15.3_

- [x] 8. Implement chart display component




- [x] 8.1 Create ChartDisplay component with Mapbox integration


  - Set up Mapbox GL / React Native Mapbox
  - Implement basic map rendering with zoom and pan
  - Add touch gesture handlers (pinch-to-zoom, pan, rotate)
  - Ensure 60 FPS performance on tablet hardware
  - _Requirements: 1.1, 6.2, 6.5_

- [x] 8.2 Implement vessel position and heading display


  - Add vessel icon with heading indicator
  - Implement position update with 1-second latency
  - Add north-up and heading-up rotation modes
  - _Requirements: 1.2, 1.5_

- [x] 8.3 Implement navigation aids and chart features rendering


  - Display buoys, beacons, and lighthouses from chart data
  - Add depth contours and hazard markers
  - Implement layer visibility controls
  - _Requirements: 1.4_

- [x] 8.4 Implement route and waypoint rendering


  - Display routes with course lines and waypoints
  - Add route information display (distance, ETA, course changes)
  - Implement waypoint interaction (tap to view details)
  - _Requirements: 2.4_

- [x] 8.5 Implement AIS target rendering


  - Display AIS vessel icons with heading indicators
  - Add vessel information display on tap
  - Implement visual highlighting for nearby targets
  - Show AIS target history trails
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 8.6 Write component tests for chart display


  - Test gesture handling and map interaction
  - Test rendering performance with multiple layers
  - Test position update latency
  - _Requirements: 1.1, 1.2, 6.2_

- [x] 9. Implement weather service and overlays





- [x] 9.1 Create WeatherService with API integration


  - Implement weather forecast API client
  - Add GRIB data parser for marine weather
  - Create weather data caching for offline access
  - _Requirements: 7.1, 7.4_

- [x] 9.2 Implement weather overlay rendering


  - Add wind, wave, and precipitation overlays to chart display
  - Implement weather data interpolation for smooth visualization
  - Create weather layer controls
  - _Requirements: 7.2_

- [x] 9.3 Implement weather alerts and warnings


  - Add weather alert fetching for navigation area
  - Display weather warnings on chart and in notifications
  - _Requirements: 7.5_

- [x] 9.4 Write integration tests for weather service


  - Test weather data fetching and caching
  - Test GRIB parsing with sample files
  - Test offline weather access
  - _Requirements: 7.1, 7.4_

- [x] 10. Implement track recording service




- [x] 10.1 Create TrackService with recording functionality

  - Implement track recording start/stop
  - Add automatic track point capture with 10-second intervals
  - Implement track statistics calculation (distance, speed)
  - _Requirements: 9.1, 9.2_

- [x] 10.2 Implement track display and management


  - Add track rendering on chart display with color coding
  - Create track list view with filtering
  - Implement track-to-route conversion
  - _Requirements: 9.3, 9.5_

- [x] 10.3 Implement track export functionality


  - Add GPX export for tracks
  - Implement track data compression for storage
  - _Requirements: 9.4_

- [x] 10.4 Write unit tests for track service


  - Test track recording and statistics
  - Test track export with GPX validation
  - Test track-to-route conversion
  - _Requirements: 9.1, 9.4, 9.5_

- [x] 11. Implement logbook service




- [x] 11.1 Create LogbookService with automatic voyage tracking


  - Implement automatic voyage start/end detection
  - Add voyage statistics calculation (distance, speed, duration)
  - Create logbook entry management
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 11.2 Implement logbook UI and export


  - Create logbook view with entry list
  - Add manual note entry functionality
  - Implement CSV export for logbook data
  - _Requirements: 13.3, 13.5_

- [x] 11.3 Write unit tests for logbook service


  - Test automatic voyage detection
  - Test statistics calculation
  - Test CSV export format
  - _Requirements: 13.1, 13.2, 13.5_

- [x] 12. Implement safety features




- [x] 12.1 Implement man overboard (MOB) function


  - Add MOB marker creation with 1-second position capture
  - Display MOB marker with high visibility on chart
  - Implement bearing and distance calculation to MOB position
  - Add navigation guidance back to MOB
  - Trigger audible alert on MOB activation
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 12.2 Implement anchor watch functionality


  - Add anchor watch activation with configurable radius (10-500m)
  - Implement position monitoring every 10 seconds
  - Display anchor watch circle on chart
  - Trigger audible alarm when vessel moves outside radius
  - Record anchor watch events with timestamps
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12.3 Write integration tests for safety features


  - Test MOB marker creation and navigation
  - Test anchor watch alarm triggering
  - Test position monitoring accuracy
  - _Requirements: 8.1, 8.2, 12.1, 12.2_

- [x] 13. Implement instrument data display panels




- [x] 13.1 Create InstrumentPanel component


  - Implement configurable instrument data panels
  - Add support for speed, depth, wind, heading displays
  - Create customizable panel layout system
  - _Requirements: 14.1, 14.2_

- [x] 13.2 Implement real-time data updates and unit conversion


  - Connect instrument panels to InstrumentService
  - Add 1-second update latency for instrument displays
  - Implement unit conversion (metric, imperial, nautical)
  - _Requirements: 14.3, 14.4_

- [x] 13.3 Implement instrument data alerts


  - Add configurable threshold alerts for instrument values
  - Display visual alerts when thresholds exceeded
  - _Requirements: 14.5_

- [x] 13.4 Write component tests for instrument panels


  - Test panel layout and customization
  - Test real-time data updates
  - Test unit conversion accuracy
  - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 14. Implement tide and current information




- [x] 14.1 Create TideService with data management


  - Implement tide prediction data loading
  - Add tide station lookup by location
  - Create current prediction data management
  - _Requirements: 11.1, 11.2, 11.5_

- [x] 14.2 Implement tide and current display


  - Display tide predictions for nearby stations
  - Show current direction arrows on chart
  - Add tide height display with 0.1m precision
  - Cache tide and current data for offline access
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 14.3 Write unit tests for tide service


  - Test tide prediction calculations
  - Test station lookup accuracy
  - Test offline data access
  - _Requirements: 11.1, 11.3, 11.4_

- [x] 15. Implement offline/online synchronization




- [x] 15.1 Create SyncManager with queue system


  - Implement operation queue for offline actions
  - Add automatic sync when connectivity restored
  - Create conflict resolution for data synchronization
  - _Requirements: 5.2, 5.5_

- [x] 15.2 Implement connectivity monitoring


  - Add network connectivity detection
  - Implement automatic mode switching between online/offline
  - Display connectivity status in UI
  - _Requirements: 5.2, 5.5_

- [x] 15.3 Write integration tests for sync manager


  - Test offline operation queuing
  - Test sync on connectivity restoration
  - Test conflict resolution
  - _Requirements: 5.2, 5.5_

- [x] 16. Implement settings and configuration




- [x] 16.1 Create SettingsService with persistence


  - Implement settings storage in database
  - Add default settings initialization
  - Create settings categories (display, units, alerts, connections)
  - _Requirements: 14.4, 6.3_

- [x] 16.2 Implement settings UI


  - Create settings screen with categorized options
  - Add unit preference selection (metric, imperial, nautical)
  - Implement chart display preferences (rotation, layers)
  - Add instrument connection configuration
  - _Requirements: 1.5, 14.4, 3.1, 3.2, 3.3_

- [x] 16.3 Write unit tests for settings service


  - Test settings persistence and retrieval
  - Test default settings initialization
  - _Requirements: 14.4_

- [x] 17. Implement route planner UI




- [x] 17.1 Create RoutePlanner component


  - Implement route creation interface with waypoint placement
  - Add waypoint editing and reordering
  - Display route information (distance, ETA, course)
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 17.2 Implement route list and management UI


  - Create route list view with filtering
  - Add route activation and deactivation
  - Implement route deletion with confirmation
  - _Requirements: 2.3_

- [x] 17.3 Write component tests for route planner


  - Test waypoint placement and editing
  - Test route calculation display
  - Test route list interactions
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 18. Implement tablet-specific optimizations




- [x] 18.1 Optimize UI for tablet screen sizes


  - Implement responsive layout for 7-13 inch screens
  - Add portrait and landscape orientation support
  - Optimize touch target sizes for finger interaction
  - _Requirements: 6.1, 6.3_

- [x] 18.2 Optimize performance for tablet hardware


  - Implement battery optimization (target 500mA/h consumption)
  - Optimize chart rendering for tablet GPUs
  - Reduce touch input latency below 100ms
  - _Requirements: 6.4, 6.5_

- [x] 18.3 Write performance tests for tablet optimization


  - Test rendering performance on target devices
  - Test battery consumption
  - Test touch input latency
  - _Requirements: 6.4, 6.5_

- [x] 19. Implement error handling and recovery




- [x] 19.1 Create ErrorHandler service


  - Implement NavigationError class with error codes and severity
  - Add error subscription system for UI notifications
  - Create error logging for debugging
  - _Requirements: All requirements depend on proper error handling_


- [x] 19.2 Implement recovery strategies

  - Add GPS signal loss recovery with dead reckoning
  - Implement automatic instrument reconnection
  - Add chart load failure fallback to lower resolution
  - Implement storage full automatic cleanup
  - _Requirements: 3.1, 3.2, 3.3, 1.3_


- [x] 19.3 Write integration tests for error handling

  - Test error detection and notification
  - Test recovery strategies
  - Test error logging
  - _Requirements: All requirements_

- [x] 20. Integration and end-to-end testing




- [x] 20.1 Implement end-to-end test scenarios


  - Test complete navigation workflow: create route → navigate → record track
  - Test offline mode: disconnect network → verify full functionality
  - Test instrument integration: connect stub → verify data display
  - Test emergency functions: MOB marker and anchor watch
  - _Requirements: All requirements_

- [x] 20.2 Implement performance testing


  - Test chart rendering at 60 FPS
  - Test position update processing within 100ms
  - Test AIS target handling with 100+ targets
  - Test database query performance
  - _Requirements: 1.2, 4.2, 6.5_

- [x] 21. Final integration and polish




- [x] 21.1 Integrate all components into main application


  - Wire up navigation between screens
  - Implement app initialization and startup sequence
  - Add splash screen and loading states
  - Connect all services to Redux store
  - _Requirements: All requirements_

- [x] 21.2 Implement app lifecycle management


  - Add proper cleanup on app termination
  - Implement background mode handling for track recording
  - Add state persistence and restoration
  - _Requirements: 9.1, 13.1_

- [x] 21.3 Polish UI and user experience


  - Refine touch interactions and gestures
  - Add loading indicators and progress feedback
  - Implement error messages and user guidance
  - Optimize animations and transitions
  - _Requirements: 6.2, 6.5_
