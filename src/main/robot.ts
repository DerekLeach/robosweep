import sendMessage from './message.js';

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
  packetID: number;
  eventID: number;
  requestStack: [number, number, number][];

  constructor(server: BluetoothRemoteGATTServer) {
    this.server = server;
    this.packetID = 0;
    this.requestStack = [];
    this.eventID = 0;
  }

  async listenForIncomingPackets() {
    const uart = await this.server.getPrimaryService(robotServices.uart.uuid);
    const tx = await uart.getCharacteristic(robotServices.uart.characteristic.tx);
    tx.addEventListener("characteristicvaluechanged", () => this.receiveUARTPackets(tx));
    tx.startNotifications();
  }

  receiveUARTPackets(characteristic: BluetoothRemoteGATTCharacteristic) {
    sendMessage("new value", 2000);
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
              sendMessage("Motor stalled", 5000);
              this.#updateEventID(packetID);
            } else if (command === 19 || command === 20) {
              sendMessage(this.#dockStatus(payload));
            } else if (command === 8 || command === 12 || command === 16 || command === 17) {
              this.#positionStatus(payload);
            }
            break;
          // case 3: // LED Lights
          //   break;
          // case 5: // Sound
          //   break;
          // case 11: // IR Proximity
          //   break;
          // case 12: // Bumpers
          //   break;
          // case 14: // Battery
          //   break;
          // case 16: // Accelerometer
          //   break;
          // case 17: // Touch Sensors
          //   break;
          // case 19: // Docking Sensors
          //   break;
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

  async getVersions(board: "main" | "color"): Promise<void> {
    const device = 0;
    const command = 0;
    const payload = new Uint8Array(1);
    if (board === "main") {
      payload.set([0xA5]);
    } else if (board === "color") {
      payload.set([0xC6]);
    }
    await this.#sendPacket(device, command, payload, true);
  }

  async getName() {
    const device = 0;
    const command = 2;
    await this.#sendPacket(device, command, undefined, true);
  }

  async enableEvents(deviceEvents: number[]) {
    const device = 0;
    const command = 7;

    const payload = new Uint8Array(16);
    payload.fill(255);
    // for (const event of events) {

    // }
    // payload.set([1],15);
    await this.#sendPacket(device, command, payload);

  }

  async getEnabledEvents() {
    const device = 0;
    const command = 11;
    await this.#sendPacket(device, command, undefined, true);
  }

  async getSerialNumber() {
    const device = 0;
    const command = 14;
    await this.#sendPacket(device, command, undefined, true);
  }

  async getSKU() {
    const device = 0;
    const command = 15;
    await this.#sendPacket(device, command, undefined, true);
  }

  async setLeftAndRightMotorSpeed(leftMotorSpeed: number, rightMotorSpeed: number): Promise<void> {
    const device = 1;
    const command = 4;
    const motorSpeeds = new Int32Array(2);
    motorSpeeds.fill(0);
    leftMotorSpeed = leftMotorSpeed > 100 ? 100 : leftMotorSpeed;
    leftMotorSpeed = leftMotorSpeed < -100 ? -100 : leftMotorSpeed;
    rightMotorSpeed = rightMotorSpeed > 100 ? 100 : rightMotorSpeed;
    rightMotorSpeed = rightMotorSpeed < -100 ? -100 : rightMotorSpeed;
    motorSpeeds.set([rightMotorSpeed, leftMotorSpeed]);
    const payload = new Uint8Array(motorSpeeds.buffer).reverse();
    await this.#sendPacket(device, command, payload);
  }

  async setLeftMotorSpeed(leftMotorSpeed: number): Promise<void> {
    const device = 1;
    const command = 6;
    const motorSpeed = new Int32Array(1);
    motorSpeed.fill(0);
    leftMotorSpeed = leftMotorSpeed > 100 ? 100 : leftMotorSpeed;
    leftMotorSpeed = leftMotorSpeed < -100 ? -100 : leftMotorSpeed;
    motorSpeed.set([leftMotorSpeed]);
    const payload = new Uint8Array(motorSpeed.buffer).reverse();
    await this.#sendPacket(device, command, payload);
  }

  async setRightMotorSpeed(rightMotorSpeed: number): Promise<void> {
    const device = 1;
    const command = 7;
    const motorSpeed = new Int32Array(1);
    motorSpeed.fill(0);
    rightMotorSpeed = rightMotorSpeed > 100 ? 100 : rightMotorSpeed;
    rightMotorSpeed = rightMotorSpeed < -100 ? -100 : rightMotorSpeed;
    motorSpeed.set([rightMotorSpeed]);
    const payload = new Uint8Array(motorSpeed.buffer).reverse();
    await this.#sendPacket(device, command, payload);
  }

  async driveDistance(distance: number): Promise<void> {
    const device = 1;
    const command = 8;
    const payload = new Uint8Array(4);
    distance = distance >= 2**31 ? 2**31 - 1 : distance;
    distance = distance < -(2**31) ? -(2**31) : distance;
    distance = distance < 0 ? distance + 2**32 : distance;
    const distanceArray = [];
    for (let i = 3; i >= 0; i--) {
      distanceArray.push(Math.floor(distance/(256**i)) % 256);
    }
    payload.set(distanceArray);
    console.log(payload.toString());
    await this.#sendPacket(device, command, payload, true);
  }
  
  async getPosition(): Promise<void> {
    const device =1;
    const command = 16;
    await this.#sendPacket(device, command, undefined, true);
  }

  async dock(): Promise<void> {
    const device = 1;
    const command = 19;

    sendMessage("Requesting dock", 4000);
    await this.#sendPacket(device, command, undefined, true);
    sendMessage("Docking", 4000);
  }

  async undock(): Promise<void> {
    const device = 1;
    const command = 20;

    sendMessage("Requesting undock", 4000);
    await this.#sendPacket(device, command, undefined, true);
    sendMessage("Undocking", 4000);
  }

  async getBatteryLevel(): Promise<void> {
    const device = 14;
    const command = 1;
    await this.#sendPacket(device, command);
  }

  #getNewPacketID(): number {
    if (this.packetID >= 255) {
      this.packetID = 0;
      return this.packetID;
    } else {
      return this.packetID++
    }
  }

  #updateEventID(packetID: number) {
    const twosCompliment = new Uint8Array([packetID - this.eventID])
    const lostPackets = twosCompliment.at(0)! - 1;
    if (lostPackets > 0) {
      sendMessage(lostPackets.toString() + " packets lost.", 4000);
    }
    this.eventID = packetID;
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
    const timestamp = payload.at(0)!*256**3 + payload.at(1)!*256**2 + payload.at(2)!*256 + payload.at(3)!;
    let x = payload.at(4)!*256**3 + payload.at(5)!*256**2 + payload.at(6)!*256 + payload.at(7)!;
    let y = payload.at(8)!*256**3 + payload.at(9)!*256**2 + payload.at(10)!*256 + payload.at(11)!;
    x = x > 2**31 ? x - 2**32 : x;
    y = y > 2**31 ? y - 2**32 : y;
    const heading = (payload.at(12)!*256 + payload.at(13)!)/10.0;
    const milliseconds = timestamp % 1000;
    const seconds = Math.floor((timestamp / 1000) % 60);
    const minutes = Math.floor((timestamp / 1000 / 60) % 60);
    const hours = Math.floor((timestamp / 1000 / 60 / 60));
    const time = "Timestamp: " + [hours.toString(), minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":") + "." + milliseconds;
    // return time;
    sendMessage(time);
    sendMessage("x: " + x/10.0 + "cm; y: " + y/10.0 + "cm");
    sendMessage("heading: " + heading.toString() + "°");
  }
  
  #dockStatus(payload: Uint8Array): string {
    const timestamp = payload.at(0)!*256**3 + payload.at(1)!*256**2 + payload.at(2)!*256 + payload.at(3)!;
    let status = "Unknown";
    if (payload.at(4)! === 0) {
      status = "Succeeded";
    } else if (payload.at(4)! === 1) {
      status = "Aborted";
    } else if (payload.at(4)! === 2) {
      status = "Canceled";
    }
    const result = payload.at(5)! === 0 ? "Not docked" : "Docked";
    const milliseconds = timestamp % 1000;
    const seconds = Math.floor((timestamp / 1000) % 60);
    const minutes = Math.floor((timestamp / 1000 / 60) % 60);
    const hours = Math.floor((timestamp / 1000 / 60 / 60));
    const time = "Timestamp: " + [hours.toString(), minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":") + "." + milliseconds;
    return [time, result, status].join("\n");
  }

  async #sendPacket(device: number, command: number, payload?: Uint8Array, response = false) {
    const buffer = new ArrayBuffer(20);
    const packet = new Uint8Array(buffer);

    const id = this.#getNewPacketID();
    packet.fill(0);
    packet.set([device, command, id]);
    if (payload instanceof ArrayBuffer && payload.length > 16) {
      sendMessage("Payload too long");
    } else if (payload instanceof ArrayBuffer && payload.length <= 16) {
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
