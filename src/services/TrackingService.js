import BackgroundGeolocation from 'react-native-background-geolocation';
import ActivityRecognition from 'react-native-activity-recognition';
import {getSettings} from '../utils/settingsStorage';
import database from '../db';
import {Q} from '@nozbe/watermelondb';

// State Machine States
export const STATES = {
  IDLE: 'IDLE',
  TRACKING: 'TRACKING',
  AUTO_STOPPED: 'AUTO_STOPPED',
  MANUAL_PAUSED: 'MANUAL_PAUSED',
};

// Event Types
export const EVENT_TYPES = {
  GPS_PING: 'GPS_PING',
  AUTO_VISIT_START: 'AUTO_VISIT_START',
  AUTO_VISIT_END: 'AUTO_VISIT_END',
  MANUAL_VISIT_START: 'MANUAL_VISIT_START',
  MANUAL_VISIT_END: 'MANUAL_VISIT_END',
  SHIFT_START: 'SHIFT_START',
  SHIFT_END: 'SHIFT_END',
};

class TrackingService {
  constructor() {
    this.currentState = STATES.IDLE;
    this.activeShift = null;
    this.stopStartTime = null;
    this.settings = null;
    this.locationSubscription = null;
    this.activitySubscription = null;
    this.currentActivity = 'unknown';
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Load settings
    this.settings = await getSettings();

    // Configure background geolocation
    await BackgroundGeolocation.ready({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: this.settings.gpsDistanceFilter,
      stopOnTerminate: false,
      startOnBoot: true,
      foregroundService: true,
      notificationTitle: 'MyVisit Tracking',
      notificationText: 'Tracking your location for work shifts',
      debug: __DEV__,
      logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
      stationaryRadius: 25,
      activityRecognitionInterval: 10000,
      deferTime: 0,
    });

    this.isInitialized = true;
  }

  async updateSettings() {
    this.settings = await getSettings();

    if (this.isInitialized && this.currentState !== STATES.IDLE) {
      // Reconfigure with new settings
      await BackgroundGeolocation.setConfig({
        distanceFilter: this.settings.gpsDistanceFilter,
      });
    }
  }

  async startShift() {
    try {
      await database.write(async () => {
        const newShift = await database.get('shifts').create(newShiftRecord => {
          newShiftRecord.startTime = Date.now();
          newShiftRecord.currentState = STATES.TRACKING;
        });

        this.activeShift = newShift;
        this.currentState = STATES.TRACKING;

        // Log shift start event
        await this.logEvent(EVENT_TYPES.SHIFT_START);
      });

      // Start background tracking
      await this.startTracking();

      return this.activeShift;
    } catch (error) {
      console.error('Error starting shift:', error);
      throw error;
    }
  }

  async startTracking() {
    await this.initialize();

    // Start activity recognition
    this.startActivityRecognition();

    // Start location tracking
    this.locationSubscription = BackgroundGeolocation.onLocation(
      async location => {
        await this.handleLocationUpdate(location);
      },
      error => {
        console.error('[BackgroundGeolocation] ERROR:', error);
      },
    );

    // Start the tracker
    await BackgroundGeolocation.start();
  }

  startActivityRecognition() {
    const interval = setInterval(async () => {
      try {
        const activities = await ActivityRecognition.getActivityRecognition();
        if (activities && activities.length > 0) {
          // Get the most confident activity
          const topActivity = activities.reduce((prev, current) =>
            prev.confidence > current.confidence ? prev : current,
          );
          this.currentActivity = this.mapActivity(topActivity.type);
        }
      } catch (error) {
        console.error('Activity recognition error:', error);
      }
    }, 5000); // Check every 5 seconds

    this.activitySubscription = {remove: () => clearInterval(interval)};
  }

  mapActivity(activityType) {
    const activityMap = {
      IN_VEHICLE: 'driving',
      ON_BICYCLE: 'cycling',
      ON_FOOT: 'walking',
      RUNNING: 'running',
      STANDING: 'standing',
      TILTING: 'tilting',
      WALKING: 'walking',
      UNKNOWN: 'unknown',
    };
    return activityMap[activityType] || 'unknown';
  }

  async handleLocationUpdate(location) {
    if (!this.activeShift || this.currentState === STATES.IDLE) {
      return;
    }

    const speed = location.coords.speed * 3.6; // Convert m/s to km/h
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;

    // Log GPS ping
    await this.logEvent(EVENT_TYPES.GPS_PING, lat, lng, speed);

    // Auto-detection logic
    if (this.currentState === STATES.TRACKING) {
      await this.checkForAutoStop(speed, lat, lng);
    } else if (this.currentState === STATES.AUTO_STOPPED) {
      await this.checkForAutoStart(speed, lat, lng);
    }
  }

  async checkForAutoStop(speed, lat, lng) {
    const {stopSpeedThreshold, dwellTimeThreshold} = this.settings;

    if (speed < stopSpeedThreshold && this.currentActivity !== 'driving') {
      if (!this.stopStartTime) {
        this.stopStartTime = Date.now();
      } else {
        const elapsedMinutes = (Date.now() - this.stopStartTime) / 60000;

        if (elapsedMinutes >= dwellTimeThreshold) {
          // Auto-stop detected
          await this.logEvent(EVENT_TYPES.AUTO_VISIT_START, lat, lng, speed);
          this.currentState = STATES.AUTO_STOPPED;
          this.stopStartTime = null;
        }
      }
    } else {
      // Reset stop timer if moving again
      this.stopStartTime = null;
    }
  }

  async checkForAutoStart(speed, lat, lng) {
    const {moveSpeedThreshold} = this.settings;

    if (speed > moveSpeedThreshold) {
      // Auto-start detected
      await this.logEvent(EVENT_TYPES.AUTO_VISIT_END, lat, lng, speed);
      this.currentState = STATES.TRACKING;
      this.stopStartTime = null;
    }
  }

  async manualStop(lat, lng, speed) {
    // Force a manual visit start (bypassing dwell time)
    await this.logEvent(EVENT_TYPES.MANUAL_VISIT_START, lat, lng, speed);
    this.currentState = STATES.MANUAL_PAUSED;
    this.stopStartTime = null;
  }

  async manualStart(lat, lng, speed) {
    // Force a manual visit end
    await this.logEvent(EVENT_TYPES.MANUAL_VISIT_END, lat, lng, speed);
    this.currentState = STATES.TRACKING;
  }

  async endShift() {
    try {
      // Stop tracking
      await this.stopTracking();

      // Update shift record
      await database.write(async () => {
        await this.activeShift.update(shift => {
          shift.endTime = Date.now();
          shift.currentState = STATES.IDLE;
        });

        // Log shift end event
        await this.logEvent(EVENT_TYPES.SHIFT_END);

        this.activeShift = null;
        this.currentState = STATES.IDLE;
        this.stopStartTime = null;
      });

      return true;
    } catch (error) {
      console.error('Error ending shift:', error);
      throw error;
    }
  }

  async stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    if (this.activitySubscription) {
      this.activitySubscription.remove();
      this.activitySubscription = null;
    }

    await BackgroundGeolocation.stop();
  }

  async logEvent(eventType, lat = null, lng = null, speed = null) {
    if (!this.activeShift) {
      return;
    }

    await database.write(async () => {
      await database.get('events').create(event => {
        event.shiftId = this.activeShift.id;
        event.timestamp = Date.now();
        event.lat = lat;
        event.lng = lng;
        event.speed = speed;
        event.activityType = this.currentActivity;
        event.eventType = eventType;
      });
    });
  }

  getCurrentState() {
    return this.currentState;
  }

  getActiveShift() {
    return this.activeShift;
  }

  async getShiftEvents(shiftId) {
    const events = await database
      .get('events')
      .query(Q.where('shift_id', shiftId))
      .fetch();

    return events.map(e => ({
      id: e.id,
      shiftId: e.shiftId,
      timestamp: e.timestamp,
      lat: e.lat,
      lng: e.lng,
      speed: e.speed,
      activityType: e.activityType,
      eventType: e.eventType,
    }));
  }

  async exportData() {
    if (!this.activeShift) {
      throw new Error('No active shift');
    }

    const events = await this.getShiftEvents(this.activeShift.id);
    return JSON.stringify(events, null, 2);
  }
}

// Singleton instance
export const trackingService = new TrackingService();
export default trackingService;
