# Route Planner UI Components

This directory contains the route planning and management UI components for the marine navigation system.

## Components

### RoutePlanner

A comprehensive route planning interface that allows users to create routes with multiple waypoints.

**Features:**
- Add, edit, and remove waypoints
- Reorder waypoints with up/down buttons
- Edit waypoint names and coordinates
- Real-time distance and bearing calculations between waypoints
- Display total route distance and estimated time of arrival (ETA)
- Validation to ensure routes have at least 2 waypoints
- Confirmation dialog when discarding unsaved routes

**Props:**
- `routeService`: RouteServiceImpl - Service for route operations
- `onRouteCreated?`: (route: Route) => void - Callback when route is created
- `onClose?`: () => void - Callback when planner is closed
- `initialPosition?`: Position - Initial position for new waypoints

**Usage:**
```tsx
import { RoutePlanner } from './components';
import { createRouteService } from './services/RouteService';

const routeService = createRouteService();

<RoutePlanner
  routeService={routeService}
  onRouteCreated={(route) => console.log('Route created:', route)}
  onClose={() => console.log('Planner closed')}
  initialPosition={currentPosition}
/>
```

### RouteList

A route management interface that displays all saved routes and provides actions for managing them.

**Features:**
- Display all routes with statistics (distance, waypoints, ETA)
- Search/filter routes by name
- Activate/deactivate routes for navigation
- Export routes in GPX or KML format
- Delete routes with confirmation
- Visual indication of active route
- Empty state with create button

**Props:**
- `routeService`: RouteServiceImpl - Service for route operations
- `onRouteSelect?`: (route: Route) => void - Callback when route is selected
- `onCreateNew?`: () => void - Callback to create new route

**Usage:**
```tsx
import { RouteList } from './components';
import { createRouteService } from './services/RouteService';

const routeService = createRouteService();

<RouteList
  routeService={routeService}
  onRouteSelect={(route) => console.log('Route selected:', route)}
  onCreateNew={() => console.log('Create new route')}
/>
```

## Integration with Redux

Both components integrate with the Redux store for state management:

- Routes are stored in `state.route.routes`
- Active route is tracked in `state.route.activeRouteId`
- Route validation results are stored in `state.route.routeValidation`
- Loading and error states are managed in Redux

## Testing

Comprehensive test suites are provided for both components:

- `RoutePlanner.test.tsx` - Tests for route creation, waypoint management, and validation
- `RouteList.test.tsx` - Tests for route display, filtering, activation, and deletion

Run tests with:
```bash
npm test -- RoutePlanner.test.tsx RouteList.test.tsx
```

## Requirements Satisfied

These components satisfy the following requirements from the design document:

**Requirement 2.1**: Route creation with multiple waypoints
- RoutePlanner allows creating routes with up to 50 waypoints
- Waypoints can be added, edited, and removed

**Requirement 2.2**: Distance and bearing calculations
- Real-time calculation of distance and bearing between waypoints
- Display of total route distance and ETA
- Calculations complete within 2 seconds

**Requirement 2.3**: Route persistence and management
- Routes saved to local storage via RouteService
- RouteList displays all saved routes
- Routes can be deleted with confirmation

**Requirement 2.4**: Route information display
- Total distance, ETA, and course information displayed
- Waypoint details shown with coordinates
- Leg information (distance and bearing) between waypoints

## Coordinate Format

Coordinates are displayed in degrees and decimal minutes format:
- Example: `52° 30.000' N, 4° 45.000' E`

## Distance Calculations

All distances are calculated using the Haversine formula and displayed in nautical miles (nm).

## Time Estimates

ETA calculations assume an average speed of 5 knots and are displayed in hours and minutes format.

## Styling

Components use React Native StyleSheet for styling with:
- Responsive layouts for tablet screens
- Touch-friendly button sizes
- Clear visual hierarchy
- Consistent color scheme (primary: #007AFF)
- Accessibility-compliant contrast ratios
