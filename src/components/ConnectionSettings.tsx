import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { SettingsService } from '../types';

interface ConnectionSettingsProps {
  service: SettingsService;
}

export const ConnectionSettings: React.FC<ConnectionSettingsProps> = ({ service }) => {
  const [autoSync, setAutoSync] = useState(true);
  const [instrumentProtocol, setInstrumentProtocol] = useState<'nmea0183' | 'nmea2000' | 'seatalk' | 'stub'>('stub');
  const [connectionType, setConnectionType] = useState<'serial' | 'network'>('network');
  const [serialPort, setSerialPort] = useState('/dev/ttyUSB0');
  const [networkHost, setNetworkHost] = useState('localhost');
  const [networkPort, setNetworkPort] = useState(10110);
  const [baudRate, setBaudRate] = useState(4800);
  const [autoReconnect, setAutoReconnect] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await service.getConnectionSettings();
    setAutoSync(settings.autoSync);
    setInstrumentProtocol(settings.instrumentProtocol);
    setConnectionType(settings.instrumentConnectionType);
    setSerialPort(settings.serialPort);
    setNetworkHost(settings.networkHost);
    setNetworkPort(settings.networkPort);
    setBaudRate(settings.baudRate);
    setAutoReconnect(settings.autoReconnect);
  };

  const handleAutoSyncToggle = async (value: boolean) => {
    setAutoSync(value);
    await service.setSetting('autoSync', value);
  };

  const handleProtocolChange = async (protocol: 'nmea0183' | 'nmea2000' | 'seatalk' | 'stub') => {
    setInstrumentProtocol(protocol);
    await service.setSetting('instrumentProtocol', protocol);
  };

  const handleConnectionTypeChange = async (type: 'serial' | 'network') => {
    setConnectionType(type);
    await service.setSetting('instrumentConnectionType', type);
  };

  const handleSerialPortChange = async (text: string) => {
    setSerialPort(text);
    await service.setSetting('serialPort', text);
  };

  const handleNetworkHostChange = async (text: string) => {
    setNetworkHost(text);
    await service.setSetting('networkHost', text);
  };

  const handleNetworkPortChange = async (text: string) => {
    const value = parseInt(text, 10);
    if (!isNaN(value) && value >= 1 && value <= 65535) {
      setNetworkPort(value);
      await service.setSetting('networkPort', value);
    }
  };

  const handleBaudRateChange = async (rate: number) => {
    setBaudRate(rate);
    await service.setSetting('baudRate', rate);
  };

  const handleAutoReconnectToggle = async (value: boolean) => {
    setAutoReconnect(value);
    await service.setSetting('autoReconnect', value);
  };

  const renderProtocolButton = (protocol: 'nmea0183' | 'nmea2000' | 'seatalk' | 'stub', label: string) => (
    <TouchableOpacity
      style={[styles.optionButton, instrumentProtocol === protocol && styles.selectedOption]}
      onPress={() => handleProtocolChange(protocol)}
    >
      <Text style={[styles.optionText, instrumentProtocol === protocol && styles.selectedOptionText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderConnectionTypeButton = (type: 'serial' | 'network', label: string) => (
    <TouchableOpacity
      style={[styles.optionButton, connectionType === type && styles.selectedOption]}
      onPress={() => handleConnectionTypeChange(type)}
    >
      <Text style={[styles.optionText, connectionType === type && styles.selectedOptionText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderBaudRateButton = (rate: number) => (
    <TouchableOpacity
      style={[styles.baudButton, baudRate === rate && styles.selectedOption]}
      onPress={() => handleBaudRateChange(rate)}
    >
      <Text style={[styles.optionText, baudRate === rate && styles.selectedOptionText]}>
        {rate}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Synchronization</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Auto Sync</Text>
          <Switch
            value={autoSync}
            onValueChange={handleAutoSyncToggle}
          />
        </View>
        <Text style={styles.helpText}>
          Automatically sync data when internet connection is available
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instrument Protocol</Text>
        <View style={styles.protocolGroup}>
          {renderProtocolButton('nmea0183', 'NMEA 0183')}
          {renderProtocolButton('nmea2000', 'NMEA 2000')}
        </View>
        <View style={styles.protocolGroup}>
          {renderProtocolButton('seatalk', 'SeaTalk')}
          {renderProtocolButton('stub', 'Simulator')}
        </View>
        <Text style={styles.helpText}>
          Select the protocol used by your marine instruments
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Type</Text>
        <View style={styles.optionGroup}>
          {renderConnectionTypeButton('serial', 'Serial')}
          {renderConnectionTypeButton('network', 'Network')}
        </View>
      </View>

      {connectionType === 'serial' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serial Connection</Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Serial Port</Text>
            <TextInput
              style={styles.input}
              value={serialPort}
              onChangeText={handleSerialPortChange}
              placeholder="/dev/ttyUSB0"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Baud Rate</Text>
            <View style={styles.baudRateGroup}>
              {renderBaudRateButton(4800)}
              {renderBaudRateButton(9600)}
              {renderBaudRateButton(38400)}
            </View>
          </View>
          <Text style={styles.helpText}>
            Standard NMEA 0183 uses 4800 baud
          </Text>
        </View>
      )}

      {connectionType === 'network' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Network Connection</Text>
          
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Host</Text>
            <TextInput
              style={styles.input}
              value={networkHost}
              onChangeText={handleNetworkHostChange}
              placeholder="localhost or IP address"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Port</Text>
            <TextInput
              style={styles.input}
              value={networkPort.toString()}
              onChangeText={handleNetworkPortChange}
              keyboardType="numeric"
              placeholder="10110"
            />
          </View>
          <Text style={styles.helpText}>
            Connect to instruments via TCP/IP network
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Options</Text>
        
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Auto Reconnect</Text>
          <Switch
            value={autoReconnect}
            onValueChange={handleAutoReconnectToggle}
          />
        </View>
        <Text style={styles.helpText}>
          Automatically reconnect if connection is lost (every 5 seconds)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333'
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1
  },
  protocolGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  optionGroup: {
    flexDirection: 'row',
    gap: 8
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  selectedOption: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3'
  },
  optionText: {
    fontSize: 14,
    color: '#666'
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  inputRow: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9'
  },
  baudRateGroup: {
    flexDirection: 'row',
    gap: 8
  },
  baudButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8
  }
});
