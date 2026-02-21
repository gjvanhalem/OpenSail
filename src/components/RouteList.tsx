import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { Route } from '../types';
import { RouteServiceImpl } from '../services/RouteService';
import { setRoutes } from '../store/slices/routeSlice';

interface RouteListProps {
  routeService: RouteServiceImpl;
  onRouteSelect?: (route: Route) => void;
  onCreateNew?: () => void;
}

export const RouteList: React.FC<RouteListProps> = ({
  routeService,
  onRouteSelect,
  onCreateNew,
}) => {
  const dispatch = useDispatch();
  const routes = useSelector((state: RootState) => state.route.routes);
  const activeRouteId = useSelector((state: RootState) => state.route.activeRouteId);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load routes on mount
  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = useCallback(async () => {
    setIsLoading(true);
    try {
      const allRoutes = await routeService.getAllRoutes();
      dispatch(setRoutes(allRoutes));
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to load routes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [routeService, dispatch]);

  const handleActivateRoute = useCallback(
    async (routeId: string) => {
      try {
        await routeService.setActiveRoute(routeId);
        Alert.alert('Success', 'Route activated');
      } catch (error) {
        Alert.alert(
          'Error',
          `Failed to activate route: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [routeService]
  );

  const handleDeactivateRoute = useCallback(async () => {
    try {
      await routeService.clearActiveRoute();
      Alert.alert('Success', 'Route deactivated');
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to deactivate route: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [routeService]);

  const handleDeleteRoute = useCallback(
    (route: Route) => {
      Alert.alert(
        'Delete Route',
        `Are you sure you want to delete "${route.name}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await routeService.deleteRoute(route.id);
                await loadRoutes();
                Alert.alert('Success', 'Route deleted');
              } catch (error) {
                Alert.alert(
                  'Error',
                  `Failed to delete route: ${error instanceof Error ? error.message : 'Unknown error'}`
                );
              }
            },
          },
        ]
      );
    },
    [routeService, loadRoutes]
  );

  const handleExportRoute = useCallback(
    async (route: Route, format: 'gpx' | 'kml') => {
      try {
        const data = await routeService.exportRoute(route.id, format);
        // In a real app, this would save to file system or share
        Alert.alert(
          'Export Successful',
          `Route exported as ${format.toUpperCase()}`
        );
      } catch (error) {
        Alert.alert(
          'Error',
          `Failed to export route: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [routeService]
  );

  // Filter routes based on search query
  const filteredRoutes = routes.filter((route) =>
    route.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderRouteItem = ({ item }: { item: Route }) => (
    <RouteListItem
      route={item}
      isActive={item.id === activeRouteId}
      onSelect={() => onRouteSelect?.(item)}
      onActivate={() => handleActivateRoute(item.id)}
      onDeactivate={handleDeactivateRoute}
      onDelete={() => handleDeleteRoute(item)}
      onExport={(format) => handleExportRoute(item, format)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Routes</Text>
        {onCreateNew && (
          <TouchableOpacity onPress={onCreateNew} style={styles.createButton}>
            <Text style={styles.createButtonText}>+ New Route</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search routes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading routes...</Text>
        </View>
      ) : filteredRoutes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No routes found' : 'No routes yet'}
          </Text>
          {!searchQuery && onCreateNew && (
            <TouchableOpacity
              onPress={onCreateNew}
              style={styles.emptyCreateButton}
            >
              <Text style={styles.emptyCreateButtonText}>Create your first route</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredRoutes}
          renderItem={renderRouteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

interface RouteListItemProps {
  route: Route;
  isActive: boolean;
  onSelect: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onExport: (format: 'gpx' | 'kml') => void;
}

const RouteListItem: React.FC<RouteListItemProps> = ({
  route,
  isActive,
  onSelect,
  onActivate,
  onDeactivate,
  onDelete,
  onExport,
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleExportMenu = () => {
    Alert.alert('Export Route', 'Choose export format:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'GPX', onPress: () => onExport('gpx') },
      { text: 'KML', onPress: () => onExport('kml') },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.routeItem, isActive && styles.routeItemActive]}
      onPress={onSelect}
      onLongPress={() => setShowActions(!showActions)}
    >
      <View style={styles.routeHeader}>
        <View style={styles.routeInfo}>
          <Text style={[styles.routeName, isActive && styles.routeNameActive]}>
            {route.name}
          </Text>
          {isActive && <Text style={styles.activeLabel}>ACTIVE</Text>}
        </View>
        <TouchableOpacity
          onPress={() => setShowActions(!showActions)}
          style={styles.menuButton}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.routeStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{route.totalDistance.toFixed(1)} nm</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Waypoints</Text>
          <Text style={styles.statValue}>{route.waypoints.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>ETA</Text>
          <Text style={styles.statValue}>
            {formatDuration(route.estimatedDuration)}
          </Text>
        </View>
      </View>

      <Text style={styles.routeDate}>
        Updated: {formatDate(route.updatedAt)}
      </Text>

      {showActions && (
        <View style={styles.actionsContainer}>
          {!isActive ? (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onActivate();
                setShowActions(false);
              }}
            >
              <Text style={styles.actionButtonText}>✓ Activate</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                onDeactivate();
                setShowActions(false);
              }}
            >
              <Text style={styles.actionButtonText}>○ Deactivate</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              handleExportMenu();
              setShowActions(false);
            }}
          >
            <Text style={styles.actionButtonText}>↗ Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteActionButton]}
            onPress={() => {
              onDelete();
              setShowActions(false);
            }}
          >
            <Text style={[styles.actionButtonText, styles.deleteActionText]}>
              ✕ Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString();
  }
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
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  emptyCreateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  emptyCreateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  routeItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  routeItemActive: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#F0F8FF',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  routeNameActive: {
    color: '#007AFF',
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  menuButton: {
    padding: 4,
  },
  menuButtonText: {
    fontSize: 24,
    color: '#666',
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  routeDate: {
    fontSize: 12,
    color: '#999',
  },
  actionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  deleteActionButton: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FFE0E0',
  },
  deleteActionText: {
    color: '#FF3B30',
  },
});
