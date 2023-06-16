import sendMessage from './message.js';
import Motors from './motors.js';
import General from './general.js';
import Sound from './sound.js';
import IRProximity from './ir-proximity.js';
import Events from './events.js';
import * as utils from './utils.js';

/**
@typedef {{timestamp: string, triggered: boolean[], value: number[]}} IRSensors
@typedef {{percent: number, voltage: number}} BatteryLevel
@typedef {{contacts: boolean, IRSensor0: number, IRSensor1: number}} DockingSensors
@typedef {{ wlan0: string, wlan1: string, usb0: string }} IPv4Addresses
*/

export const robotServices = {
  identifier: {
    uuid: '48c5d828-ac2a-442d-97a3-0c9822b04979',
  },
  information: {
    uuid: '0000180a-0000-1000-8000-00805f9b34fb',
    characteristic: {
      serialNumber: '00002a25-0000-1000-8000-00805f9b34fb',
      firmwareVersion: '00002a26-0000-1000-8000-00805f9b34fb',
      hardwareVersion: '00002a27-0000-1000-8000-00805f9b34fb',
      manufacturer: '00002a29-0000-1000-8000-00805f9b34fb',
      state: '00008bb6-0000-1000-8000-00805f9b34fb',
      unknownCharacteristic: '00002a50-0000-1000-8000-00805f9b34fb',
    }
  },
  uart: {
    uuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    characteristic: {
      rx: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
      tx: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
    }
  }
}

export class Robot {
  server;

  packetID = 0;
  eventID;
  /**@type {Set<string>}*/
  requestStack = new Set();

  general = new General(this);
  motors = new Motors(this);
  sound = new Sound(this);
  irProximity = new IRProximity(this);
  events = new Events(this);

  /**
  @param {BluetoothRemoteGATTServer} server
  @param {BluetoothRemoteGATTCharacteristic} rx
  @param {BluetoothRemoteGATTCharacteristic} tx
  */
  constructor(server, rx, tx) {
    this.server = server;
    this.rx = rx;
    this.tx = tx;
    this.eventID = "Event ID for: " + server.device.id;
    if (!sessionStorage.getItem(this.eventID)) {
      sessionStorage.setItem(this.eventID, "-1");
    }
    tx.addEventListener("characteristicvaluechanged", () => this.receiveUARTPackets(tx));
    tx.addEventListener("characteristicvaluechanged", this.#eventDispatcher);
    tx.startNotifications();
  }

  /**
  @param {BluetoothRemoteGATTCharacteristic} characteristic
  */
  receiveUARTPackets(characteristic) {
    if (characteristic.value instanceof DataView) {
      const packet = new Uint8Array(characteristic.value.buffer);
      if (utils.calculateCRC(packet) === 0) {
        const device = packet.at(0);
        const command = packet.at(1);
        const packetID = packet.at(2);
        const payload = packet.subarray(3, 19);
        // const crc = packet.at(19);
        const utf8decoder = new TextDecoder();
        // const message = utf8decoder.decode(payload);
        // console.log("Device: ", device, " command: ", command, " ID: ", packetID, "CRC: ", crc, " message: ", message, " payload: ", payload.toString());
        switch (device) {
          case 0: // General
            switch (command) {
              // case 0: this.events.getVersionsResponse(characteristic.value); break;
              // case 2: this.events.getNameResponse(characteristic.value); break;
              case 4: this.events.stopProject(characteristic.value); break;
              // case 11: this.events.getEnabledEventsResponse(characteristic.value); break;
              // case 14: this.events.getSerialNumberResponse(characteristic.value); break;
              // case 15: this.events.getSKU(characteristic.value); break;
            }
            break;
          case 1: // Motors
            switch (command) {
              // case 8: this.events.driveDistanceFinishedResponse(characteristic.value); break;
              // case 12: this.events.rotateAngleFinishedResponse(characteristic.value); break;
              // case 16: this.events.getPositionResponse(characteristic.value); break;
              // case 17: this.events.navigateToPositionFinishedResponse(characteristic.value); break;
              // case 19: this.events.dock(characteristic.value); break;
              // case 20: this.events.undock(characteristic.value); break;
              // case 27: this.events.driveArcFinishedResponse(characteristic.value); break;
              case 29: this.events.motorStallEvent(characteristic.value); break;
            }
            break;
          case 5: // Sound
            switch (command) {
              // case 0: this.events.playNoteFinishedResponse(characteristic.value); break;
              // case 4: this.events.sayPhraseFinishedResponse(characteristic.value); break;
              // case 5: this.events.playSweepFinishedResponse(characteristic.value); break;
            }
            break;
          case 11: // IR Proximity
            switch (command) {
              case 0: this.events.IRProximityEvent(characteristic.value); break;
              // case 1: this.events.getIRProximityValuesWithTimestampResponse(characteristic.value); break;
              // case 2: this.events.getPackedIRProximityValuesAndStatesResponse(characteristic.value); break;
              // case 4: this.events.getEventThresholdsResponse(characteristic.value); break;
            }
            break;
          case 12: // Bumpers
            switch (command) {
              case 0: this.events.bumperEvent(characteristic.value); break;
            }
            break;
          case 14: // Battery
            switch (command) {
              case 0: this.events.batteryLevelEvent(characteristic.value); break;
              // case 1: this.events.getBatteryLevelResponse(characteristic.value); break;
            }
            break;
          case 16: // Accelerometer
            switch (command) {
              // case 1: this.events.getAccelerometerResponse(characteristic.value); break;
            }
            break;
          case 17: // Touch Sensors
            switch (command) {
              case 0: this.events.touchSensorEvent(characteristic.value); break;
            }
            break;
          case 19: // Docking Sensors
            switch (command) {
              case 0: this.events.dockingSensorEvent(characteristic.value); break;
              // case 1: this.events.getDockingValuesResponse(characteristic.value); break;
            }
            break;
          case 20: // Cliff Sensor
            switch (command) {
              case 0: this.events.cliffEvent(characteristic.value); break;
            }
            break;
          case 100: // Connectivity
            switch (command) {
              case 0: this.events.IPv4ChangeEvent(characteristic.value); break;
              // case 1: this.events.getIPv4AddressesResponse(characteristic.value); break;
              case 3: this.events.easyUpdateEvent(characteristic.value); break;
            }
            break;
          default:
            sendMessage("Unrecognized device, see log");
            const message = utf8decoder.decode(payload);
            console.log("Device: ", device, " command: ", command, " ID: ", packetID, " message: ", message, " payload: ", payload.toString());
        }
      } else {
        sendMessage("Packet corrupted");
      }
    }
  }

  /**
  @param {Event} event
  */
  #eventDispatcher(event) {
    const packet = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target).value;
    if (packet instanceof DataView) {
      if (utils.calculateCRC(packet) === 0) {
        let eventName;
        switch (packet.getUint16(0)) {
          case 0x0000: eventName = "getVersionsResponse"; break;
          case 0x0002: eventName = "getNameResponse"; break;
          case 0x0004: eventName = "stopProject"; break;
          case 0x000B: eventName = "getEnabledEventsResponse"; break;
          case 0x000E: eventName = "getSerialNumberResponse"; break;
          case 0x000F: eventName = "getSKU"; break;
          case 0x0108: eventName = "driveDistanceFinishedResponse"; break;
          case 0x010C: eventName = "rotateAngleFinishedResponse"; break;
          case 0x0110: eventName = "getPositionResponse"; break;
          case 0x0111: eventName = "navigateToPositionFinishedResponse"; break;
          case 0x0113: eventName = "dock"; break;
          case 0x0114: eventName = "undock"; break;
          case 0x011B: eventName = "driveArcFinishedResponse"; break;
          case 0x011D: eventName = "motorStallEvent"; break;
          case 0x0500: eventName = "playNoteFinishedResponse"; break;
          case 0x0504: eventName = "sayPhraseFinishedResponse"; break;
          case 0x0505: eventName = "playSweepFinishedResponse"; break;
          case 0x0B00: eventName = "IRProximityEvent"; break;
          case 0x0B01: eventName = "getIRProximityValuesWithTimestampResponse"; break;
          case 0x0B02: eventName = "getPackedIRProximityValuesAndStatesResponse"; break;
          case 0x0B04: eventName = "getEventThresholdsResponse"; break;
          case 0x0C00: eventName = "bumperEvent"; break;
          case 0x0E00: eventName = "batteryLevelEvent"; break;
          case 0x0E01: eventName = "getBatteryLevelResponse"; break;
          case 0x1001: eventName = "getAccelerometerResponse"; break;
          case 0x1100: eventName = "touchSensorEvent"; break;
          case 0x1300: eventName = "dockingSensorEvent"; break;
          case 0x1301: eventName = "getDockingValuesResponse"; break;
          case 0x1400: eventName = "cliffEvent"; break;
          case 0x6400: eventName = "IPv4ChangeEvent"; break;
          case 0x6401: eventName = "getIPv4AddressesResponse"; break;
          case 0x6403: eventName = "easyUpdateEvent"; break;
          default: eventName = "unknownEvent";
          // const device = packet.at(0);
          // const command = packet.at(1);
          // const packetID = packet.at(2);
          // const payload = packet.subarray(3, 19);
          // const utf8decoder = new TextDecoder();
          // sendMessage("Unrecognized device, see log");
          // const message = utf8decoder.decode(payload);
          // console.log("Device: ", device, " command: ", command, " ID: ", packetID, " message: ", message, " payload: ", payload.toString());
        }
        const myEvent = new CustomEvent(eventName, { detail: { packet: packet } });
        /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target).dispatchEvent(myEvent);
      } else {
        sendMessage("Packet corrupted");
      }
    }
  }

  /**
  @param {"off" | "on" | "blink" | "spin"} state
  @param {number} red 0 is off, 255 is full brightness
  @param {number} green 0 is off, 255 is full brightness
  @param {number} blue 0 is off, 255 is full brightness
  @returns {Promise<void>}
  */
  async setLEDAnimation(state, red, green, blue) {
    const payload = new Uint8Array(4);

    let stateByte;
    switch (state) {
      case "off": stateByte = 0; break;
      case "on": stateByte = 1; break;
      case "blink": stateByte = 2; break;
      case "spin": stateByte = 3; break;
    }

    payload.set([stateByte, red, green, blue]);
    await this.sendPacketWithoutResponse(3, 2, payload);
  }

  /**
  @returns {Promise<{ percent: number, milliVolts: number}>}
  */
  async getBatteryLevel() {
    const packet = await this.sendPacketWithResponse("getBatteryLevelResponse", 14, 1);

    // const timestamp = utils.readTimestamp(packet)
    const voltage = packet.getUint16(7);
    const percent = packet.getUint8(9);
    return { percent: percent, milliVolts: voltage }
  }

  /**
  @returns {Promise<{x: number, y: number, z: number}>}
  */
  async getAccelerometer() {
    const packet = await this.sendPacketWithResponse("getAccelerometerResponse", 16, 1);
    // const time = utils.readTimestamp(packet)
    const x = packet.getInt16(7);
    const y = packet.getInt16(9);
    const z = packet.getInt16(11);
    return { x: x, y: y, z: z };
  }

  /**
  @returns {Promise<DockingSensors>}
  */
  async getDockingValues() {
    const packet = await this.sendPacketWithResponse("getDockingValuesResponse", 19, 1);
    return this.readDockingSensor(packet);
  }

  /**
  @returns {Promise<IPv4Addresses>}
  */
  async getIPv4Addresses() {
    const packet = await this.sendPacketWithResponse("getIPv4AddressesResponse", 100, 1);
    return this.readIPv4Addresses(packet);
  }

  /**
  @returns {Promise<void>}
  */
  async requestEasyUpdate() {
    await this.sendPacketWithoutResponse(100, 2);
  }


  /**
  @param {number} device
  @param {number} command
  @param {Uint8Array} [payload]
  @returns {Promise<void>}
  */
  async sendPacketWithoutResponse(device, command, payload) {
    const packet = this.#assemblePacket(device, command, payload)
    return await this.rx.writeValueWithResponse(packet.buffer);
  }

  /**
  @param {string} eventName
  @param {number} device
  @param {number} command
  @param {Uint8Array} [payload]
  @returns {Promise<DataView>}
  */
  async sendPacketWithResponse(eventName, device, command, payload) {
    const packet = this.#assemblePacket(device, command, payload)
    // const packetID = packet.subarray(0, 3).toString();
    const controller = new AbortController();

    const result = new Promise((resolve) => {
      // @ts-ignore
      this.tx.addEventListener(
        eventName,
        (event) => {
          controller.abort();
          resolve(/**@type {CustomEvent}*/(event).detail.packet);
        },
        // @ts-ignore
        { signal: controller.signal }
      )
    });
    await this.rx.writeValueWithResponse(packet.buffer);

    return result;
  }

  /**
  @param {number} device
  @param {number} command
  @param {Uint8Array} [payload]
  @returns {Uint8Array}
  */
  #assemblePacket(device, command, payload) {
    const packet = new Uint8Array(20);
    const id = this.#getNewPacketID();
    packet.set([device, command, id]);
    if (payload instanceof Uint8Array && payload.length > 16) {
      sendMessage("Payload too long");
    } else if (payload instanceof Uint8Array && payload.length <= 16) {
      packet.set(payload, 3);
    }
    const crc = utils.calculateCRC(packet.subarray(0, 19));
    packet.set([crc], 19);
    return packet;
  }

  /**
  @returns {number}
  */
  #getNewPacketID() {
    if (this.packetID >= 255) {
      this.packetID = 0;
      return this.packetID;
    } else {
      return this.packetID++
    }
  }

  /**
  @param {DataView} packet
  @returns {IRSensors} Sensors 0 to 6, left to right from robot's point of view
  */
  readPackedIRProximity(packet) {
    const timestamp = utils.readTimestamp(packet)

    const numberOfSensors = 7;
    const triggered = new Array(numberOfSensors);;
    const value = new Array(numberOfSensors);

    for (let i = 0; i < numberOfSensors; i++) {
      triggered[i] = packet.getUint8(7) & 2 ** i ? true : false;
      value[i] = packet.getUint8(i + 8) * 16 + ((packet.getUint8(Math.floor(i / 2) + 15) >> 4 * (1 - i % 2)) & 15);
    }

    return { timestamp: timestamp, triggered: triggered, value: value };
  }

  /**
  @param {DataView} packet
  @returns {BatteryLevel}
  */

  readBatteryLevel(packet) {
    // const timestamp = utils.readTimestamp(packet)
    const voltage = packet.getUint16(7);
    const percent = packet.getUint8(9);
    return { percent: percent, voltage: voltage / 10.0 };
  }

  /**
  @param {DataView} packet
  @returns {DockingSensors}
  */
  readDockingSensor(packet) {
    // const time = utils.readTimestamp(packet);
    const contacts = packet.getUint8(7) === 0 ? false : packet.getUint8(7) === 1 ? true : false;
    const irSensor0 = packet.getUint8(8);
    const irSensor1 = packet.getUint8(9);
    return { contacts: contacts, IRSensor0: irSensor0, IRSensor1: irSensor1 };
  }

  /**
  @param {DataView} packet
  @returns {IPv4Addresses}
  */
  readIPv4Addresses(packet) {
    const uint8 = new Uint8Array(packet.buffer);
    const wlan0 = uint8.subarray(3, 7).join(".");
    const wlan1 = uint8.subarray(7, 11).join(".");
    const usb0 = uint8.subarray(11, 15).join(".");
    return { wlan0: wlan0, wlan1: wlan1, usb0: usb0 }
  }
}
