@echo off
setlocal

REM Set Java 17
set JAVA_HOME=C:\Program Files\Java\jdk-17
set PATH=%JAVA_HOME%\bin;%PATH%

REM Verify Java version
echo Using Java:
java -version

REM Stop any running Gradle daemons
cd android
call gradlew.bat --stop
cd ..

REM Run the Android app
npm run android

endlocal
