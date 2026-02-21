import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { TrackServiceImpl } from '../services/TrackService';

interface TrackRecordingControlProps {
  onRecordingStart?: (trackId: string) => void;
  onRecordingStop?: () => void;
}

export const TrackRecordingControl: React.FC<TrackRecordingControlProps> = ({
  onRecordingStart,
  onRecordingStop
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [trackName, setTrackName] = useState('');
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const trackService = new TrackServiceImpl();

  const handleStartRecording = () => {
    setShowNameDialog(true);
    setTrackName(`Track ${new Date().toLocaleDateString()}`);
  };

  const confirmStartRecording = async () => {
    if (!trackName.trim()) {
      Alert.alert('Error', 'Please enter a track name');
      return;
    }

    try {
      const trackId = await trackService.startRecording(trackName.trim());
      setCurrentTrackId(trackId);
      setIsRecording(true);
      setShowNameDialog(false);
      onRecordingStart?.(trackId);
      Alert.alert('Recording Started', `Track "${trackName}" is now recording`);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start track recording');
    }
  };

  const handleStopRecording = async () => {
    Alert.alert(
      'Stop Recording',
      'Are you sure you want to stop recording this track?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'default',
          onPress: async () => {
            try {
              await trackService.stopRecording();
              setIsRecording(false);
              setCurrentTrackId(null);
              onRecordingStop?.();
              Alert.alert('Recording Stopped', 'Track has been saved');
            } catch (error) {
              console.error('Failed to stop recording:', error);
              Alert.alert('Error', 'Failed to stop track recording');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording ? styles.recordingButton : styles.idleButton
        ]}
        onPress={isRecording ? handleStopRecording : handleStartRecording}
      >
        <View style={[
          styles.recordIndicator,
          isRecording ? styles.recordingIndicator : styles.idleIndicator
        ]} />
        <Text style={styles.recordButtonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showNameDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start Track Recording</Text>
            
            <TextInput
              style={styles.input}
              value={trackName}
              onChangeText={setTrackName}
              placeholder="Enter track name"
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNameDialog(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmStartRecording}
              >
                <Text style={styles.confirmButtonText}>Start</Text>
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
    padding: 8
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  idleButton: {
    backgroundColor: '#4CAF50'
  },
  recordingButton: {
    backgroundColor: '#f44336'
  },
  recordIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  idleIndicator: {
    backgroundColor: '#fff'
  },
  recordingIndicator: {
    backgroundColor: '#fff',
    // Add animation in real implementation
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 24,
    width: '80%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 20
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    marginLeft: 8
  },
  cancelButton: {
    backgroundColor: '#f5f5f5'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButton: {
    backgroundColor: '#4CAF50'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
