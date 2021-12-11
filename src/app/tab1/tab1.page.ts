/* eslint-disable no-underscore-dangle */
import { AfterViewInit, Component, Injectable } from '@angular/core';
import { Device } from '@awesome-cordova-plugins/device/ngx';
import { Platform } from '@ionic/angular';
//import { BLE } from '@ionic-native/ble/ngx';
import { BluetoothLE } from '@awesome-cordova-plugins/bluetooth-le/ngx';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})

export class Tab1Page implements AfterViewInit {

  public static devices: any[] = [];
  public static device: Device;
  public static bluetoothle: BluetoothLE;

  constructor(private _device: Device, public _bluetoothle: BluetoothLE, public plt: Platform) {

    new Promise((resolve) => this.plt.ready().then((readySource) => {

      console.log('Platform ready from', readySource);
      Tab1Page.device = this._device;
      Tab1Page.bluetoothle = this._bluetoothle;
      Tab1Page.bluetoothle.initialize(resolve, { request: true, statusReceiver: false }).subscribe(ble => {
        //log(ble.status, 'status'); // logs 'enabled'
        initializeSuccess(ble);
      });
    })).then(handleError);
  }

  ngAfterViewInit() {
    document.getElementById('scan-button').addEventListener('click', startScan);
    document.getElementById('advertise-button').addEventListener('click', startAdvertising);
  }
}

//Start des Scans
const scan = () => {
    log('Jetzt aber', 'status');
};

//Überprüfung ob Bluetooth aktiviert ist und somit der Adapter verwendet werden kann.
const initializeSuccess = (result) => {

  if (result.status === 'enabled') {

    log('Bluetooth is enabled.', 'status');

  } else {

    log('Bluetooth is not enabled:', 'status');

  }
};

//Wenn ein Error beim Scan auftritt
const handleError = (error) => {

  log('Es ist ein Fehler aufgetreten!', 'error');

  let msg;

  if (error.error && error.message) {

    const errorItems = [];

    if (error.service) {
        errorItems.push('service: ' + (error.service || error.service));
    }

    if (error.characteristic) {
        errorItems.push('characteristic: ' + (error.characteristic || error.characteristic));
    }

    msg = 'Error on ' + error.error + ': ' + error.message + (errorItems.length && (' (' + errorItems.join(', ') + ')'));
  }

  else {
    msg = error;
  }

  document.getElementById('console2').innerHTML = msg;

  log(error, 'error');

  if (error.error === 'read' && error.service && error.characteristic) {
      reportValue(error.service, error.characteristic, 'Error: ' + error.message);
  }
};

// Um dem Nutzer Output zu zeigen und zum debuggen.
const log = (msg, level?) => {

  level = level || 'log';

  if (typeof msg === 'object') {

      msg = JSON.stringify(msg, null, '  ');
  }

  console.log(msg);

  if (level === 'status' || level === 'error') {

      const msgDiv = document.createElement('div');
      msgDiv.textContent = msg;

      if (level === 'error') {

          msgDiv.style.color = 'red';
      }

      msgDiv.style.padding = '5px 0';
      msgDiv.style.borderBottom = 'rgb(192,192,192) solid 1px';
      document.getElementById('console').appendChild(msgDiv);
  }
};

const startScan = () => {

  log('Starting scan for devices...', 'status');


  Tab1Page.devices = [];

  document.getElementById('devices').innerHTML = '';
  document.getElementById('services').innerHTML = '';
  document.getElementById('output').innerHTML = '';

  if (Tab1Page.device.platform === 'windows') {

    Tab1Page.bluetoothle.retrieveConnected(retrieveConnectedSuccess, handleError, {});

  } else {

    log('Es ist ein ' + Tab1Page.device.platform + ' Gerät', 'status');

    Tab1Page.bluetoothle.hasPermission().then((readySource) => {
      log('Permission is allowed: ' + readySource.hasPermission, 'status');

      if(!readySource.hasPermission) {
        Tab1Page.bluetoothle.requestPermission(requestPermissionSuccess, handleError);
      }

    });

    Tab1Page.bluetoothle.isLocationEnabled().then((readySource) => {
      log('Use of Location is allowed: ' + readySource.isLocationEnabled, 'status');

      if(!readySource.isLocationEnabled) {
        Tab1Page.bluetoothle.requestLocation(requestLocationSuccess, handleError);
      }

    });

    if(Tab1Page.device.platform === 'Android') {

      //Tab1Page.bluetoothle.startScan(startScanSuccess, handleError, { services: [] }).forEach(d => log(d, 'status'));
      Tab1Page.bluetoothle.startScan(startScanSuccess, handleError, { services: [] }).forEach(d => startScanSuccess(d));
      //Tab1Page.bluetoothle.startScan(startScanSuccess, handleError, { services: [] });

    } else if (Tab1Page.device.platform === 'iOS') {

      log('Jetzt kommt startScan für IOS', 'status');
      Tab1Page.bluetoothle.startScan(startScanSuccess, handleError, { services: [], allowDuplicates: true }).forEach(d => startScanSuccess(d));

    }
  }
};

const requestPermissionSuccess = (result) => {
  if(result.requestPermission === true) {
    log('Permission allowed!', 'status');
  } else {
    log('Permission denied, but needed!', 'status');
    Tab1Page.bluetoothle.requestPermission(requestPermissionSuccess, handleError);
  }
};

const requestLocationSuccess = (result) => {
  if(result.requestLocation === true) {
    log('Location allowed!', 'status');
  } else {
    log('Location denied, but needed!', 'status');
    Tab1Page.bluetoothle.requestLocation(requestLocationSuccess, handleError);
  }
};

const startScanSuccess = (result) => {

  //log('startScanSuccess(' + result.status + ')', 'status');

  if (result.status === 'scanStarted') {

    log('Scanning for devices (will continue to scan until you select a device)...', 'status');
  }
  else if (result.status === 'scanResult') {

    //log('ScanResult', 'status');

    if (!Tab1Page.devices.some((device) =>
      device.address === result.address
    )) {
      log('Device:', 'status');

      log(result.rssi, 'status');
      log(result.address, 'status');
      log(result.name, 'status');
      Tab1Page.devices.push(result);
      //addDevice(result.name, result.address);
    } else {
      //Update RSSI For Devices
      for (const device of Tab1Page.devices) {
        if(device.address === result.address) {
          device.rssi = result.rssi;
        }
      }
    }
  }
};

const startAdvertising = () => {

  log('Starting to advertise for other devices...', 'status');

  //Tab1Page.bluetoothle.startAdvertising(startAdvertisingSuccess, handleError, { services: [] });
};

const startAdvertisingSuccess = (result) => {
  log('startAdvertisingSuccess(' + result.status + ')', 'status');
  if (result.status === 'advertisingStarted') {
    log('Advertising for devices (will continue to scan until you stop)...', 'status');
  } else {
    log('Something with the Advertising went wrong!', 'error');
  }
};

const retrieveConnectedSuccess = (result) => {

  log('retrieveConnectedSuccess()');
  log(result);

  result.forEach((device) => {
      addDevice(device.name, device.address);
  });
};

const addDevice = (name, address) => {

  let doConnect = false;

  const button = document.createElement('button');
  button.style.width = '100%';
  button.style.padding = '10px';
  button.style.fontSize = '16px';
  button.textContent = name + ': ' + address;

  button.addEventListener('click', () => {

      document.getElementById('services').innerHTML = '';
      doConnect = true;
  });

  if(doConnect) {
    connect(address);
    doConnect = false;
  }

  document.getElementById('devices').appendChild(button);
};

const connect = (address) => {

  log('Connecting to device: ' + address + '...', 'status');

  if (Tab1Page.device.platform === 'windows') {

      //Windows-Geräte müssen gepaired sein um angezeigt zu werden, daher wäre der nächste Schritt die Services auszulesen.
      //this.getDeviceServices(address);

  }
  else {

      stopScan();

      new Promise((resolve, reject) => {

        //Tab1Page.bluetoothle.connect(resolve, reject, { address });

      }).then(connectSuccess, handleError);

  }
};

const stopScan = () => {

  new Promise((resolve, reject) => {

    //Tab1Page.bluetoothle.stopScan(resolve, reject);

  }).then(stopScanSuccess, handleError);
};

const stopScanSuccess = () => {

  if (!Tab1Page.devices.length) {

      log('NO DEVICES FOUND');
  }
  else {

      log('Found ' + Tab1Page.devices.length + ' devices.', 'status');
  }
};

const connectSuccess = (result) => {

  log('- ' + result.status);

  if (result.status === 'connected') {

    //Weitere Verbindungsmöglichkeiten sind noch nicht notwendig.
    log('The Divece is connected!: ' + result.address, 'status');
      //this.getDeviceServices(result.address);
  }
  else if (result.status === 'disconnected') {

      log('Disconnected from device: ' + result.address, 'status');
  }
};



const reportValue = (serviceUuid, characteristicUuid, value) => {

  document.getElementById(serviceUuid + '.' + characteristicUuid).textContent = value;
};



/* Der Code für BLE
Scan() {
  this.devices = [];
  this.ble.scan([], 15).subscribe(
    device => this.onDeviceDiscovered(device)
  );
}

onDeviceDiscovered(_device) {
  console.log('Discovered' + JSON.stringify(_device,null,2));
  this.ngZone.run(()=>{
    this.devices.push(_device);
    console.log(_device);
  })
}
*/
