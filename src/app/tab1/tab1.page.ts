/* eslint-disable no-underscore-dangle */
import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Device } from '@awesome-cordova-plugins/device/ngx';
import { Platform } from '@ionic/angular';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import { BluetoothCallbackType, BluetoothLE } from '@awesome-cordova-plugins/bluetooth-le/ngx';
import { Chart, ChartItem, registerables } from 'node_modules/chart.js';

interface Marker {
  position: string;
  id: string;
  isChecked: boolean;
  disabled: boolean;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})

export class Tab1Page implements OnInit {

  // The markers define, which position of marker the device is taking.
  public markers: Marker[] = [
    { position: 'none', id: '', isChecked: false, disabled: false },
    { position: 'p1', id: '000000', isChecked: false, disabled: false },
    { position: 'p2', id: '000001', isChecked: false, disabled: false},
    { position: 'p3', id: '000002', isChecked: false, disabled: false},
    { position: 'p4', id: '000003', isChecked: false, disabled: false}
  ];

  public device: Device;
  //For the right ionic HTML Mode
  public deviceMode: string;
  public bluetoothle: BluetoothLE;
  public deviceList: DevicePackage[] = [];
  //128Bit Letters in Hexadezimal from 0-F. (minus 6 Letters) am ende gelöscht 79
  installationPlayerID = '73f97f9e-5c59-44da-bd1a-c16582';
  //The end of the UUID represents the PlayerID
  playerID: string;
  kickIntervalID;
  sendIntervalID;
  url: SafeResourceUrl;
  pingTimeout: any;
  showConsole = false;

  constructor(private _device: Device, public _bluetoothle: BluetoothLE, public _plt: Platform,
              private changeDetection: ChangeDetectorRef, public sanitizer: DomSanitizer, public http: HttpClient) {

    new Promise((resolve) => this._plt.ready().then((readySource) => {

      console.log('Platform ready from', readySource);
      // initialize the device itself.
      this.device = this._device;
      if(this.device.platform === 'iOS') {
        this.deviceMode = 'ios';
      } else {
        this.deviceMode = 'md';
      };
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

  startConnection() {
    // Just to test as long as there is no Device in Range.
    this.dataRequest('initialize');
    // TODO Switch the Timeout with an await that waits until the PlayerID is set.
    setTimeout(() => {
      if (this.playerID !== '' && this.playerID) {
        this.startAdvertising();
        this.startScanning();
      } else {
        this.log('Abort: The Server did not respond within 3 Sec', 'error');
      }
    }, 3000);

    //this.log(output.rssi, 'status');
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  /**
   * Hier wird mit dem Server kommuniziert, um gesammelte Daten an den zentralen
   * Punkt zu senden und um sich für die Intallation als Teilnehmer eine einseutige ID zu holen.
   *
   * @param type defines what the Request is for (possible: initialize, cancel...)
   */
  dataRequest(type: string = 'initialize') {

    // The Websocket of the Device, the Server is running on.
    // Laptop IP: ws://192.168.178.36:3000/api
    // Desktop IP: ws://192.168.0.175:3000/api
    const dataWs = 'ws://blebeacon.loca.lt';

    // Websocket approach
    // Create WebSocket connection.
    const socket = new WebSocket(dataWs);

    // Connection opened
    socket.addEventListener('open', (event) => {
      const rssiPackage: ServerDataPackage[] = [];
      // Dadurch dass der Average der letzten 3-20 Werte übersendet wird, entsteht eine Abhängigkeit zur Sendefrequenz.
      this.deviceList.forEach(element => {
        rssiPackage.push({id: element.playerID, rssi: this.getAverage(element.rssi, element.rssiCounts)});
      });
      socket.send(JSON.stringify({id: this.playerID, list: rssiPackage}));
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
      //this.log('Message from server: ' + event.data, 'status');
      if(event.data === 'ping') {
        clearTimeout(this.pingTimeout);

        // Use `WebSocket#terminate()`, which immediately destroys the connection,
        // instead of `WebSocket#close()`, which waits for the close timer.
        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        this.pingTimeout = setTimeout(() => {
          socket.close();
          this.stopAdvertising();
          this.stopScanning();
          // (not necessary) Delete the PlayerID so the Server does not get confused if someone else finds this device with this id.
          // this.playerID = '';
          this.log('Connection is closed due to timeout!', 'status');
          clearInterval(this.sendIntervalID);
        }, 5000 + 1000);
      } else if (JSON.parse(event.data).id) {
        // Wenn die Nachricht eine ID enthält.
        this.playerID = JSON.parse(event.data).id;
        // Set the PlayerPic
        this.drawIdPic(this.playerID);
        // Don't show connect button anymore and start animation of radar
        document.getElementById('connect').style.visibility = 'hidden';
        document.getElementById('radar').style.visibility = 'visible';
        //To update the Angular Components
        this.changeDetection.detectChanges();
        this.log('neue ID zugewiesen: ' + this.playerID, 'success');
      } else {
        this.log('Die übermittelten Daten sind nicht zulässig!', 'error');
      }
    });

    // Connection getting closed
    socket.addEventListener('close', (event) => {
      socket.close();
      this.stopAdvertising();
      this.stopScanning();
      // (not necessary) Delete the PlayerID so the Server does not get confused if someone else finds this device with this id.
      // this.playerID = '';
      clearInterval(this.sendIntervalID);
      this.log('Connection is closed!', 'status');
    });

    // Error on Socket
    socket.addEventListener('error', (error) =>
      this.handleError(error)
    );

    /*socket.addEventListener('ping', (event) =>
      this.log('this is a ping!', 'status')
    );*/

    /*
    *  Set Interval to Ping the Server with new Data every Second. The Data needs to be passed to the Intervalfunction here.
    *  The Data exists of: The deviceList.
    */
    this.sendIntervalID = setInterval(update => {
      const rssiPackage: ServerDataPackage[] = [];
      this.deviceList.forEach(element => {
        rssiPackage.push({id: element.playerID, rssi: this.getAverage(element.rssi, element.rssiCounts)});
      });
      socket.send(JSON.stringify({id: this.playerID, list: rssiPackage}));
    }, 1000);

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
      {canvasElement: null, chart: null,
        device: _device, rssi: [this.rssiToLinear(_device.rssi)], rssiCounts: [true], lifetime: 0, playerID: _id};
    /*
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
    */

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
   * @param _error the error message that should be printed.
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

        this.startScanning();

      } else {

        this.stopScanning();

      }
    });
  };

  startScanning() {

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
        this.kickIntervalID = setInterval(this.kickOldDevices, 1000);

      } else {
        this.log('The Device is already scanning!', 'status');
      }
    }, (error) => this.handleError(error));
  }

  stopScanning() {

    // Check if the device has already stopped scanning.
    this.bluetoothle.isScanning().then((status) => {
      if(status.isScanning) {

        // stop the scan on adapter
        this.bluetoothle.stopScan();

        // stop the Interval that is kicking inactive devices
        clearInterval(this.kickIntervalID);

        // clear the device List
        this.deviceList = [];

        this.log('Stopping Scan...', 'status');
      } else {
        this.log('The Device is not scanning!', 'status');
      }
    }, (error) => this.handleError(error));
  }

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

        const playerID = this.checkUUID(_result);

        // add a new entry to deviceList if the found device is part of the installation.
        // Falls das Gerät während des sendens, die Adresse wechselt. Sonst hätte man zwei mal die selbe ID im Packet.
        if(playerID && (!this.deviceList.some((device) =>
        device.playerID === playerID
        ))) {
          // Create new Chart and give the device all its properties.
          const newDevice: DevicePackage = this.makeChart(_result, playerID);
          // add the device to the deviceList.
          //this.deviceList.push(newDevice);
          this.addToDeviceList(newDevice);
          // update the angular HTML-components
          this.changeDetection.detectChanges();
          // FOR DEV: add the device RSSI-Chart to be shown in HTML.
          document.getElementById(newDevice.device.address).appendChild(newDevice.canvasElement);

          this.log('Found Device: ' + playerID, 'status');
        }

      } else {
        //Update RSSI For Devices
        for (const device of this.deviceList) {
          // Es wird noch nach Name geprüft, da bei ID wechsel sonst Fehler auftreten könnten.
          if(device.device.address === _result.address && device.playerID === this.checkUUID(_result)) {

            device.device.rssi = _result.rssi;
            device.lifetime = 0;

            // der neue RSSI-Wert wird zu einer linearen Darstellung umgerechnet.
            const linearRssi = this.rssiToLinear(_result.rssi);

            // the last 20 rssi-values are saved to calc a median
            if(device.rssi.length > 20) {
              device.rssi.shift();
              device.rssiCounts.shift();
            }
            // calculate Delta to know if the new RSSI is valid.
            device.rssiCounts.push(this.calculateDelta(device.rssi, device.rssiCounts, linearRssi));
            device.rssi.push(linearRssi);

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

  checkUUID(_result): string {
    // determines if the device takes part in the installation.
    let subscriber;
    // is the unique playerID for the found device, if its part of the installation.
    let playerID;
    // is the txPowerLevel for each Device.
    let txPowerLevel;

    // if the found device runs on iOS.
    if(this.device.platform === 'iOS') {
      // iOS returns an Object where all Uuids can be read with .serviceUuids
      const uuid = _result.advertisement.serviceUuids[0];
      // check if provided Uuid matches with installation Uuid (more to the Convention in Installtion Paper)
      if(uuid.toLowerCase().startsWith(this.installationPlayerID.toLowerCase())) {

        // Power Level to probably normalise the RSSI-Data
        txPowerLevel = _result.advertisement.txPowerLevel;

        // The PlayerID are represented in the last 6 Digits of the UUID
        playerID = uuid.substring(uuid.length - 6).toLowerCase();

      }
      // if the found device runs on Android.
    } else if (this.device.platform === 'Android') {

      //Android returns a Base64 Code that needs conversion.
      const advertisementBytes = this.bluetoothle.encodedStringToBytes(_result.advertisement);
      // conversion returns a Hex-String-Array representation of the advertisement
      const advertisingData = this.parseAdvertisingData(advertisementBytes);
      // ServiceKey 0x07 represents a list of all 128-Bit UUID's provided by the advertisement.
      const SERVICE_DATA_KEY_UUID = '0x07';
      // get the Uuid's at the ServiceKey-position.
      const serviceDataUUID = advertisingData[SERVICE_DATA_KEY_UUID];

      // if data is represented then read it.
      if (serviceDataUUID) {

        // first 16 bytes are the 128 bit UUID/ServiceID.
        const uuidBytes = new Uint16Array(serviceDataUUID.slice(0,16));
        let fullUUID = '';
        for(let i = 7; i >= 0; i--) {
          if(i < 6 && i > 1) {
            fullUUID += '-';
          }
          // needed because 0's would cause the result to be shortened.
          fullUUID += uuidBytes[i].toString(16).padStart(4, '0');
        }

        // check if provided Uuid matches with installation Uuid (more to the Convention in Installtion Paper)
        if(fullUUID.toLowerCase().startsWith(this.installationPlayerID.toLowerCase())) {

          // Power Level to probably normalise the RSSI-Data
          // ServiceKey 0x0A represents TX Power Level: 0xXX: -127 to +127 dBm.
          const SERVICE_DATA_KEY_TXPOWER = '0x0a';
          // get the Uuid's at the ServiceKey-position.
          const serviceDataTXPOWER = advertisingData[SERVICE_DATA_KEY_TXPOWER];
          if (serviceDataTXPOWER){
            const txPowerBytes = new Uint8Array(serviceDataTXPOWER);
            // Power Level to probably normalise the RSSI-Data
            txPowerLevel = txPowerBytes.toString();
            //this.log('txPowerLevel: ' + txPowerLevel, 'success');
          } else {
            //this.log('There is no readable txPower', 'error');
          }

          // The PlayerID are represented in the last 6 Digits of the UUID
          playerID = fullUUID.substring(fullUUID.length - 6).toLowerCase();

        }
      }
    }
    return playerID;
  }


 /**
  * Diese Funktion sortiert das gegebene Element an die richtige Stelle im Array.
  * (Die Funktion könnte rechnerisch verbessert werden, indem man in der mitte des Arrays anfängt und sich so zu seinem Platz hin halbiert)
  *
  * @param item is the item that needs to be sorted in
  */
  addToDeviceList(item: DevicePackage): void {

    this.deviceList.push(item);
    let j: number = this.deviceList.length - 2;
    while ((j > -1) && (this.deviceList[j].playerID > item.playerID)) {
      this.deviceList[j + 1] = this.deviceList[j];
      j--;
    }
    this.deviceList[j + 1] = item;

  }

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
    // Just start advertising if a PlayerID is given, so that the send UUID is valid.
    if (this.playerID === '' || !this.playerID) {
      this.log('Player-ID is not set yet!', 'error');
    } else {
      this.bluetoothle.isAdvertising().then(
        (status) => {
          if(status.isAdvertising) {
            this.log('Already Advertising', 'status');
          } else {
            this.log('Starting to advertise for other devices...', 'status');

            // Possible variable for better normalisation txPowerLevel: 'high'
            this.bluetoothle.startAdvertising({
              services: [this.installationPlayerID + this.playerID], service: this.installationPlayerID + this.playerID,
              name: 'BleBeacon', includeDeviceName: false, timeout: 0, txPowerLevel: 'high', mode: 'lowLatency'})
                .then(result => this.startAdvertisingSuccess(result), error => this.handleError(error));
          }
        }, (error) => this.handleError(error));
    }
  };

  /**
   * starts the advertising of the given data.
   */
  stopAdvertising = () => {

    this.bluetoothle.isAdvertising().then(
      (status) => {
        if(!status.isAdvertising) {
          this.log('Device is not Advertising!', 'status');
        } else {
          this.log('Cancelling to advertise for other devices...', 'status');

          this.bluetoothle.stopAdvertising()
              .then(result => this.stopAdvertisingSuccess(result), error => this.handleError(error));
        }
      });
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

  getContrastingColor(_color: string): string {
    if(_color && _color !== ''){
      const rgb = this.hexToRgb(_color);
      const isLight = rgb.r * 0.299 + rgb.g * 0.587 + rgb.b * 0.114 > 186;
      return isLight ? 'black' : 'white';
    }
    return 'black';
  }

  hexToRgb(_color: string): {r: number; g: number; b: number} {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(_color);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  drawIdPic(_id: string) {
    const contrastColor = this.getContrastingColor(_id);
    this.log('The id is : ' + _id, 'status');
    const id = this.hex2bin(_id);
    this.log('The bin-id is : ' + id, 'status');
    const container = document.getElementById('idPic-wrapper');
    const containerFlipped = document.getElementById('idPic-wrapper-flipped');
    for (const i of id) {
      const div = document.createElement('div');
      const div2 = document.createElement('div');
      if (i === '1') {
        div.style.backgroundColor = div2.style.backgroundColor = contrastColor;
      }
      container.appendChild(div);
      containerFlipped.appendChild(div2);
    }
  }

  hex2bin(hex){
    return (parseInt(hex, 16).toString(2)).padStart(24, '0');
  }

  toggleConsole() {
    if(!this.showConsole) {
      document.getElementById('dev').style.transform = 'translateY(0%)';
    } else {
      document.getElementById('dev').style.transform = 'translateY(-100%)';
    }
    this.showConsole = !this.showConsole;
  }

  async setMarkerState(_markerID: string) {
    this.stopAdvertising();
    this.playerID = _markerID;
    this.log('PlayerID was set to: ' + _markerID, 'status');
    this.markers.forEach(marker => {
      if(marker.id !== _markerID) {
        marker.disabled = !marker.disabled;
      }
    });
    this.drawIdPic(this.playerID);
    // Don't show connect button anymore and start animation of radar
    document.getElementById('connect').style.visibility = 'hidden';
    document.getElementById('radar').style.visibility = 'visible';
  }

  // Corrects the RSSI-Signal to linear mapping
  rssiToLinear(_signalLevelInDb: number): number {
    // Frequenz 2.4 GHz
    // const exp = (27.55 - (20 * Math.log10(2400)) + Math.abs(_signalLevelInDb)) / 20.0;
    // This would work too but as 0 distance is represented with about -20, we need a higher base
    const exp = Math.abs(_signalLevelInDb) / 20.0;
    return Math.pow(10.0, exp);
  }

  // Nach Jun Ho S.13-14
  calculateDelta(_rssiList: number[], _countsList, _rssi: number): boolean {
    const threshold = 1.5;
    const deltaList = [];

    // Damit die Averages nur auf RSSI-Werten basieren, welche auch zählen sollten.
    const countedRssiList = [];

    _rssiList.forEach((rssi, index) => {
      if(_countsList[index]) {
        countedRssiList.push(rssi);
      }
    });

    // Falls weniger als 3 Werte der Liste valide sind, wird der nächste Wert auf jeden Fall valide
    if(countedRssiList.length < 3) {
      this.log('Ich habe zu viele ungültige Versuche!', 'status');
      return true;
    }

    for (let i = 0; i < countedRssiList.length - 2; i++) {
      const delta = (countedRssiList[i+1] - countedRssiList[i]);
      deltaList.push(delta);
    }
    let averageDelta = 0;
    deltaList.forEach(element => {
      averageDelta += element;
    });
    averageDelta = averageDelta/deltaList.length;
    if(averageDelta < 1) {
      averageDelta = 1;
    }
    const currentDelta = _rssi - countedRssiList[countedRssiList.length - 1];
    const deltaRatio = Math.abs(currentDelta/averageDelta);
    let effective: boolean;
    if(deltaRatio < threshold) {
      effective = true;
    } else {
      effective = false;
    }
    return effective;
  }

  getAverage(_rssiList: number[], _countsList: boolean[]): number {
    let average = 0;
    let count = 0;
    _rssiList.forEach((rssi, index) => {
      if(_countsList[index]) {
        average += rssi;
        count++;
      }
    });
    average = (average / count);
    return average;
  }
}

interface DevicePackage {
  canvasElement: HTMLElement;
  chart: Chart;
  device: any;
  rssi: number[];
  // Describes if the rssi number at this position counts.
  rssiCounts: boolean[];
  lifetime: number;
  playerID: string;
}

interface ServerResponse {
  type: string;
  newID: string;
}

// So Typescript knows, that there is an extra boolean parameter.
interface ExtWebSocket extends WebSocket {
  pingTimeout: any;
}

interface ServerDataPackage {
  id: string;
  rssi: number;
}
