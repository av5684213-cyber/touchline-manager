#!/bin/bash
# Build APK detached — uzun sürecek, log /tmp/apk-build.log'a yazılır
# Çıkış kodu /tmp/apk-build.exitcode'a yazılır

LOG=/tmp/apk-build.log
EXIT_FILE=/tmp/apk-build.exitcode
STATUS_FILE=/tmp/apk-build.status

echo "starting" > $STATUS_FILE
cd /home/z/my-project/android-app || {
  echo "cd failed" > $STATUS_FILE
  exit 1
}

export ANDROID_HOME=/home/z/android-sdk
export ANDROID_SDK_ROOT=/home/z/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
export GRADLE_USER_HOME=/home/z/.gradle
export GRADLE_OPTS="-Xmx3g -Dorg.gradle.jvmargs=-Xmx3g -Dorg.gradle.daemon=false -Dorg.gradle.parallel=false -Dorg.gradle.caching=false"

echo "=== Build started at $(date) ===" > $LOG
~/.gradle/wrapper/dists/gradle-8.5-bin/5t9huq95ubn472n8rpzujfbqh/gradle-8.5/bin/gradle assembleRelease -x lint --no-daemon >> $LOG 2>&1
EXIT=$?
echo "=== Build finished at $(date), exit=$EXIT ===" >> $LOG
echo $EXIT > $EXIT_FILE

if [ $EXIT -eq 0 ]; then
  echo "success" > $STATUS_FILE
else
  echo "failed" > $STATUS_FILE
fi
