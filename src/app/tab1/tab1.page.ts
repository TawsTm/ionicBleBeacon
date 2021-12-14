/* eslint-disable no-underscore-dangle */
import { AfterViewInit, Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { Device } from '@awesome-cordova-plugins/device/ngx';
import { Platform } from '@ionic/angular';
import { BluetoothLE } from '@awesome-cordova-plugins/bluetooth-le/ngx';
import {Chart, ChartItem, registerables} from 'node_modules/chart.js';

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
    document.getElementById('scan-button').addEventListener('click', this.startScan);
    document.getElementById('advertise-button').addEventListener('click', this.startAdvertising);
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
      this.bluetoothle.addService({service: '529e3d04-5ce7-11ec-bf63-0242ac130002',
        characteristics: [{uuid: 'e7e8613a-5ce9-11ec-bf63-0242ac130002'}]}).then((result) => this.log(result.service, 'status'));

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

  startScan = () => {

    //log('Starting scan for devices...', 'status');

    this.deviceList = [];

    if (this.device.platform === 'windows') {

      this.bluetoothle.retrieveConnected(this.retrieveConnectedSuccess, this.handleError, {});

    } else {

      //There should be a good balance between scanning and pausing, so the Battery doesnt drain.

      this.switchScanState();
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

  startScanSuccess = (_result) => {

    if (_result.status === 'scanStarted') {
      this.log('Scanning for devices...', 'status');
    }
    else if (_result.status === 'scanResult') {

      if (!this.deviceList.some((device) =>
        device.device.address === _result.address
      ) && _result.advertisement.serviceUuids[0] === '1234') {

        /*this.bluetoothle.subscribe({address: _result.address,
          service: '529e3d04-5ce7-11ec-bf63-0242ac130002',
          characteristic: 'e7e8613a-5ce9-11ec-bf63-0242ac130002'})
          .subscribe({
            next: (result) => this.subscribeSuccess(result),
            error: (error) => this.handleError(error)
          });*/

        //Create new Chart
        const newDevice: DevicePackage = this.makeChart(_result);
        this.deviceList.push(newDevice);

        this.changeDetection.detectChanges();

        document.getElementById(newDevice.device.address).appendChild(newDevice.canvasElement);

      } else if (_result.advertisement.serviceUuids[0] === '1234') {
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

  subscribeSuccess(_result) {

    this.log('Ich war hier!', 'status');
    if(_result.status === 'subscribed') {
      this.log('Subscribed to Service', 'success');
    } else {
      this.log('Not Subscribed to Service', 'error');
    }
  }


  startAdvertising = () => {

    this.log('Starting to advertise for other devices...', 'status');

    this.bluetoothle.startAdvertising({ services: ['1234'], service: '1234', name: 'Ich bin einer der' })
          .then(result => this.startAdvertisingSuccess(result));
  };

  startAdvertisingSuccess = (_result) => {
    this.log('startAdvertisingSuccess(' + _result.status + ')', 'status');
    if (_result.status === 'advertisingStarted') {
      this.log('Advertising for devices (will continue to scan until you stop)...', 'status');
    } else {
      this.log('Something with the Advertising went wrong!', 'error');
    }
  };

  retrieveConnectedSuccess = (_result) => {

    this.log('retrieveConnectedSuccess()');
    this.log(_result);

    _result.forEach((device) => {
      this.addDevice(device.name, device.address);
    });
  };

  addDevice = (_name, _address) => {

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
      this.connect(_address);
      doConnect = false;
    }

    document.getElementById('devices').appendChild(button);
  };

  connect = (_address) => {

    this.log('Connecting to device: ' + _address + '...', 'status');

    if (this.device.platform === 'windows') {

        //Windows-Geräte müssen gepaired sein um angezeigt zu werden, daher wäre der nächste Schritt die Services auszulesen.
        //this.getDeviceServices(address);

    }
    else {

      this.stopScan();

        new Promise((resolve, reject) => {

          //Tab1Page.bluetoothle.connect(resolve, reject, { address });

        }).then(this.connectSuccess, this.handleError);

    }
  };

  stopScan = () => {

    new Promise((resolve, reject) => {

      //Tab1Page.bluetoothle.stopScan(resolve, reject);

    }).then(this.stopScanSuccess, this.handleError);
  };

  stopScanSuccess = () => {

    if (!this.deviceList.length) {

      this.log('NO DEVICES FOUND');
    }
    else {

      this.log('Found ' + this.deviceList.length + ' devices.', 'status');
    }
  };

  connectSuccess = (_result) => {

    this.log('- ' + _result.status);

    if (_result.status === 'connected') {

      //Weitere Verbindungsmöglichkeiten sind noch nicht notwendig.
      this.log('The Divece is connected!: ' + _result.address, 'status');
        //this.getDeviceServices(result.address);
    }
    else if (_result.status === 'disconnected') {

      this.log('Disconnected from device: ' + _result.address, 'status');
    }
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
