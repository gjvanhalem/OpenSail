import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Share
} from 'react-native';
import { Track } from '../types';
import { TrackServiceImpl } from '../services/TrackService';

interface TrackExportDialogProps {
  visible: boolean;
  track: Track | null;
  onClose: () => void;
}

export const TrackExportDialog: React.FC<TrackExportDialogProps> = ({
  visible,
  track,
  onClose
}) => {
  const [exporting, setExporting] = useState(false);
  const trackService = new TrackServiceImpl();

  const handleExport = async (format: 'gpx' | 'kml') => {
    if (!track) return;

    try {
      setExporting(true);
      const exportData = await trackService.exportTrack(track.id, format);
      
      // Use Share API to allow user to save or share the file
      const fileName = `${track.name.replace(/[^a-z0-9]/gi, '_')}.${format}`;
      
      await Share.share({
        message: exportData,
        title: `Export ${track.name}`,
      });

      Alert.alert('Success', `Track exported as ${format.toUpperCase()}`);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export track');
    } finally {
      setExporting(false);
    }
  };

  if (!track) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Export Track</Text>
          <Text style={styles.trackName}>{track.name}</Text>

          <View style={styles.info}>
            <Text style={styles.infoText}>
              Points: {track.points.length}
            </Text>
            <Text style={styles.infoText}>
              Distance: {track.distance.toFixed(2)} nm
            </Text>
            <Text style={styles.infoText}>
              Duration: {formatDuration(track.startTime, track.endTime)}
            </Text>
          </View>

          <Text style={styles.formatLabel}>Select Format:</Text>

          <TouchableOpacity
            style={styles.formatButton}
            onPress={() => handleExport('gpx')}
            disabled={exporting}
          >
            <Text style={styles.formatButtonText}>GPX Format</Text>
            <Text style={styles.formatDescription}>
              GPS Exchange Format - Compatible with most navigation software
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.formatButton}
            onPress={() => handleExport('kml')}
            disabled={exporting}
          >
            <Text style={styles.formatButtonText}>KML Format</Text>
            <Text style={styles.formatDescription}>
              Keyhole Markup Language - Compatible with Google Earth
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={exporting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          {exporting && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>Exporting...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const formatDuration = (start: Date, end: Date): string => {
  const durationMs = end.getTime() - start.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    width: '85%',
    maxWidth: 500
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  trackName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16
  },
  info: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4
  },
  formatLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  formatButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 4,
    marginBottom: 12
  },
  formatButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  formatDescription: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600'
  }
});
