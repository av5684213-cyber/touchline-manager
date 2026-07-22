#!/bin/bash
# v2.9.4 APK build — fully detached
LOG=/tmp/apk-build-v294.log
EXIT_FILE=/tmp/apk-build-v294.exitcode

cd /home/z/my-project/android-app
export ANDROID_HOME=/home/z/android-sdk
export ANDROID_SDK_ROOT=/home/z/android-sdk

echo "=== Build started $(date) ===" > $LOG
./gradlew assembleRelease -x lint --no-daemon --console=plain >> $LOG 2>&1
EXIT=$?
echo "=== Build finished $(date), exit=$EXIT ===" >> $LOG
echo $EXIT > $EXIT_FILE
