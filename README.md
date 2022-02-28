# Ionic BLE Broadcaster and Observer App
This Application allows Smartphones to send and receive RSSI data from other Smartphones. To use this App properly you will need to have a Server like [BleServer](https://github.com/TawsTm/BleServer) running that the Smartdevices can communicate to and register themselves.

## Android
To run the developement on an Android Device use command:
```
ionic cordova run android -l
```
**Important**: You need to set up cordova and ionic first, or else the program will fail. Bluetooth just works on first execution.

To build an Android App you can use:
```
ionic cordova build android
```

## iOS
For iOS you need to build before running in XCode:
```
ionic cordova prepare ios
```
## Browser
For developement with no need to connect to a Server or cordova features, you can run the App on web with
```
ionic serve
```
127-Errors that represent faulty measurements are not corrected. The function is implemented but not used by default. It needs to be added if a correction on Clientside is needed.
