import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import trackingService, {STATES} from '../services/TrackingService';

const LONG_PRESS_DURATION = 2000; // 2 seconds for long press

const MainScreen = ({navigation}) => {
  const [currentState, setCurrentState] = useState(STATES.IDLE);
  const [activeShift, setActiveShift] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for any existing active shift on mount
    checkActiveShift();

    // Cleanup on unmount
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkActiveShift = async () => {
    try {
      const state = trackingService.getCurrentState();
      const shift = trackingService.getActiveShift();

      if (shift && state !== STATES.IDLE) {
        setCurrentState(state);
        setActiveShift(shift);
      }
    } catch (error) {
      console.error('Error checking active shift:', error);
    }
  };

  const handlePressIn = () => {
    if (loading) {
      return;
    }

    const timer = setTimeout(() => {
      setIsLongPressing(true);
      handleLongPress();
    }, LONG_PRESS_DURATION);

    setLongPressTimer(timer);
  };

  const handlePressOut = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!isLongPressing && !loading) {
      handleShortPress();
    }

    setIsLongPressing(false);
  };

  const handleShortPress = () => {
    switch (currentState) {
      case STATES.TRACKING:
        confirmManualStop();
        break;
      case STATES.MANUAL_PAUSED:
      case STATES.AUTO_STOPPED:
        performManualStart();
        break;
      default:
        break;
    }
  };

  const handleLongPress = () => {
    switch (currentState) {
      case STATES.IDLE:
        confirmStartShift();
        break;
      case STATES.TRACKING:
      case STATES.MANUAL_PAUSED:
      case STATES.AUTO_STOPPED:
        confirmEndShift();
        break;
      default:
        break;
    }
  };

  const confirmStartShift = () => {
    Alert.alert(
      'Start Shift',
      'Are you sure you want to start tracking your shift?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Start',
          style: 'default',
          onPress: performStartShift,
        },
      ],
    );
  };

  const performStartShift = async () => {
    setLoading(true);
    try {
      const shift = await trackingService.startShift();
      setActiveShift(shift);
      setCurrentState(STATES.TRACKING);
    } catch (error) {
      Alert.alert('Error', 'Failed to start shift: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const confirmManualStop = () => {
    Alert.alert('Manual Stop', 'Force a visit start (bypass auto-detection)?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Stop',
        style: 'default',
        onPress: performManualStop,
      },
    ]);
  };

  const performManualStop = async () => {
    setLoading(true);
    try {
      // Get current location for the event
      await trackingService.manualStop(null, null, null);
      setCurrentState(STATES.MANUAL_PAUSED);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const performManualStart = async () => {
    setLoading(true);
    try {
      await trackingService.manualStart(null, null, null);
      setCurrentState(STATES.TRACKING);
    } catch (error) {
      Alert.alert('Error', 'Failed to start: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const confirmEndShift = () => {
    Alert.alert(
      'End Shift',
      'Are you sure you want to end this shift? This will stop all tracking.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'End Shift',
          style: 'destructive',
          onPress: performEndShift,
        },
      ],
    );
  };

  const performEndShift = async () => {
    setLoading(true);
    try {
      await trackingService.endShift();
      setActiveShift(null);
      setCurrentState(STATES.IDLE);
      Alert.alert('Shift Ended', 'Your shift has been successfully ended.');
    } catch (error) {
      Alert.alert('Error', 'Failed to end shift: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const jsonData = await trackingService.exportData();

      const fileName = `myvisit_export_${Date.now()}.json`;
      const filePath = Platform.select({
        ios: `${RNFS.DocumentDirectoryPath}/${fileName}`,
        android: `${RNFS.ExternalDirectoryPath}/${fileName}`,
      });

      await RNFS.writeFile(filePath, jsonData, 'utf8');

      Alert.alert(
        'Data Exported',
        `Data saved to:\n${filePath}\n\nYou can now share or analyze this file.`,
        [{text: 'OK'}],
      );
    } catch (error) {
      Alert.alert('Export Error', 'Failed to export data: ' + error.message);
      console.error(error);
    }
  };

  const getStateInfo = () => {
    switch (currentState) {
      case STATES.IDLE:
        return {
          title: 'IDLE',
          subtitle: 'Long press to start shift',
          color: '#6C757D',
          backgroundColor: '#F8F9FA',
        };
      case STATES.TRACKING:
        return {
          title: 'TRACKING',
          subtitle: 'Auto-detecting visits • Short press to manually stop',
          color: '#28A745',
          backgroundColor: '#D4EDDA',
        };
      case STATES.AUTO_STOPPED:
        return {
          title: 'AUTO-STOPPED',
          subtitle: 'Visit detected • Moving will auto-resume',
          color: '#FFC107',
          backgroundColor: '#FFF3CD',
        };
      case STATES.MANUAL_PAUSED:
        return {
          title: 'PAUSED',
          subtitle: 'Manual stop • Short press to resume',
          color: '#FD7E14',
          backgroundColor: '#FFE5D0',
        };
      default:
        return {
          title: 'UNKNOWN',
          subtitle: '',
          color: '#6C757D',
          backgroundColor: '#F8F9FA',
        };
    }
  };

  const stateInfo = getStateInfo();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>MyVisit</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.statusContainer,
          {backgroundColor: stateInfo.backgroundColor},
        ]}>
        <Text style={[styles.stateTitle, {color: stateInfo.color}]}>
          {stateInfo.title}
        </Text>
        <Text style={[styles.stateSubtitle, {color: stateInfo.color}]}>
          {stateInfo.subtitle}
        </Text>
      </View>

      {activeShift && (
        <View style={styles.shiftInfo}>
          <Text style={styles.shiftInfoText}>
            Shift Started: {new Date(activeShift.startTime).toLocaleString()}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            {backgroundColor: stateInfo.color},
            loading && styles.buttonDisabled,
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={loading}
          activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.mainButtonText}>
              {currentState === STATES.IDLE
                ? 'Hold to Start Shift'
                : currentState === STATES.TRACKING
                ? 'Tracking...'
                : currentState === STATES.AUTO_STOPPED
                ? 'Auto-Stopped'
                : 'Paused'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {activeShift && (
        <TouchableOpacity
          style={styles.exportButton}
          onPress={handleExportData}>
          <Text style={styles.exportButtonText}>📊 Export Shift Data</Text>
        </TouchableOpacity>
      )}

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>Instructions:</Text>
        <Text style={styles.instructionItem}>
          • Long Press (2s) from IDLE: Start Shift
        </Text>
        <Text style={styles.instructionItem}>
          • Short Press while TRACKING: Manual Stop (force visit)
        </Text>
        <Text style={styles.instructionItem}>
          • Short Press while PAUSED: Resume Tracking
        </Text>
        <Text style={styles.instructionItem}>
          • Long Press (2s) while active: End Shift
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 10,
  },
  settingsButtonText: {
    fontSize: 24,
  },
  statusContainer: {
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  stateTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  shiftInfo: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  shiftInfoText: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButton: {
    width: 250,
    height: 250,
    borderRadius: 125,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  mainButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  exportButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    borderTopWidth: 3,
    borderTopColor: '#007AFF',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  instructionItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
    lineHeight: 18,
  },
});

export default MainScreen;
