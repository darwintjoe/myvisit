import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {
  getSettings,
  saveSettings,
  defaultSettings,
} from '../utils/settingsStorage';

const SettingsScreen = ({navigation}) => {
  const [settings, setSettings] = useState({...defaultSettings});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const stored = await getSettings();
    setSettings(stored);
    setLoading(false);
  };

  const handleSave = async () => {
    // Validate inputs
    if (
      settings.dwellTimeThreshold < 1 ||
      settings.stopSpeedThreshold < 0 ||
      settings.moveSpeedThreshold < 0 ||
      settings.gpsDistanceFilter < 1
    ) {
      Alert.alert('Invalid Values', 'Please enter valid positive numbers.');
      return;
    }

    if (settings.stopSpeedThreshold >= settings.moveSpeedThreshold) {
      Alert.alert(
        'Invalid Thresholds',
        'Stop speed threshold must be less than move speed threshold.',
      );
      return;
    }

    const success = await saveSettings(settings);
    if (success) {
      Alert.alert('Success', 'Settings saved successfully!');
      navigation.goBack();
    } else {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  const handleReset = async () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset to defaults?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSettings({...defaultSettings});
            await saveSettings(defaultSettings);
          },
        },
      ],
    );
  };

  const updateSetting = (key, value) => {
    const numValue = parseFloat(value) || 0;
    setSettings(prev => ({...prev, [key]: numValue}));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Tracking Settings</Text>

      <View style={styles.settingRow}>
        <Text style={styles.label}>Dwell Time Threshold (minutes)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(settings.dwellTimeThreshold)}
          onChangeText={text => updateSetting('dwellTimeThreshold', text)}
        />
        <Text style={styles.description}>
          Time to wait before logging an auto-stop
        </Text>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.label}>Stop Speed Threshold (km/h)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(settings.stopSpeedThreshold)}
          onChangeText={text => updateSetting('stopSpeedThreshold', text)}
        />
        <Text style={styles.description}>
          Speed below which is considered stopped
        </Text>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.label}>Move Speed Threshold (km/h)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(settings.moveSpeedThreshold)}
          onChangeText={text => updateSetting('moveSpeedThreshold', text)}
        />
        <Text style={styles.description}>
          Speed above which is considered moving
        </Text>
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.label}>GPS Distance Filter (meters)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(settings.gpsDistanceFilter)}
          onChangeText={text => updateSetting('gpsDistanceFilter', text)}
        />
        <Text style={styles.description}>
          Minimum distance between background GPS pings
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.buttonText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 15,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
