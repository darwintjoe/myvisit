# MyVisit - Build Instructions

## Prerequisites

Before building, ensure you have the following installed on your local machine:

### 1. Node.js & npm
- Download from: https://nodejs.org/ (LTS version recommended)
- Verify: `node --version` (should be v18+)
- Verify: `npm --version`

### 2. Java Development Kit (JDK)
- Download JDK 17 from: https://www.oracle.com/java/technologies/downloads/#jdk17-windows
- Set JAVA_HOME environment variable

### 3. Android Studio
- Download from: https://developer.android.com/studio
- Install Android Studio with:
  - Android SDK Platform 34 (or latest)
  - Android SDK Build-Tools
  - Android Emulator (optional)
  - Android SDK Command-line Tools

### 4. Environment Variables
Add these to your system environment variables:

**Windows (System Properties → Advanced → Environment Variables):**
```
ANDROID_HOME = C:\Users\YOUR_USERNAME\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Java\jdk-17
PATH = %PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%ANDROID_HOME%\tools\bin;%JAVA_HOME%\bin
```

**macOS/Linux (~/.bashrc or ~/.zshrc):**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$JAVA_HOME/bin
```

## Build Steps

### Step 1: Clone Repository
```bash
git clone https://github.com/darwintjoe/myvisit.git
cd myvisit
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Android Permissions

Edit `android/app/src/main/AndroidManifest.xml` and add these permissions inside the `<manifest>` tag:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Step 4: Add Google Play Services Dependency

Edit `android/app/build.gradle` and add inside `dependencies {}`:

```gradle
implementation 'com.google.android.gms:play-services-location:21.0.1'
implementation 'androidx.core:core-ktx:1.12.0'
```

### Step 5: Build Debug APK (for testing)
```bash
cd android
./gradlew assembleDebug
# or on Windows:
gradlew.bat assembleDebug
```

**Output location:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 6: Build Release APK (for production)

#### Generate Keystore (first time only):
```bash
keytool -genkey -v -keystore myvisit.keystore -alias myvisit -keyalg RSA -keysize 2048 -validity 10000
```

#### Configure Gradle Properties:
Create `android/gradle.properties` if it doesn't exist:
```properties
MYVISIT_UPLOAD_STORE_FILE=myvisit.keystore
MYVISIT_UPLOAD_KEY_ALIAS=myvisit
MYVISIT_UPLOAD_STORE_PASSWORD=your_password
MYVISIT_UPLOAD_KEY_PASSWORD=your_password
```

#### Build Release APK:
```bash
cd android
./gradlew assembleRelease
# or on Windows:
gradlew.bat assembleRelease
```

**Output location:** `android/app/build/outputs/apk/release/app-release.apk`

## Alternative: Build via React Native CLI

```bash
npx react-native run-android
```

This will build and install the debug APK on a connected device/emulator.

## Troubleshooting

### Error: "SDK location not found"
- Open Android Studio → File → Project Structure
- Note the Android SDK Location
- Set ANDROID_HOME to that path

### Error: "Java home is different"
- Ensure JAVA_HOME points to JDK 17, not JRE
- Check: `echo %JAVA_HOME%` (Windows) or `echo $JAVA_HOME` (Mac/Linux)

### Error: "Task 'assembleRelease' not found"
- Run: `cd android && gradlew tasks` to see available tasks
- Ensure you're in the `android` directory

### Build takes too long
- First build downloads many dependencies (can take 10-20 minutes)
- Subsequent builds are much faster

## Testing the App

1. Install the APK on your Android device
2. Enable "Install from Unknown Sources" if needed
3. Grant location permissions when prompted
4. Test the state machine:
   - Long press to start tracking
   - Walk around to test GPS logging
   - Stop moving for 15 minutes to test auto-visit detection
   - Short press to manually pause/resume
   - Long press to end shift
   - Use export button to download JSON data

## Next Steps After Testing

- Phase 2: Cloud sync integration
- Phase 2: User authentication
- Phase 2: Dashboard and analytics
- Phase 2: Push notifications

## Support

If you encounter issues:
1. Check React Native documentation: https://reactnative.dev/docs/environment-setup
2. Review WatermelonDB docs: https://nozbe.github.io/WatermelonDB/
3. Check background-geolocation docs: https://github.com/transistorsoft/react-native-background-geolocation
