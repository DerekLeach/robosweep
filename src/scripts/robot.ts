import sendMessage from './message.js';
import Motors from './motors.js';
import General from './general.js';
import Sound from './sound.js';
import IRProximity from './ir-proximity.js';
import Response from './response.js';

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
  server: BluetoothRemoteGATTServer;

  packetID = 0;
  eventID: string;
  requestStack: [number, number, number][] = [];

  general = new General(this);
  motors = new Motors(this);
  sound = new Sound(this);
  irProximity = new IRProximity(this);
  response = new Response(this);

  constructor(server: BluetoothRemoteGATTServer) {
    this.server = server;
    this.eventID = "Event ID for: " + server.device.id;
    if (!sessionStorage.getItem(this.eventID)) {
      sessionStorage.setItem(this.eventID, "-1");
    }
  }

  async listenForIncomingPackets() {
    const uart = await this.server.getPrimaryService(robotServices.uart.uuid);
    const tx = await uart.getCharacteristic(robotServices.uart.characteristic.tx);
    tx.addEventListener("characteristicvaluechanged", () => this.receiveUARTPackets(tx));
    tx.startNotifications();
  }

  receiveUARTPackets(characteristic: BluetoothRemoteGATTCharacteristic) {
    if (characteristic.value instanceof DataView) {
      const packet = new Uint8Array(characteristic.value.buffer);
      if (this.#calculateCRC(packet) === 0 && packet.length === 20) {
        const device = packet.at(0)!;
        const command = packet.at(1)!;
        const packetID = packet.at(2)!;
        const payload = packet.subarray(3, 19);
        const utf8decoder = new TextDecoder();
        switch (device) {
          case 0: // General
            switch (command) {
              case 0: this.response.getVersionsResponse(packet); break;
              case 2: this.response.getNameResponse(packet); break;
              case 4: this.response.stopProject(packet); break;
              case 11: this.response.getEnabledEventsResponse(packet); break;
              case 14: this.response.getSerialNumberResponse(packet); break;
              case 15: this.response.getSKU(packet); break;
            }
            break;
          case 1: // Motors
            switch (command) {
              case 8: this.response.driveDistanceFinishedResponse(packet); break;
              case 12: this.response.rotateAngleFinishedResponse(packet); break;
              case 16: this.response.getPositionResponse(packet); break;
              case 17: this.response.navigateToPositionFinishedResponse(packet); break;
              case 19: this.response.dock(packet); break;
              case 20: this.response.undock(packet); break;
              case 27: this.response.driveArcFinishedResponse(packet); break;
              case 29: this.response.motorStallEvent(packet); break;
            }
            break;
          case 5: // Sound
            switch (command) {
              case 0: this.response.playNoteFinishedResponse(packet); break;
              case 4: this.response.sayPhraseFinishedResponse(packet); break;
              case 5: this.response.playSweepFinishedResponse(packet); break;
            }
            break;
          case 11: // IR Proximity
            switch (command) {
              case 0: this.response.IRProximityEvent(packet); break;
              case 1: this.response.getIRProximityValuesWithTimestampResponse(packet); break;
              case 2: this.response.getPackedIRProximityValuesAndStatesResponse(packet); break;
              case 4: this.response.getEventThresholdsResponse(packet); break;
            }
            break;
          case 12: // Bumpers
            switch (command) {
              case 0: this.response.bumperEvent(packet); break;
            }
            break;
          case 14: // Battery
            switch (command) {
              case 0: this.response.batteryLevelEvent(packet); break;
              case 1: this.response.getBatteryLevelResponse(packet); break;
            }
            break;
          case 16: // Accelerometer
            switch (command) {
              case 1: this.response.getAccelerometerResponse(packet); break;
            }
            break;
          case 17: // Touch Sensors
            switch (command) {
              case 0: this.response.touchSensorEvent(packet); break;
            }
            break;
          case 19: // Docking Sensors
            switch (command) {
              case 0: this.response.dockingSensorEvent(packet); break;
              case 1: this.response.getDockingValuesResponse(packet); break;
            }
            break;
          case 20: // Cliff Sensor
            switch (command) {
              case 0: this.response.cliffEvent(packet); break;
            }
            break;
          case 100: // Connectivity
            switch (command) {
              case 0: this.response.IPv4ChangeEvent(packet); break;
              case 1: this.response.getIPv4AddressesResponse(packet); break;
              case 3: this.response.easyUpdateEvent(packet); break;
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

  async setLEDAnimation(
    state: "off" | "on" | "blink" | "spin",
    red: number,
    green: number,
    blue: number
  ): Promise<void> {
    const payload = new Uint8Array(4);

    let stateByte;
    switch (state) {
      case "off": stateByte = 0; break;
      case "on": stateByte = 1; break;
      case "blink": stateByte = 2; break;
      case "spin": stateByte = 3; break;
    }

    payload.set([stateByte, red, green, blue]);
    await this.sendPacket(3, 2, false, payload);
  }

  async getBatteryLevel(): Promise<void> {
    await this.sendPacket(14, 1, true);
  }

  async getDockingValues(): Promise<void> {
    await this.sendPacket(19, 1, true);
  }

  async getIPv4Addresses(): Promise<void> {
    await this.sendPacket(100, 1, true);
  }

  async requestEasyUpdate(): Promise<void> {
    await this.sendPacket(100, 2);
  }

  #getNewPacketID(): number {
    if (this.packetID >= 255) {
      this.packetID = 0;
      return this.packetID;
    } else {
      return this.packetID++
    }
  }

  async sendPacket(device: number, command: number, response = false, payload?: Uint8Array) {
    const buffer = new ArrayBuffer(20);
    const packet = new Uint8Array(buffer);

    const id = this.#getNewPacketID();
    packet.fill(0);
    packet.set([device, command, id]);
    if (payload instanceof Uint8Array && payload.length > 16) {
      sendMessage("Payload too long");
    } else if (payload instanceof Uint8Array && payload.length <= 16) {
      packet.set(payload, 3);
    }
    const crc = this.#calculateCRC(packet.subarray(0, 19));
    packet.set([crc], 19);

    const uart = await this.server.getPrimaryService(robotServices.uart.uuid);
    const rx = await uart.getCharacteristic(robotServices.uart.characteristic.rx);

    if (response) {
      this.requestStack.push([device, command, id]);
    }
    await rx.writeValueWithResponse(buffer);
  }

  getBytes(value: number, byteLength: number, signed: boolean, maxValue?: number, minValue?: number): number[] {
    const sign = signed ? 1 : 0;
    let maximum = 2 ** (byteLength * 8 - sign) - 1;
    let minimum = -sign * 2 ** (byteLength * 8 - sign);

    if (typeof maxValue === 'number' && maxValue < maximum) {
      maximum = maxValue;
    }

    if (typeof minValue === 'number' && minValue > minimum) {
      minimum = minValue;
    }

    if (minimum > maximum) {
      throw new Error("Minimum (" + minimum + ") is greater than maximum (" + maximum + ")");
    } else if (value > maximum) {
      throw new Error(value + " is greater than maximum permissable value: " + maximum);
    } else if (value < minimum) {
      throw new Error(value + " is less than minimum permissable value: " + minimum);
    }

    value = value < 0 ? value + 2 ** (byteLength * 8) : value;

    const bytes = [];
    for (let i = byteLength - 1; i >= 0; i--) {
      bytes.push(Math.floor(value / (256 ** i)) % 256);
    }
    return bytes;
  }
  // Copied calc_crc from:
  // https://github.com/iRobotEducation/irobot-edu-python-sdk/blob/78dc01026532225efef2b9e14dbd1ce646697e8c/irobot_edu_sdk/packet.py
  #calculateCRC(packet: Uint8Array): number {
    let crc = 0;
    for (const c of packet.values()) {
      for (let i = 0; i < 8; i++) {
        let b = crc & 0x80;
        if (c & (0x80 >> i)) {
          b ^= 0x80;
        }
        crc <<= 1;
        if (b) {
          crc ^= 0x07;
        }
      }
      crc &= 0xFF;
    }
    return crc;
  }
}
