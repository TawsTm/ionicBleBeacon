/* eslint-disable no-underscore-dangle */
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Device } from '@awesome-cordova-plugins/device/ngx';
import { Platform } from '@ionic/angular';
import { BluetoothLE } from '@awesome-cordova-plugins/bluetooth-le/ngx';
import { Chart, ChartItem, registerables } from 'node_modules/chart.js';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})

export class Tab1Page implements OnInit {

  public device: Device;
  //For the right HTML Mode
  public deviceMode = 'md';
  public bluetoothle: BluetoothLE;
  public deviceList: DevicePackage[] = [];
  // 4 Letters in Hexadezimal from 0-F.
  installationPlayerID = 'fa2b';
  playerID = 'a123';
  intervalID;

  constructor(private _device: Device, public _bluetoothle: BluetoothLE, public _plt: Platform,
              private changeDetection: ChangeDetectorRef) {

    new Promise((resolve) => this._plt.ready().then((readySource) => {

      console.log('Platform ready from', readySource);
      this.log('My Address is: ' + _device.uuid, 'status');
      this.device = this._device;
      this.bluetoothle = this._bluetoothle;
      this.bluetoothle.initialize(resolve, { request: true, statusReceiver: false }).subscribe(ble => {
        this.initializeSuccess(ble);
      });

      //For Peripheral use
      this.bluetoothle.initializePeripheral({ request: true }).subscribe(ble => {
        //log(ble.status, 'status'); // logs 'enabled'
        this.initializePeripheralSuccess(ble);
      });

    })).then(this.handleError);

  }

  ngOnInit() {
    document.getElementById('scan-button').addEventListener('click', this.switchScanState);
    document.getElementById('advertise-button').addEventListener('click', this.switchAdvertiseState);
  }

  makeChart(_device): DevicePackage {

      const newChartElement: DevicePackage = {canvasElement: null, chart: null, device: _device, rssi: [_device.rssi], lifetime: 0};

      Chart.register(...registerables);

      const htmlElementContainer = document.createElement('div');
      const htmlElement = document.createElement('canvas');
      //htmlElement.id = _device.address;
      htmlElementContainer.appendChild(htmlElement);

      //document.getElementById('BLEStatus').appendChild(htmlElementContainer);

      const myChart = new Chart(htmlElement as ChartItem, {
      type: 'line',
      data: {
          labels: ['-5', '-4', '-3', '-2', '-1', '0'],
          datasets: [{
              label: 'RSSI over Time',
              data: newChartElement.rssi,
              backgroundColor:
                'rgba(0, ' + (255 - Math.abs(_device.rssi)*2.5) + ', 0 , 0.2)',
              borderColor:
                'rgba(0, ' + (255 - Math.abs(_device.rssi)*2.5) + ', 0 , 0.2)',
              borderWidth: 1,
          }]
      },
      options: {
          scales: {
              y: {
                  beginAtZero: false,
                  max: -20,
                  min: -120,
              }
          }
        },
      });
      newChartElement.chart = myChart;
      newChartElement.canvasElement = htmlElementContainer;
      return newChartElement;
  }


  //Überprüfung ob Bluetooth aktiviert ist und somit der Adapter verwendet werden kann.
  initializeSuccess = (_result) => {

    if (_result.status === 'enabled') {

      this.log('Bluetooth is enabled.', 'success');

    } else {

      this.log('Bluetooth is not enabled:', 'error');

    }
  };

  initializePeripheralSuccess = (_result) => {

    this.log('Peripheral status: ' + _result, 'success');

    if (_result.status === 'enabled') {

      this.log('Peripheral ready, adding Services..', 'success');
      //Hier sollte die vom Server bergebene ID eingefügt werden.
      //this.bluetoothle.addService({service: this.installationPlayerID,
      //  characteristics: [{uuid: this.installationPlayerID}]}).then((result) => this.log(result.service, 'status'));

    } else {

      this.log('Bluetooth is not enabled:', 'error');

    }
  };

  //Wenn ein Error beim Scan auftritt
  handleError = (_error) => {

    this.log('Es ist ein Fehler aufgetreten!', 'error');

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

    this.log(_error, 'error');

    if (_error.error === 'read' && _error.service && _error.characteristic) {
      this.reportValue(_error.service, _error.characteristic, 'Error: ' + _error.message);
    }
  };

  // Um dem Nutzer Output zu zeigen und zum debuggen.
  log = (_msg, _level?) => {

    _level = _level || 'log';

    if (typeof _msg === 'object') {
        _msg = JSON.stringify(_msg, null, '  ');
    }

    console.log(_msg);

    if (_level === 'status' || _level === 'error' || _level === 'success') {

        const msgDiv = document.createElement('div');
        msgDiv.textContent = _msg;

        if (_level === 'error') {
          msgDiv.style.color = 'red';

        } else if (_level === 'success') {
          msgDiv.style.color = 'green';

        } else {
          msgDiv.style.color = 'rgb(192,192,192)';
        }

        msgDiv.style.padding = '5px 0';
        msgDiv.style.borderBottom = 'rgb(192,192,192) solid 1px';
        const consoleContainer = document.getElementById('console');
        consoleContainer.appendChild(msgDiv);
    }
  };


  kickOldDevices = () => {
    this.deviceList.forEach(device => {
      if(device.lifetime > 2) {
        const index = this.deviceList.indexOf(device);
        this.deviceList.splice(index, 1);
      } else {
        device.lifetime++;
      }
    });
  };

  switchScanState = () => {

    this.bluetoothle.isScanning().then((status) => {
      if(!status.isScanning) {

        this.bluetoothle.hasPermission().then((readySource) => {

          if(!readySource.hasPermission) {
            this.bluetoothle.requestPermission().then((permissionStatus) => {
              if(permissionStatus.requestPermission) {
                this.log('Permission granted', 'success');
              } else {
                this.log('Permission denied', 'error');
              }
            });
          }
        });

        this.bluetoothle.isLocationEnabled().then((readySource) => {

          if(!readySource.isLocationEnabled) {
            this.bluetoothle.requestLocation().then((locatioStatus) => {
              if(locatioStatus.requestLocation) {
                this.log('Location activated', 'success');
              } else {
                this.log('Location denied', 'error');
              }
            });
          }
        });

        if(this.device.platform === 'Android') {

          this.bluetoothle.startScan({ allowDuplicates: true })
          .subscribe(result => this.startScanSuccess(result));

        } else if (this.device.platform === 'iOS') {

          this.deviceMode = 'ios';

          this.bluetoothle.startScan({ allowDuplicates: true })
          .subscribe(result => this.startScanSuccess(result));

        }
        this.intervalID = setInterval(this.kickOldDevices, 1000);
      } else {
        this.bluetoothle.stopScan();
        clearInterval(this.intervalID);
        this.deviceList = [];
        this.log('Stopping Scan...', 'status');
      }
    });
  };

  decodeUnicode = (str) => {
    // Going backwards: from byte stream, to percent-encoding, to original string.

    // eslint-disable-next-line arrow-body-style
    decodeURIComponent(atob(str).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  };

  bin2String(array) {
    let result = '';
    for (const x of array) {
       result += String.fromCharCode(parseInt(x, 2));
    }
    return result;
  }


  startScanSuccess = (_result) => {

    if (_result.status === 'scanStarted') {
      this.log('Scanning for devices...', 'status');
    }
    else if (_result.status === 'scanResult') {

      if (!this.deviceList.some((device) =>
        device.device.address === _result.address
      )) {
        let installationUuid;

        if(this.device.platform === 'iOS') {
          //iOS return an Object
          installationUuid = _result.advertisement.serviceUuids[0];

        } else if (this.device.platform === 'Android') {
          //Android returns a Base64 Code that needs conversion
          const advertisementBytes = this.bluetoothle.encodedStringToBytes(_result.advertisement);

          const advertisingData = this.parseAdvertisingData(advertisementBytes);
          const SERVICE_DATA_KEY = '0x03';
          const serviceData = advertisingData[SERVICE_DATA_KEY];
          if (serviceData) {
            // first 2 bytes are the 16 bit UUID/ServiceID
            const uuidBytes = new Uint16Array(serviceData.slice(0,2));
            const firstUuid = uuidBytes[0].toString(16); // hex string

            /* Sending a second UUID only works for iOS for now
            const uuidBytes2 = new Uint16Array(serviceData.slice(2,4));
            const secondUuid = uuidBytes2[0].toString(16);
            */

            /**
             * If the Service is filled, or there is more then one Service, u can read them like shown below
             */
            // remaining bytes are the service data, expecting 32bit floating point number
            /*const dataBytes = new Uint16Array(serviceData.slice(2));
            const data = new Float32Array(dataBytes.slice(2));
            const firstDataPack = data[0];*/

            installationUuid = firstUuid;
          }
        }

        if(installationUuid.toLowerCase() === this.installationPlayerID.toLowerCase()) {
          //Create new Chart
          const newDevice: DevicePackage = this.makeChart(_result);
          this.deviceList.push(newDevice);

          this.changeDetection.detectChanges();

          document.getElementById(newDevice.device.address).appendChild(newDevice.canvasElement);
          this.log(_result.name, 'status');


          /*const newstring = [];
          for (const byte of advertisementBytes) {
            newstring.push('0x' + ('0'+(byte.toString(16))).substr(-2).toUpperCase());
          }
          const parsedString = newstring.join(' ');*/

          //const output = Buffer.from(parsedString, 'hex');



          /*const advertisementBytesObject = new TextDecoder().decode(advertisementBytes);
          const advertisementBytesObject2 = atob(advertisementBytesObject);*/
          //const atoba = atob(_result.advertisement);

          //const encodedString = this.bin2String(advertisementBytesObject);

          //const advertisementString = this.bluetoothle.bytesToString(advertisementBytes);

          //const advertisementBytes = atob(_result.advertisement);
          //const advertisementBytes = Buffer.from(_result.advertisement, 'base64').toString('binary');


        }

        //if(serviceUuid === '1234') {

          /*this.bluetoothle.subscribe({address: _result.address,
            service: '529e3d04-5ce7-11ec-bf63-0242ac130002',
            characteristic: 'e7e8613a-5ce9-11ec-bf63-0242ac130002'})
            .subscribe({
              next: (result) => this.subscribeSuccess(result),
              error: (error) => this.handleError(error)
            });*/

      } else {
        //Update RSSI For Devices
        for (const device of this.deviceList) {
          if(device.device.address === _result.address) {

            device.device.rssi = _result.rssi;
            device.lifetime = 0;

            //Es sollen nur die letzten 5 RSSI-Werte angezeigt werden.
            if(device.rssi.length > 5) {
              device.rssi.shift();
            }
            device.rssi.push(_result.rssi);

            device.chart.data.datasets[0].backgroundColor =
            'rgba(0, ' + (255 - Math.abs(_result.rssi)*2.5) + ', 0 , 0.2)';
            device.chart.data.datasets[0].borderColor =
            'rgba(0, ' + (255 - Math.abs(_result.rssi)*2.5) + ', 0 , 0.2)';

            device.chart.update();
          }
        }
        //To update the Angular Components
        this.changeDetection.detectChanges();
      }
    }
  };

  parseAdvertisingData(buffer) {
    let length;
    let type;
    let data;
    let i = 0;
    const advertisementData = {};
    const bytes = new Uint8Array(buffer);

    while (length !== 0) {

        // eslint-disable-next-line no-bitwise
        length = bytes[i] & 0xFF;
        i++;

        // decode type constants from https://www.bluetooth.org/en-us/specification/assigned-numbers/generic-access-profile
        // eslint-disable-next-line no-bitwise
        type = bytes[i] & 0xFF;
        i++;

        data = bytes.slice(i, i + length - 1).buffer; // length includes type byte, but not length byte
        i += length - 2;  // move to end of data
        i++;

        advertisementData[this.asHexString(type)] = data;
    }

    return advertisementData;
}

asHexString(i) {
  let hex;

  hex = i.toString(16);

  // zero padding
  if (hex.length === 1) {
      hex = '0' + hex;
  }

  return '0x' + hex;
}

  /*subscribeSuccess(_result) {

    this.log('Ich war hier!', 'status');
    if(_result.status === 'subscribed') {
      this.log('Subscribed to Service', 'success');
    } else {
      this.log('Not Subscribed to Service', 'error');
    }
  }*/


  startAdvertising = () => {

    this.log('Starting to advertise for other devices...', 'status');

    this.bluetoothle.startAdvertising({
      services: [this.installationPlayerID], service: this.installationPlayerID,
      name: this.playerID, includeDeviceName: false, timeout: 0, txPowerLevel: 'high', mode: 'lowLatency'})
        .then(result => this.startAdvertisingSuccess(result), error => this.handleError(error));
  };

  stopAdvertising = () => {

    this.log('Cancelling to advertise for other devices...', 'status');

    this.bluetoothle.stopAdvertising()
        .then(result => this.stopAdvertisingSuccess(result), error => this.handleError(error));
  };

  startAdvertisingSuccess = (_result) => {
    if (_result.status === 'advertisingStarted') {
      this.log('Advertising for devices (will continue to scan until you stop)...', 'status');
    } else {
      this.log('Something with the Advertising went wrong!', 'error');
    }
  };

  stopAdvertisingSuccess = (_result) => {
    if (_result.status === 'advertisingStopped') {
      this.log('Advertising is stopped', 'status');
    } else {
      this.log('Something with the Advertising-Stop went wrong!', 'error');
    }
  };

  switchAdvertiseState = () => {
    this.bluetoothle.isAdvertising().then(
      (result) => {
      if(result.isAdvertising) {
        this.stopAdvertising();
      } else {
        this.startAdvertising();
      }
    }, (error) => this.handleError(error));
  };


  reportValue = (_serviceUuid, _characteristicUuid, _value) => {

    document.getElementById(_serviceUuid + '.' + _characteristicUuid).textContent = _value;
  };

}

interface DevicePackage {
  canvasElement: HTMLElement;
  chart: Chart;
  device: any;
  rssi: number[];
  lifetime: number;
}
