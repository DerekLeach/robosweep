import sendMessage from './message.js';
import Motors from './motors.js';
import General from './general.js';
import Sound from './sound.js';
import IRProximity from './ir-proximity.js';

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
        switch (device) {
          case 0: // General
            if (command === 4) {
              sendMessage("Project stopped!", 5000);
              this.#updateEventID(packetID);
            } else {
              this.#checkRequestStack([device, command, packetID]);
              sendMessage(this.#readGeneralResponse(command, payload));
            }
            break;
          case 1: // Motors
            if (command === 29) {
              // this.#motorStalled(payload);
              this.#updateEventID(packetID);
            } else if (command === 19 || command === 20) {
              sendMessage(this.#dockStatus(payload));
            } else if (command === 8 || command === 12 || command === 16 || command === 17) {
              this.#positionStatus(payload);
            }
            break;
          case 5: // Sound
            switch (command) {
              case 0: sendMessage("Finished playing note"); break;
              case 4: sendMessage("Finished saying phrase"); break;
              case 5: sendMessage("Finished playing sweep"); break;
            }
            break;
          // case 11: // IR Proximity
          //   break;
          case 12: // Bumpers
            if (command === 0) {
              this.#updateEventID(packetID);
              const time = this.#readTimestamp(payload.subarray(0, 4))
              const state = payload.at(4);
              let bumper;
              switch (state) {
                case 0x00: bumper = "None"; break;
                case 0x40: bumper = "Right"; break;
                case 0x80: bumper = "Left"; break;
                case 0xC0: bumper = "Both"; break;
              }
              sendMessage(time + "Bumper: " + bumper);
            }
            break;
          case 14: // Battery
            if (command === 0) this.#updateEventID(packetID)
            sendMessage(this.#readBatteryLevel(payload));
            break;
          // case 16: // Accelerometer
          //   break;
          // case 17: // Touch Sensors
          //   break;
          case 19: // Docking Sensors
            if (command === 0) {
              this.#updateEventID(packetID);
              sendMessage(this.#dockingSensor(payload), 500);
            } else if (command === 1) {
              sendMessage(this.#dockingSensor(payload));
            }
            break;
          // case 20: // Cliff Sensor
          //   break;
          // case 100: // Connectivity
          //   break;
          default:
            sendMessage("Unrecognized device", 3000);
            const utf8decoder = new TextDecoder();
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

  #updateEventID(eventID: number) {
    const oldEventID = Number(sessionStorage.getItem(this.eventID))
    let lostPackets = eventID - (oldEventID + 1);
    lostPackets = lostPackets < 0 ? lostPackets + 256 : lostPackets;
    if (lostPackets > 0) {
      sendMessage(lostPackets + " packets lost.");
    }
    // this.eventID = eventID;
    sessionStorage.setItem(this.eventID, eventID.toString());
  }

  #checkRequestStack(packet: [number, number, number]): void {
    if (this.requestStack.length === 0) {
      sendMessage("No responses expected!", 3000);
      return;
    }
    let awaitingRequest;
    const tempStack: [number, number, number][] = [];
    while (awaitingRequest = this.requestStack.pop()) {
      if (awaitingRequest.toString() === packet.toString()) {
        sendMessage("Received response", 3000);
      } else {
        tempStack.push(awaitingRequest);
      }
    }
    let numberOfRequests;
    while (awaitingRequest = tempStack.pop()) {
      numberOfRequests = this.requestStack.push(awaitingRequest);
    }
    if (numberOfRequests) {
      sendMessage(numberOfRequests + " unresponded request(s)", 4000);
    }
  }

  #readGeneralResponse(command: number, payload: Uint8Array): string {
    const utf8decoder = new TextDecoder();
    switch (command) {
      case 0: // Board Version
        let response: string;
        if (payload.at(0) === 0xA5) {
          response = "Main board: ";
        } else if (payload.at(0) === 0xC6) {
          response = "Color board: "
        } else {
          return "Unrecognized board";
        }
        const firmware = "Firmware: " + String.fromCharCode(payload.at(1)!) + "." + payload.at(2) + "." + payload.at(9);
        const hardware = "Hardware: " + payload.at(3) + "." + payload.at(4);
        const bootloader = "Bootloader: " + payload.at(5) + "." + payload.at(6);
        const protocol = "Protocol: " + payload.at(7) + "." + payload.at(8);
        return response + firmware + "; " + hardware + "; " + bootloader + "; " + protocol + "; ";
      case 2: // Name
        return "Name: " + utf8decoder.decode(payload);
      case 11: // Enabled events;
        const devicesEnabled: number[] = [];
        for (let i = 15; i >= 0; i--) {
          for (let device of Array.from(payload.at(i)!.toString(2).padStart(8, '0')).reverse()) {
            devicesEnabled.push(Number(device));
          }
        }
        console.log("Devices enabled", devicesEnabled);
        return "Check log";
      case 14: // Serial Number
        return "Serial number: " + utf8decoder.decode(payload);
      case 15: // SKU
        return "SKU: " + utf8decoder.decode(payload);
      default:
        return "Unknown command";
    }
  }

  #positionStatus(payload: Uint8Array): void {
    let x = payload.at(4)! * 256 ** 3 + payload.at(5)! * 256 ** 2 + payload.at(6)! * 256 + payload.at(7)!;
    let y = payload.at(8)! * 256 ** 3 + payload.at(9)! * 256 ** 2 + payload.at(10)! * 256 + payload.at(11)!;
    x = x > 2 ** 31 ? x - 2 ** 32 : x;
    y = y > 2 ** 31 ? y - 2 ** 32 : y;
    const heading = (payload.at(12)! * 256 + payload.at(13)!) / 10.0;
    const time = this.#readTimestamp(payload.subarray(0, 4));
    sendMessage(time);
    sendMessage("x: " + x / 10.0 + "cm; y: " + y / 10.0 + "cm");
    sendMessage("heading: " + heading.toString() + "°");
  }

  #dockStatus(payload: Uint8Array): string {
    let status = "Unknown";
    if (payload.at(4)! === 0) {
      status = "Succeeded";
    } else if (payload.at(4)! === 1) {
      status = "Aborted";
    } else if (payload.at(4)! === 2) {
      status = "Canceled";
    }
    const time = this.#readTimestamp(payload.subarray(0, 4));
    const result = payload.at(5)! === 0 ? "Not docked" : "Docked";
    return [time, result, status].join("\n");
  }

  #dockingSensor(payload: Uint8Array): string {
    const contacts = payload.at(4);
    const irSensor0 = payload.at(5);
    const irSensor1 = payload.at(6);
    // const irSensor2 = payload.at(7);
    const time = this.#readTimestamp(payload.subarray(0, 4));
    return time + " Contacts: " + contacts + "IR Sensor 0: " + irSensor0 + "IR Sensor 1: " + irSensor1;
  }

  #readTimestamp(payload: Uint8Array): string {
    const timestamp = payload.at(0)! * 256 ** 3 + payload.at(1)! * 256 ** 2 + payload.at(2)! * 256 + payload.at(3)!;
    const milliseconds = timestamp % 1000;
    const seconds = Math.floor((timestamp / 1000) % 60);
    const minutes = Math.floor((timestamp / 1000 / 60) % 60);
    const hours = Math.floor((timestamp / 1000 / 60 / 60));
    return "Time: " + [hours.toString(), minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":") + "." + milliseconds;
  }

  #readBatteryLevel(payload: Uint8Array): string {
    const timestamp = this.#readTimestamp(payload.subarray(0, 4))
    const voltage = payload.at(4)! * 256 + payload.at(5)!;
    const percent = payload.at(6)!;
    return timestamp + " Battery: " + voltage/1000.0 + "V, " + percent + "%";
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
