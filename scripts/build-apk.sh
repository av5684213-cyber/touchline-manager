#!/bin/bash
# APK build script - detached from session
LOG=/tmp/apk-build-detached.log
cd /home/z/my-project/android-app || exit 1
export ANDROID_HOME=/home/z/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin

echo "=== Build started at $(date) ===" > $LOG
./gradlew assembleRelease --no-daemon -x lint --offline >> $LOG 2>&1
EXIT_CODE=$?
echo "=== Build finished at $(date), exit=$EXIT_CODE ===" >> $LOG
echo "APK timestamp: $(stat -c %Y app/build/outputs/apk/release/app-release.apk 2>/dev/null)" >> $LOG
echo "Current time: $(date +%s)" >> $LOG
