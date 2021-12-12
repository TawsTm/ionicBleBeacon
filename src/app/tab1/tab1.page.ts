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

  constructor(private _device: Device, public _bluetoothle: BluetoothLE, public _plt: Platform) {

    new Promise((resolve) => this._plt.ready().then((readySource) => {

      console.log('Platform ready from', readySource);
      log('My Address is: ' + _device.uuid, 'status');
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

//Überprüfung ob Bluetooth aktiviert ist und somit der Adapter verwendet werden kann.
const initializeSuccess = (_result) => {

  if (_result.status === 'enabled') {

    log('Bluetooth is enabled.', 'status');

  } else {

    log('Bluetooth is not enabled:', 'status');

  }
};

//Wenn ein Error beim Scan auftritt
const handleError = (_error) => {

  log('Es ist ein Fehler aufgetreten!', 'error');

  let msg;

  if (_error.error && _error.message) {

    const errorItems = [];

    if (_error.service) {
        errorItems.push('service: ' + (_error.service || _error.service));
    }

    if (_error.characteristic) {
        errorItems.push('characteristic: ' + (_error.characteristic || _error.characteristic));
    }

    msg = 'Error on ' + _error.error + ': ' + _error.message + (errorItems.length && (' (' + errorItems.join(', ') + ')'));
  }

  else {
    msg = _error;
  }

  document.getElementById('console2').innerHTML = msg;

  log(_error, 'error');

  if (_error.error === 'read' && _error.service && _error.characteristic) {
      reportValue(_error.service, _error.characteristic, 'Error: ' + _error.message);
  }
};

// Um dem Nutzer Output zu zeigen und zum debuggen.
const log = (_msg, _level?) => {

  _level = _level || 'log';

  if (typeof _msg === 'object') {

      _msg = JSON.stringify(_msg, null, '  ');
  }

  console.log(_msg);

  if (_level === 'status' || _level === 'error') {

      const msgDiv = document.createElement('div');
      msgDiv.textContent = _msg;

      if (_level === 'error') {

        msgDiv.style.color = 'red';
      } else {
        msgDiv.style.color = 'green';
      }

      msgDiv.style.padding = '5px 0';
      msgDiv.style.borderBottom = 'rgb(192,192,192) solid 1px';
      const consoleContainer = document.getElementById('console');
      consoleContainer.appendChild(msgDiv);
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
      //Tab1Page.bluetoothle.startScan(startScanSuccess, handleError, { services: [] }).forEach(d => startScanSuccess(d));
      Tab1Page.bluetoothle.startScan(startScanSuccess, handleError, { services: [] }).subscribe(result => startScanSuccess(result));
      //Tab1Page.bluetoothle.startScan(startScanSuccess, handleError, { services: [] });

    } else if (Tab1Page.device.platform === 'iOS') {

      Tab1Page.bluetoothle.startScan(startScanSuccess, handleError, { services: [], allowDuplicates: true }).
      forEach(d => startScanSuccess(d));

    }
  }
};

const requestPermissionSuccess = (_result) => {
  if(_result.requestPermission === true) {
    log('Permission allowed!', 'status');
  } else {
    log('Permission denied, but needed!', 'status');
    Tab1Page.bluetoothle.requestPermission(requestPermissionSuccess, handleError);
  }
};

const requestLocationSuccess = (_result) => {
  if(_result.requestLocation === true) {
    log('Location allowed!', 'status');
  } else {
    log('Location denied, but needed!', 'status');
    Tab1Page.bluetoothle.requestLocation(requestLocationSuccess, handleError);
  }
};

const startScanSuccess = (_result) => {

  if (_result.status === 'scanStarted') {
    log('Scanning for devices...', 'status');
  }
  else if (_result.status === 'scanResult') {

    if (!Tab1Page.devices.some((device) =>
      device.address === _result.address
    )) {

      Tab1Page.devices.push(_result);
      updateDeviceList();

      //addDevice(result.name, result.address);
    } else {
      //Update RSSI For Devices
      for (const device of Tab1Page.devices) {
        if(device.address === _result.address) {
          device.rssi = _result.rssi;
        }
      }
      updateDeviceList();
    }
  }
};

const updateDeviceList = () => {
  const devicesContainer: HTMLElement = document.getElementById('devices');
  devicesContainer.innerHTML = '';

  Tab1Page.devices.forEach(device => {
    createDeviceElement(device);
  });
};

const createDeviceElement = (_device) => {

  const devicesContainer: HTMLElement = document.getElementById('devices');

  //Create a Container for every new Device
  const singleDeviceContainer = document.createElement('div');
  singleDeviceContainer.style.borderBottom = 'rgb(192,192,192) solid 1px';

  const deviceAddress = document.createElement('p');
  deviceAddress.innerHTML = 'Device: <b>' + JSON.stringify(_device.address) + '</b>';
  singleDeviceContainer.appendChild(deviceAddress);

  const deviceRssi = document.createElement('p');
  deviceRssi.innerHTML = 'RSSI: ' + JSON.stringify(_device.rssi);
  singleDeviceContainer.appendChild(deviceRssi);

  if(_device.name) {

    const deviceName = document.createElement('p');
    deviceName.innerHTML = JSON.stringify(_device.name);
    singleDeviceContainer.appendChild(deviceName);

  }

  devicesContainer.appendChild(singleDeviceContainer);
};

const startAdvertising = () => {

  log('Starting to advertise for other devices...', 'status');

  //Tab1Page.bluetoothle.startAdvertising(startAdvertisingSuccess, handleError, { services: [] });
};

const startAdvertisingSuccess = (_result) => {
  log('startAdvertisingSuccess(' + _result.status + ')', 'status');
  if (_result.status === 'advertisingStarted') {
    log('Advertising for devices (will continue to scan until you stop)...', 'status');
  } else {
    log('Something with the Advertising went wrong!', 'error');
  }
};

const retrieveConnectedSuccess = (_result) => {

  log('retrieveConnectedSuccess()');
  log(_result);

  _result.forEach((device) => {
      addDevice(device.name, device.address);
  });
};

const addDevice = (_name, _address) => {

  let doConnect = false;

  const button = document.createElement('button');
  button.style.width = '100%';
  button.style.padding = '10px';
  button.style.fontSize = '16px';
  button.textContent = _name + ': ' + _address;

  button.addEventListener('click', () => {

      document.getElementById('services').innerHTML = '';
      doConnect = true;
  });

  if(doConnect) {
    connect(_address);
    doConnect = false;
  }

  document.getElementById('devices').appendChild(button);
};

const connect = (_address) => {

  log('Connecting to device: ' + _address + '...', 'status');

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

const connectSuccess = (_result) => {

  log('- ' + _result.status);

  if (_result.status === 'connected') {

    //Weitere Verbindungsmöglichkeiten sind noch nicht notwendig.
    log('The Divece is connected!: ' + _result.address, 'status');
      //this.getDeviceServices(result.address);
  }
  else if (_result.status === 'disconnected') {

      log('Disconnected from device: ' + _result.address, 'status');
  }
};



const reportValue = (_serviceUuid, _characteristicUuid, _value) => {

  document.getElementById(_serviceUuid + '.' + _characteristicUuid).textContent = _value;
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
