import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import { LogbookEntry, Voyage } from '../types';
import { LogbookServiceImpl } from '../services/LogbookService';

const logbookService = new LogbookServiceImpl();

export const LogbookView: React.FC = () => {
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVoyages();
  }, []);

  const loadVoyages = async () => {
    try {
      setLoading(true);
      const voyageList = await logbookService.getVoyages();
      setVoyages(voyageList);
    } catch (error) {
      console.error('Failed to load voyages:', error);
      Alert.alert('Error', 'Failed to load voyages');
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (voyageId: string) => {
    try {
      const voyageEntries = await logbookService.getEntries({ voyageId });
      setEntries(voyageEntries);
    } catch (error) {
      console.error('Failed to load entries:', error);
      Alert.alert('Error', 'Failed to load logbook entries');
    }
  };

  const handleVoyageSelect = async (voyage: Voyage) => {
    setSelectedVoyage(voyage);
    await loadEntries(voyage.id);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      await logbookService.addNoteEntry(noteText);
      setNoteText('');
      setShowNoteModal(false);
      
      // Reload entries if viewing a voyage
      if (selectedVoyage) {
        await loadEntries(selectedVoyage.id);
      }
      
      Alert.alert('Success', 'Note added to logbook');
    } catch (error) {
      console.error('Failed to add note:', error);
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = await logbookService.exportLogbook('csv');
      // In a real app, this would save to file system or share
      console.log('CSV Export:', csv);
      Alert.alert('Success', 'Logbook exported to CSV');
    } catch (error) {
      console.error('Failed to export:', error);
      Alert.alert('Error', 'Failed to export logbook');
    }
  };

  const formatDuration = (startTime: Date, endTime?: Date): string => {
    const end = endTime || new Date();
    const durationMs = end.getTime() - startTime.getTime();
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const renderVoyageItem = ({ item }: { item: Voyage }) => (
    <TouchableOpacity
      style={[
        styles.voyageItem,
        selectedVoyage?.id === item.id && styles.selectedVoyage
      ]}
      onPress={() => handleVoyageSelect(item)}
    >
      <View style={styles.voyageHeader}>
        <Text style={styles.voyageDate}>
          {item.startTime.toLocaleDateString()} {item.startTime.toLocaleTimeString()}
        </Text>
        {!item.endTime && (
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        )}
      </View>
      
      <View style={styles.voyageStats}>
        <Text style={styles.statText}>
          Duration: {formatDuration(item.startTime, item.endTime)}
        </Text>
        {item.distance !== undefined && (
          <Text style={styles.statText}>
            Distance: {item.distance.toFixed(1)} nm
          </Text>
        )}
        {item.avgSpeed !== undefined && (
          <Text style={styles.statText}>
            Avg Speed: {item.avgSpeed.toFixed(1)} kn
          </Text>
        )}
        {item.maxSpeed !== undefined && (
          <Text style={styles.statText}>
            Max Speed: {item.maxSpeed.toFixed(1)} kn
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEntryItem = ({ item }: { item: LogbookEntry }) => (
    <View style={styles.entryItem}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.entryTime}>
          {item.timestamp.toLocaleTimeString()}
        </Text>
      </View>
      
      {item.position && (
        <Text style={styles.entryPosition}>
          {item.position.latitude.toFixed(6)}°, {item.position.longitude.toFixed(6)}°
        </Text>
      )}
      
      {item.notes && (
        <Text style={styles.entryNotes}>{item.notes}</Text>
      )}
      
      {item.distance !== undefined && (
        <Text style={styles.entryStats}>
          Distance: {item.distance.toFixed(1)} nm
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Logbook</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowNoteModal(true)}
          >
            <Text style={styles.buttonText}>Add Note</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={handleExportCSV}
          >
            <Text style={styles.buttonText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.voyageList}>
          <Text style={styles.sectionTitle}>Voyages</Text>
          <FlatList
            data={voyages}
            renderItem={renderVoyageItem}
            keyExtractor={(item) => item.id}
            refreshing={loading}
            onRefresh={loadVoyages}
          />
        </View>

        <View style={styles.entryList}>
          <Text style={styles.sectionTitle}>
            {selectedVoyage ? 'Voyage Entries' : 'Select a voyage'}
          </Text>
          {selectedVoyage && (
            <FlatList
              data={entries}
              renderItem={renderEntryItem}
              keyExtractor={(item) => item.id}
            />
          )}
        </View>
      </View>

      <Modal
        visible={showNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Logbook Note</Text>
            
            <TextInput
              style={styles.noteInput}
              multiline
              numberOfLines={4}
              placeholder="Enter your note..."
              value={noteText}
              onChangeText={setNoteText}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setNoteText('');
                  setShowNoteModal(false);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={handleAddNote}
              >
                <Text style={styles.buttonText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  voyageList: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    backgroundColor: '#fff',
  },
  entryList: {
    flex: 2,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  voyageItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedVoyage: {
    backgroundColor: '#e3f2fd',
  },
  voyageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  voyageDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  voyageStats: {
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  entryItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  entryTime: {
    fontSize: 12,
    color: '#666',
  },
  entryPosition: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  entryNotes: {
    fontSize: 14,
    marginBottom: 4,
  },
  entryStats: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#999',
  },
});
