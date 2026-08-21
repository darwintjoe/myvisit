# MyVisit - Phase 1 Implementation Guide

## Strava-like Attendance and Tracking App for Field Workers

This document provides the complete implementation for Phase 1 (MVP Core Engine) of MyVisit.

---

## 1. Project Initialization Commands

```bash
# Initialize React Native project (CLI, not Expo)
npx @react-native-community/cli init MyVisit --version 0.73.0 --skip-install
cd MyVisit
npm install

# Install core dependencies
npm install @nozbe/watermelondb @react-native-async-storage/async-storage
npm install react-native-background-geolocation react-native-activity-recognition
npm install react-native-fs

# Install navigation dependencies
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context

# iOS: Install pods
cd ios && pod install && cd ..

# Android: No additional steps needed (dependencies are included)
```

---

## 2. WatermelonDB Schema Definition

**File: `src/db/schema.js`**
```javascript
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'shifts',
      columns: [
        { name: 'start_time', type: 'number' },
        { name: 'end_time', type: 'number', isOptional: true },
        { name: 'current_state', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'events',
      columns: [
        { name: 'shift_id', type: 'string' },
        { name: 'timestamp', type: 'number' },
        { name: 'lat', type: 'number', isOptional: true },
        { name: 'lng', type: 'number', isOptional: true },
        { name: 'speed', type: 'number', isOptional: true },
        { name: 'activity_type', type: 'string', isOptional: true },
        { name: 'event_type', type: 'string' },
      ],
    }),
  ],
});
```

**File: `src/db/models.js`**
```javascript
import { Model } from '@nozbe/watermelondb';
import { field, children } from '@nozbe/watermelondb/decorators';

export class Shift extends Model {
  static table = 'shifts';

  static associations = {
    events: { type: 'has_many', foreignKey: 'shift_id' },
  };

  @field('start_time') startTime;
  @field('end_time') endTime;
  @field('current_state') currentState;

  @children('events') events;
}

export class Event extends Model {
  static table = 'events';

  static associations = {
    shift: { type: 'belongs_to', key: 'shift_id' },
  };

  @field('shift_id') shiftId;
  @field('timestamp') timestamp;
  @field('lat') lat;
  @field('lng') lng;
  @field('speed') speed;
  @field('activity_type') activityType;
  @field('event_type') eventType;
}
```

---

## 3. Settings Storage & Screen Logic

### Settings Storage Utility (`src/utils/settingsStorage.js`)

Stores dynamic tracking settings in AsyncStorage:
- `dwellTimeThreshold` (default: 15 minutes)
- `stopSpeedThreshold` (default: 1 km/h)
- `moveSpeedThreshold` (default: 5 km/h)
- `gpsDistanceFilter` (default: 10 meters)

### Settings Screen (`src/screens/SettingsScreen.js`)

Features:
- Real-time editing of all tracking parameters
- Input validation (e.g., stop threshold < move threshold)
- Save/Reset functionality
- Stored locally via AsyncStorage

---

## 4. Background Tracking Service (`src/services/TrackingService.js`)

### Key Features:

**State Machine States:**
- `IDLE` - No active shift
- `TRACKING` - Auto-detecting movement and stops
- `AUTO_STOPPED` - Auto-detected visit in progress
- `MANUAL_PAUSED` - User-forced stop

**Auto-Detection Logic:**
```javascript
// Auto-stop: speed < stopSpeedThreshold for dwellTimeThreshold minutes
if (speed < stopSpeedThreshold && activity !== 'driving') {
  if (elapsedTime >= dwellTimeThreshold) {
    log AUTO_VISIT_START;
    state = AUTO_STOPPED;
  }
}

// Auto-start: speed > moveSpeedThreshold
if (speed > moveSpeedThreshold) {
  log AUTO_VISIT_END;
  state = TRACKING;
}
```

**Background Execution:**
- Uses `react-native-background-geolocation` with foreground service
- Persistent notification prevents OS from killing the app
- Activity recognition runs every 5 seconds
- Location updates respect the GPS distance filter setting

---

## 5. Main App UI - Single Button State Machine (`src/screens/MainScreen.js`)

### Interaction Logic:

| Current State | Action | Result |
|--------------|--------|--------|
| IDLE | Long Press (2s) | Start Shift → TRACKING |
| TRACKING | Short Press | Manual Stop → MANUAL_PAUSED |
| MANUAL_PAUSED | Short Press | Resume → TRACKING |
| AUTO_STOPPED | Short Press | Resume → TRACKING |
| TRACKING/PAUSED/AUTO_STOPPED | Long Press (2s) | End Shift → IDLE |

### UI Components:
- Large circular button (250x250) showing current state
- Status banner with color-coded state indication
- Shift start time display
- Export Data button (visible during active shifts)
- Instructions panel

---

## 6. Data Export Feature

The "Export Shift Data" button:
1. Queries all events for the active shift from WatermelonDB
2. Formats as JSON array
3. Saves to device storage using `react-native-fs`
4. Shows file path for sharing/debugging

**Export Format:**
```json
[
  {
    "id": "event_id",
    "shiftId": "shift_id",
    "timestamp": 1699900000000,
    "lat": 40.7128,
    "lng": -74.0060,
    "speed": 0.5,
    "activityType": "walking",
    "eventType": "GPS_PING"
  }
]
```

---

## 7. File Structure

```
MyVisit/
├── App.tsx                          # Main app with navigation
├── src/
│   ├── db/
│   │   ├── schema.js                # WatermelonDB schema
│   │   ├── models.js                # Shift & Event models
│   │   └── index.js                 # Database initialization
│   ├── services/
│   │   └── TrackingService.js       # Background tracking engine
│   ├── screens/
│   │   ├── MainScreen.js            # Single-button UI
│   │   └── SettingsScreen.js        # Settings configuration
│   └── utils/
│       └── settingsStorage.js       # AsyncStorage wrapper
└── package.json
```

---

## 8. Android Configuration (Important!)

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

---

## 9. iOS Configuration (Important!)

Add to `ios/MyVisit/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>MyVisit needs location access to track your work shifts</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>MyVisit needs background location access to track visits</string>
<key>NSMotionUsageDescription</key>
<string>MyVisit needs activity recognition to detect stops</string>
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
  <string>com.transistorsoft.fetch</string>
  <string>com.transistorsoft.locationchange</string>
</array>
```

---

## 10. Testing the Implementation

1. **Start the app:**
   ```bash
   npx react-native run-android  # or run-ios
   ```

2. **Configure settings:**
   - Tap ⚙️ Settings
   - Adjust thresholds as needed
   - Save settings

3. **Test state machine:**
   - Long press to start shift
   - Walk around (TRACKING state)
   - Stop for 15+ minutes (AUTO_STOPPED state)
   - Short press to manually pause/resume
   - Long press to end shift

4. **Export data:**
   - During active shift, tap "Export Shift Data"
   - Find the JSON file at the displayed path
   - Import into mapping tool for visualization

---

## Notes for Phase 1

- ✅ All data stored locally (WatermelonDB + AsyncStorage)
- ✅ No cloud backend connection
- ✅ Background tracking with foreground service
- ✅ Dynamic settings adjustable in real-time
- ✅ Complete state machine implementation
- ✅ Data export for debugging/plotting
