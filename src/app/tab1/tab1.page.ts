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
  public bluetoothle: BluetoothLE;
  public devices: any[] = [];
  public chartElements: Chartelement[] = [];

  constructor(private _device: Device, public _bluetoothle: BluetoothLE, public _plt: Platform) {

    new Promise((resolve) => this._plt.ready().then((readySource) => {

      console.log('Platform ready from', readySource);
      this.log('My Address is: ' + _device.uuid, 'status');
      this.device = this._device;
      this.bluetoothle = this._bluetoothle;
      this.bluetoothle.initialize(resolve, { request: true, statusReceiver: false }).subscribe(ble => {
        //log(ble.status, 'status'); // logs 'enabled'
        this.initializeSuccess(ble);
      });
    })).then(this.handleError);

  }

  ngOnInit() {
    document.getElementById('scan-button').addEventListener('click', this.startScan);
    document.getElementById('advertise-button').addEventListener('click', this.startAdvertising);
  }

  makeChart(_device) {
    let newDevice = true;
    this.chartElements.forEach(chartElement => {
      if (chartElement.device.address === _device.address) {

        newDevice = false;
        //Update
        if(chartElement.rssi.length > 5) {
          chartElement.rssi.shift();
        }
        chartElement.rssi.push(_device.rssi);
        chartElement.chart.update();
      }
    });

    if(newDevice) {

      const newChartElement: Chartelement = {chart: null, device: _device, rssi: [_device.rssi]};

      Chart.register(...registerables);

      const htmlElementContainer = document.createElement('div');
      const htmlElement = document.createElement('canvas');
      htmlElement.id = _device.address;
      htmlElementContainer.appendChild(htmlElement);

      document.getElementById('BLEStatus').appendChild(htmlElementContainer);

      const myChart = new Chart(document.getElementById(_device.address) as ChartItem, {
      type: 'line',
      data: {
          labels: ['-5', '-4', '-3', '-2', '-1', '0'],
          datasets: [{
              label: 'RSSI over Time',
              data: newChartElement.rssi,
              backgroundColor:
                  'rgba(50, 100, 255, 0.2)',
              borderColor:
                  'rgba(50, 100, 255, 1)',
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
      this.chartElements.push(newChartElement);
    }

  }


  //Überprüfung ob Bluetooth aktiviert ist und somit der Adapter verwendet werden kann.
  initializeSuccess = (_result) => {

    if (_result.status === 'enabled') {

      this.log('Bluetooth is enabled.', 'success');

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

    document.getElementById('console2').innerHTML = msg;

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


    this.devices = [];

    document.getElementById('devices').innerHTML = '';
    document.getElementById('services').innerHTML = '';
    document.getElementById('output').innerHTML = '';

    if (this.device.platform === 'windows') {

      this.bluetoothle.retrieveConnected(this.retrieveConnectedSuccess, this.handleError, {});

    } else {

      //There should be a good balance between scanning and pausing, so the Battery doesnt drain.
      const intervalID = setInterval(this.updateDeviceList, 1000);

      this.switchScanState();
    }
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

          this.bluetoothle.startScan({ allowDuplicates: true })
          .subscribe(result => this.startScanSuccess(result));

        }
      } else {
        this.bluetoothle.stopScan();
        this.log('Stopping Scan...', 'status');
        const devicesContainer: HTMLElement = document.getElementById('devices');
        devicesContainer.innerHTML = '';
      }
    });

  };

  /*const requestPermissionSuccess = (_result) => {
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
  };*/

  startScanSuccess = (_result) => {

    if (_result.status === 'scanStarted') {
      this.log('Scanning for devices...', 'status');
    }
    else if (_result.status === 'scanResult') {

      if (!this.devices.some((device) =>
        device.address === _result.address
      )) {

        this.devices.push(_result);
        //this.updateDeviceList();

        //addDevice(result.name, result.address);
      } else {
        //Update RSSI For Devices
        for (const device of this.devices) {
          if(device.address === _result.address) {
            device.rssi = _result.rssi;
          }
        }
        //this.updateDeviceList();
      }
    }
  };

  updateDeviceList = () => {
    const devicesContainer: HTMLElement = document.getElementById('devices');
    devicesContainer.innerHTML = '';

    this.devices.forEach(device => {
      this.createDeviceElement(device);
      this.makeChart(device);
    });
  };

  createDeviceElement = (_device) => {

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

  startAdvertising = () => {

    this.log('Starting to advertise for other devices...', 'status');

    //Tab1Page.bluetoothle.startAdvertising(startAdvertisingSuccess, handleError, { services: [] });
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

    if (!this.devices.length) {

      this.log('NO DEVICES FOUND');
    }
    else {

      this.log('Found ' + this.devices.length + ' devices.', 'status');
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
}

interface Chartelement {
  chart: Chart;
  device: any;
  rssi: number[];
}
