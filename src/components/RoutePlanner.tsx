import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { RootState } from '../store';
import { Route, Waypoint, Position } from '../types';
import { RouteServiceImpl } from '../services/RouteService';

interface RoutePlannerProps {
  routeService: RouteServiceImpl;
  onRouteCreated?: (route: Route) => void;
  onClose?: () => void;
  initialPosition?: Position;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  routeService,
  onRouteCreated,
  onClose,
  initialPosition,
}) => {
  const dispatch = useDispatch();
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [routeName, setRouteName] = useState('New Route');
  const [editingWaypointId, setEditingWaypointId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Calculate route statistics
  const totalDistance = calculateTotalDistance(waypoints);
  const estimatedDuration = calculateEstimatedDuration(totalDistance);

  const handleAddWaypoint = useCallback(() => {
    const newWaypoint: Waypoint = {
      id: uuidv4(),
      position: initialPosition || {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        timestamp: Date.now(),
      },
      name: `Waypoint ${waypoints.length + 1}`,
      arrivalRadius: 50,
    };
    setWaypoints([...waypoints, newWaypoint]);
  }, [waypoints, initialPosition]);

  const handleRemoveWaypoint = useCallback(
    (waypointId: string) => {
      setWaypoints(waypoints.filter((wp) => wp.id !== waypointId));
    },
    [waypoints]
  );

  const handleUpdateWaypoint = useCallback(
    (waypointId: string, updates: Partial<Waypoint>) => {
      setWaypoints(
        waypoints.map((wp) =>
          wp.id === waypointId ? { ...wp, ...updates } : wp
        )
      );
    },
    [waypoints]
  );

  const handleMoveWaypointUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const newWaypoints = [...waypoints];
      [newWaypoints[index - 1], newWaypoints[index]] = [
        newWaypoints[index],
        newWaypoints[index - 1],
      ];
      setWaypoints(newWaypoints);
    },
    [waypoints]
  );

  const handleMoveWaypointDown = useCallback(
    (index: number) => {
      if (index === waypoints.length - 1) return;
      const newWaypoints = [...waypoints];
      [newWaypoints[index], newWaypoints[index + 1]] = [
        newWaypoints[index + 1],
        newWaypoints[index],
      ];
      setWaypoints(newWaypoints);
    },
    [waypoints]
  );

  const handleCreateRoute = useCallback(async () => {
    if (waypoints.length < 2) {
      Alert.alert('Invalid Route', 'A route must have at least 2 waypoints');
      return;
    }

    setIsCreating(true);
    try {
      // Update first waypoint name to route name if not customized
      const updatedWaypoints = waypoints.map((wp, index) => {
        if (index === 0 && wp.name.startsWith('Waypoint')) {
          return { ...wp, name: routeName };
        }
        return wp;
      });

      const route = await routeService.createRoute(updatedWaypoints);
      
      if (onRouteCreated) {
        onRouteCreated(route);
      }

      Alert.alert('Success', `Route "${routeName}" created successfully`);
      
      // Reset form
      setWaypoints([]);
      setRouteName('New Route');
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to create route: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsCreating(false);
    }
  }, [waypoints, routeName, routeService, onRouteCreated, onClose]);

  const handleCancel = useCallback(() => {
    if (waypoints.length > 0) {
      Alert.alert(
        'Discard Route?',
        'Are you sure you want to discard this route?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setWaypoints([]);
              setRouteName('New Route');
              if (onClose) {
                onClose();
              }
            },
          },
        ]
      );
    } else if (onClose) {
      onClose();
    }
  }, [waypoints, onClose]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Route Planner</Text>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.routeNameContainer}>
        <Text style={styles.label}>Route Name:</Text>
        <TextInput
          style={styles.input}
          value={routeName}
          onChangeText={setRouteName}
          placeholder="Enter route name"
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance:</Text>
          <Text style={styles.statValue}>{totalDistance.toFixed(1)} nm</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>ETA:</Text>
          <Text style={styles.statValue}>{formatDuration(estimatedDuration)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Waypoints:</Text>
          <Text style={styles.statValue}>{waypoints.length}</Text>
        </View>
      </View>

      <ScrollView style={styles.waypointsList}>
        {waypoints.map((waypoint, index) => (
          <WaypointItem
            key={waypoint.id}
            waypoint={waypoint}
            index={index}
            isFirst={index === 0}
            isLast={index === waypoints.length - 1}
            isEditing={editingWaypointId === waypoint.id}
            onEdit={() => setEditingWaypointId(waypoint.id)}
            onSave={() => setEditingWaypointId(null)}
            onUpdate={(updates) => handleUpdateWaypoint(waypoint.id, updates)}
            onRemove={() => handleRemoveWaypoint(waypoint.id)}
            onMoveUp={() => handleMoveWaypointUp(index)}
            onMoveDown={() => handleMoveWaypointDown(index)}
            nextWaypoint={waypoints[index + 1]}
          />
        ))}
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddWaypoint}
        >
          <Text style={styles.addButtonText}>+ Add Waypoint</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.createButton,
            (waypoints.length < 2 || isCreating) && styles.createButtonDisabled,
          ]}
          onPress={handleCreateRoute}
          disabled={waypoints.length < 2 || isCreating}
        >
          <Text style={styles.createButtonText}>
            {isCreating ? 'Creating...' : 'Create Route'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface WaypointItemProps {
  waypoint: Waypoint;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<Waypoint>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  nextWaypoint?: Waypoint;
}

const WaypointItem: React.FC<WaypointItemProps> = ({
  waypoint,
  index,
  isFirst,
  isLast,
  isEditing,
  onEdit,
  onSave,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  nextWaypoint,
}) => {
  const distance = nextWaypoint
    ? calculateDistance(waypoint.position, nextWaypoint.position)
    : 0;
  const bearing = nextWaypoint
    ? calculateBearing(waypoint.position, nextWaypoint.position)
    : 0;

  return (
    <View style={styles.waypointItem}>
      <View style={styles.waypointHeader}>
        <Text style={styles.waypointNumber}>{index + 1}</Text>
        {isEditing ? (
          <TextInput
            style={styles.waypointNameInput}
            value={waypoint.name}
            onChangeText={(text) => onUpdate({ name: text })}
            autoFocus
          />
        ) : (
          <Text style={styles.waypointName}>{waypoint.name}</Text>
        )}
        <View style={styles.waypointActions}>
          {!isFirst && (
            <TouchableOpacity onPress={onMoveUp} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>↑</Text>
            </TouchableOpacity>
          )}
          {!isLast && (
            <TouchableOpacity onPress={onMoveDown} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>↓</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={isEditing ? onSave : onEdit}
            style={styles.iconButton}
          >
            <Text style={styles.iconButtonText}>
              {isEditing ? '✓' : '✎'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={styles.iconButton}>
            <Text style={[styles.iconButtonText, styles.deleteButton]}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.waypointDetails}>
        <View style={styles.coordinatesRow}>
          {isEditing ? (
            <>
              <TextInput
                style={styles.coordinateInput}
                value={waypoint.position.latitude.toFixed(6)}
                onChangeText={(text) => {
                  const lat = parseFloat(text);
                  if (!isNaN(lat)) {
                    onUpdate({
                      position: { ...waypoint.position, latitude: lat },
                    });
                  }
                }}
                keyboardType="numeric"
                placeholder="Latitude"
              />
              <TextInput
                style={styles.coordinateInput}
                value={waypoint.position.longitude.toFixed(6)}
                onChangeText={(text) => {
                  const lon = parseFloat(text);
                  if (!isNaN(lon)) {
                    onUpdate({
                      position: { ...waypoint.position, longitude: lon },
                    });
                  }
                }}
                keyboardType="numeric"
                placeholder="Longitude"
              />
            </>
          ) : (
            <Text style={styles.coordinates}>
              {formatCoordinate(waypoint.position.latitude, 'lat')},{' '}
              {formatCoordinate(waypoint.position.longitude, 'lon')}
            </Text>
          )}
        </View>

        {!isLast && (
          <View style={styles.legInfo}>
            <Text style={styles.legInfoText}>
              → {distance.toFixed(1)} nm @ {bearing.toFixed(0)}°
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Helper functions
function calculateDistance(pos1: Position, pos2: Position): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = toRad(pos2.latitude - pos1.latitude);
  const dLon = toRad(pos2.longitude - pos1.longitude);
  const lat1 = toRad(pos1.latitude);
  const lat2 = toRad(pos2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateBearing(start: Position, end: Position): number {
  const lat1 = toRad(start.latitude);
  const lat2 = toRad(end.latitude);
  const dLon = toRad(end.longitude - start.longitude);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const bearing = Math.atan2(y, x);

  return ((bearing * 180) / Math.PI + 360) % 360;
}

function calculateTotalDistance(waypoints: Waypoint[]): number {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += calculateDistance(waypoints[i - 1].position, waypoints[i].position);
  }
  return total;
}

function calculateEstimatedDuration(distanceNm: number): number {
  const avgSpeedKnots = 5;
  return (distanceNm / avgSpeedKnots) * 3600; // seconds
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatCoordinate(value: number, type: 'lat' | 'lon'): string {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const direction =
    type === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${degrees}° ${minutes.toFixed(3)}' ${direction}`;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  routeNameContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  waypointsList: {
    flex: 1,
  },
  waypointItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  waypointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  waypointNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: 'bold',
    marginRight: 12,
  },
  waypointName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  waypointNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
    padding: 4,
  },
  waypointActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  iconButtonText: {
    fontSize: 18,
    color: '#007AFF',
  },
  deleteButton: {
    color: '#FF3B30',
  },
  waypointDetails: {
    marginLeft: 44,
  },
  coordinatesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coordinates: {
    fontSize: 14,
    color: '#666',
  },
  coordinateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  legInfo: {
    marginTop: 8,
  },
  legInfoText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  addButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  createButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#ccc',
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
