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

  devices: any[] = [];

  constructor(public device: Device, public bluetoothle: BluetoothLE, public plt: Platform) {

    new Promise((resolve) => this.plt.ready().then((readySource) => {

      console.log('Platform ready from', readySource);

      this.bluetoothle.initialize(resolve, { request: true, statusReceiver: false }).subscribe(ble => {
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
    //document.addEventListener('deviceready', function () {
      //document.getElementById('console').innerHTML += (typeof this);
      log('Jetzt aber', 'status');



    //});
  };

  //Überprüfung ob Bluetooth aktiviert ist und somit der Adapter verwendet werden kann.
  const initializeSuccess = (result) => {

    if (result.status === 'enabled') {

      log('Bluetooth is enabled.', 'status');
      log(result, 'status');
    } else {

      log('Bluetooth is not enabled:', 'status');
      log(result, 'status');

    }
  };

  //Wenn ein Error beim Scan auftritt
  const handleError = (error) => {

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

  function startScan() {

    log('Starting scan for devices...', 'status');

    this.devices = [];

    document.getElementById('devices').innerHTML = '';
    document.getElementById('services').innerHTML = '';
    document.getElementById('output').innerHTML = '';

    if (this.device.platform === 'windows') {

        this.bluetoothle.retrieveConnected(retrieveConnectedSuccess, handleError, {});
    }
    else {

        this.bluetoothle.startScan(startScanSuccess, handleError, { services: [] });
    }
  }

  function startScanSuccess(result) {

    log('startScanSuccess(' + result.status + ')', 'status');

    if (result.status === 'scanStarted') {

        log('Scanning for devices (will continue to scan until you select a device)...', 'status');
    }
    else if (result.status === 'scanResult') {

        if (!this.devices.some((device) =>
          device.address === result.address
        )) {
            log('FOUND DEVICE:');
            log(result, 'status');
            log(result.rssi, 'status');
            this.devices.push(result);
            //addDevice(result.name, result.address);
        }
    }
}

function startAdvertising() {

  log('Starting to advertise for other devices...', 'status');

  this.bluetoothle.startAdvertising(startAdvertisingSuccess, handleError, { services: [] });
}

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

  function connect(address) {

    log('Connecting to device: ' + address + '...', 'status');

    if (this.device.platform === 'windows') {

        //Windows-Geräte müssen gepaired sein um angezeigt zu werden, daher wäre der nächste Schritt die Services auszulesen.
        //this.getDeviceServices(address);

    }
    else {

        stopScan();

        new Promise((resolve, reject) => {

            this.bluetoothle.connect(resolve, reject, { address });

        }).then(connectSuccess, handleError);

    }
  }

  function stopScan() {

    new Promise((resolve, reject) => {

        this.bluetoothle.stopScan(resolve, reject);

    }).then(stopScanSuccess, handleError);
  };

  function stopScanSuccess() {

    if (!this.devices.length) {

        log('NO DEVICES FOUND');
    }
    else {

        log('Found ' + this.devices.length + ' devices.', 'status');
    }
  }

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
