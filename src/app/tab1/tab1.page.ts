/* eslint-disable no-underscore-dangle */
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Device } from '@awesome-cordova-plugins/device/ngx';
import { Platform } from '@ionic/angular';

import { Observable } from 'rxjs';

import { HttpClient, HttpHeaders } from '@angular/common/http';

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
  //128Bit Letters in Hexadezimal from 0-F. (minus 4 Letters)
  installationPlayerID = '73f97f9e-5c59-44da-bd1a-c1658279';
  //The end of the UUID represents the PlayerID
  playerID = '8c88';
  intervalID;
  url: SafeResourceUrl;

  constructor(private _device: Device, public _bluetoothle: BluetoothLE, public _plt: Platform,
              private changeDetection: ChangeDetectorRef, public sanitizer: DomSanitizer, public http: HttpClient) {

    new Promise((resolve) => this._plt.ready().then((readySource) => {

      console.log('Platform ready from', readySource);
      // initialize the device itself.
      this.device = this._device;
      // make an accessible bluetoothLE intance of plugin cordova-plugin-bluetoothle
      this.bluetoothle = this._bluetoothle;

      //initialize the bluetooth-adapter.
      this.bluetoothle.initialize(resolve, { request: true, statusReceiver: false }).subscribe(ble => {
        this.initializeSuccess(ble);
      });

      // initialize the peripheral-adapter.
      this.bluetoothle.initializePeripheral({ request: true }).subscribe(ble => {
        this.initializePeripheralSuccess(ble);
      });

    })).then(this.handleError);

  }

  ngOnInit() {
    document.getElementById('scan-button').addEventListener('click', this.switchScanState);
    document.getElementById('advertise-button').addEventListener('click', this.switchAdvertiseState);
    //this.url = this.sanitizer.bypassSecurityTrustResourceUrl('http://localhost:8000');
  }

  sendData() {
    this.prepareDataRequest().subscribe(
      result => this.log(result, 'status')
    );
    //this.log(output.rssi, 'status');
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  prepareDataRequest(): Observable<object> {
    const dataUrl = 'http://127.0.0.1:3000/api';
    this.deviceList.push({canvasElement: null, chart: null, device: this.device, rssi: [-50], lifetime: 0, playerID: '1234'});
    // Send Data to Server
    /*const options = {
      method: 'POST',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.deviceList)
    };

    try {
      fetch(dataUrl, options);
    } catch(err) {
      console.log(err);
      this.log(err, 'error');
    };*/

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const headers = new HttpHeaders({'Content-Type': 'application/json'});
    this.log('Ich fetche', 'status');
    return this.http.post(dataUrl, this.deviceList, { headers });
  }


  /**
   * create a chart for displaying RSSI-values on a graph.
   * create a deviceList Element.
   *
   * @param _device is the device with all its informations
   *                that comes over advertisement like RSSI & Co.
   * @param _id is the unique playerID of the new device.
   * @returns a deviceList-element with its chart.
   */
  makeChart(_device, _id): DevicePackage {

    // create the new device with dummyElements.
    const newChartElement: DevicePackage =
      {canvasElement: null, chart: null, device: _device, rssi: [_device.rssi], lifetime: 0, playerID: _id};

    // needed for Chart to show.
    Chart.register(...registerables);
    //create empty elements that can be filled with the chart.
    const htmlElementContainer = document.createElement('div');
    const htmlElement = document.createElement('canvas');
    htmlElementContainer.appendChild(htmlElement);

    // create the chart with chart.js
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

    //returns the newly createt deviceElement
    return newChartElement;
  }


  /**
   * if initialization of bluetooth adapter succeded, give info.
   *
   * @param _result contains info about the adapter status.
   */
  initializeSuccess = (_result) => {

    // adapter is ready
    if (_result.status === 'enabled') {

      this.log('Bluetooth is enabled.', 'success');

    } else {

      this.log('Bluetooth is not enabled:', 'error');

    }
  };

  /**
   * if initialization of the peripheral succeded, give info.
   *
   * @param _result contains info about the peripheral status.
   */
  initializePeripheralSuccess = (_result) => {

    // if peripheral is ready
    if (_result.status === 'enabled') {

      this.log('Peripheral ready..', 'success');

    } else {

      this.log('Peripheral not ready!', 'error');

    }
  };

  /**
   * Wenn ein Error beim Scan auftritt
   *
   * @param _error the error massage that should be printed.
   */
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

  reportValue = (_serviceUuid, _characteristicUuid, _value) => {

    document.getElementById(_serviceUuid + '.' + _characteristicUuid).textContent = _value;
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

  /**
   * kick devices from deviceList if their inactive Lifetime exceeds 2 seconds
   */
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

  /**
   * if the device isnt already scanning, the scan function is triggered,
   * otherwise the scan is stopped.
   */
  switchScanState = () => {

    // Check if the device is already scanning.
    this.bluetoothle.isScanning().then((status) => {
      if(!status.isScanning) {

        // check if the App has permission to coarse location and ask to activate if not.
        this.bluetoothle.hasPermission().then((readySource) => {

          if(!readySource.hasPermission) {
            this.bluetoothle.requestPermission().then((permissionStatus) => {
              if(permissionStatus.requestPermission) {
                this.log('Permission granted', 'success');
              } else {
                this.log('Permission denied', 'error');
              }
            },
            (error) => this.handleError(error));
          }
        });

        if(this.device.platform === 'Android') {

          // Check if the App can use GeoLocation, because its needed.
          this.bluetoothle.isLocationEnabled().then((readySource) => {

            if(!readySource.isLocationEnabled) {
              this.bluetoothle.requestLocation().then((locatioStatus) => {
                if(locatioStatus.requestLocation) {
                  this.log('Location activated', 'success');
                } else {
                  this.log('Location denied', 'error');
                }
              },
              (error) => this.handleError(error));
            }
          },
          (error) => this.handleError(error));

        } else if (this.device.platform === 'iOS') {

          this.deviceMode = 'ios';

        }

        // Start to actually scan with adapter.
        this.bluetoothle.startScan({ allowDuplicates: true })
        .subscribe(result => this.startScanSuccess(result));

        // Kick devices that did not advertise for 1 sec
        this.intervalID = setInterval(this.kickOldDevices, 1000);

      } else {

        // stop the scan on adapter
        this.bluetoothle.stopScan();

        // stop the Interval that is kicking inactive devices
        clearInterval(this.intervalID);

        // clear the device List
        this.deviceList = [];

        this.log('Stopping Scan...', 'status');
      }
    });
  };

  /**
   * this function decodes a given Unicode String.
   *
   * @param str is the encoded string
   */
  decodeUnicode = (str) => {
    // Going backwards: from byte stream, to percent-encoding, to original string.
    // eslint-disable-next-line arrow-body-style
    decodeURIComponent(atob(str).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  };

  //not used anymore
  /*bin2String(array) {
    let result = '';
    for (const x of array) {
       result += String.fromCharCode(parseInt(x, 2));
    }
    return result;
  }*/

  /**
   * handles the results of the Scan for devices with BLE-Advertisment.
   *
   * @param _result gives info about the device that was found.
   */
  startScanSuccess = (_result) => {

    // if this is the initial startsignal and no real device is found yet.
    if (_result.status === 'scanStarted') {
      this.log('Scanning for devices...', 'status');
    }

    //if the result is a found device.
    else if (_result.status === 'scanResult') {

      // if found device is not already part of deviceList then run this code.
      if (!this.deviceList.some((device) =>
        device.device.address === _result.address
      )) {

        // determines if the device takes part in the installation.
        let subscriber;
        // is the unique playerID for the found device, if its part of the installation.
        let playerID;

        // if the found device runs on iOS.
        if(this.device.platform === 'iOS') {
          // iOS returns an Object where all Uuids can be read with .serviceUuids
          const uuid = _result.advertisement.serviceUuids[0];
          // check if provided Uuid matches with installation Uuid (more to the Convention in Installtion Paper)
          if(uuid.toLowerCase().startsWith(this.installationPlayerID.toLowerCase())) {
            subscriber = true;
            playerID = uuid.substring(uuid.length - 4).toLowerCase();
          }
          // if the found device runs on Android.
        } else if (this.device.platform === 'Android') {
          //Android returns a Base64 Code that needs conversion.
          const advertisementBytes = this.bluetoothle.encodedStringToBytes(_result.advertisement);
          // conversion returns a Hex-String-Array representation of the advertisement
          const advertisingData = this.parseAdvertisingData(advertisementBytes);
          // ServiceKey 0x07 represents a list of all 128-Bit UUID's provided by the advertisement.
          const SERVICE_DATA_KEY = '0x07';
          // get the Uuid's at the ServiceKey-position.
          const serviceData = advertisingData[SERVICE_DATA_KEY];
          // if data is represented then read it.
          if (serviceData) {
            // first 16 bytes are the 128 bit UUID/ServiceID.
            const uuidBytes = new Uint16Array(serviceData.slice(0,16));
            let installationUuid = '';
            for(let i = 7; i > 0; i--) {
              if(i < 6 && i > 1) {
                installationUuid += '-';
              }
              installationUuid += uuidBytes[i].toString(16);
            }
            // check if provided Uuid matches with installation Uuid (more to the Convention in Installtion Paper)
            if(installationUuid.toLowerCase() === this.installationPlayerID.toLowerCase()) {
              subscriber = true;
              playerID = uuidBytes[0].toString(16);
            }
          }
        }

        // add a new entry to deviceList if the found device is part of the installation.
        if(subscriber) {
          // Create new Chart and give the device all its properties.
          const newDevice: DevicePackage = this.makeChart(_result, playerID);
          // add the device to the deviceList.
          this.deviceList.push(newDevice);
          // upate the angular HTML-components
          this.changeDetection.detectChanges();
          // FOR DEV: add the device RSSI-Chart to be shown in HTML.
          document.getElementById(newDevice.device.address).appendChild(newDevice.canvasElement);

          this.log('Found Device: ' + playerID, 'status');
        }

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

  /**
   * Base64 code is decoded to hex-Array.
   *
   * @param buffer the data in Base64
   * @returns the complete dataSet as Array
   */
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

  /**
   * give the advertisement data its key for the data they should represent.
   *
   * @param i the byte to decode
   * @returns positionKey for advertisement-Array
   */
  asHexString(i) {
    let hex;

    hex = i.toString(16);

    // zero padding
    if (hex.length === 1) {
        hex = '0' + hex;
    }

    return '0x' + hex;
  }


  /**
   * if the device isnt already scanning, the scan function is triggered,
   * otherwise the scan is stopped.
   */
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

  /**
   * starts the advertising of the given data.
   */
  startAdvertising = () => {

    this.log('Starting to advertise for other devices...', 'status');

    this.bluetoothle.startAdvertising({
      services: [this.installationPlayerID + this.playerID], service: this.installationPlayerID + this.playerID,
      name: 'BleBeacon', includeDeviceName: false, timeout: 0, txPowerLevel: 'high', mode: 'lowLatency'})
        .then(result => this.startAdvertisingSuccess(result), error => this.handleError(error));
  };

  /**
   * starts the advertising of the given data.
   */
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

}

interface DevicePackage {
  canvasElement: HTMLElement;
  chart: Chart;
  device: any;
  rssi: number[];
  lifetime: number;
  playerID: string;
}
