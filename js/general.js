import { Robot } from './robot.js';

export default class General {
  robot;
  device = 0;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {"main" | "color"} board
  @typedef {{
              firmware: string,
              hardware: string,
              bootloader: string,
              bluetoothProtocol: string
           }} BoardInfo
  @returns {Promise<BoardInfo>}
  */
  async getVersions(board) {
    const payload = new Uint8Array(1);
    switch (board) {
      case "main": payload.set([0xA5]); break;
      case "color": payload.set([0xC6]); break;
    }
    const packet = await this.robot.sendPacketWithResponse("getVersionsResponse", this.device, 0, payload);
    const firmware = String.fromCharCode(packet.getUint8(4)) + "." + packet.getUint8(5) + "." + packet.getUint8(12);
    const hardware = packet.getUint8(6) + '.' + packet.getUint8(7);
    const bootloader = packet.getUint8(8) + '.' + packet.getUint8(9);
    const protocol = packet.getUint8(10) + '.' + packet.getUint8(11);
    // const bootloader = packet.subarray(8, 10).join('.');
    // const protocol = packet.subarray(10, 12).join('.');
    return { firmware: firmware, hardware: hardware, bootloader: bootloader, bluetoothProtocol: protocol};
  }

  /**
  @param {string} name
  @returns {Promise<string>}
  */
  async setName(name) {
    const encoder = new TextEncoder();
    const payload = encoder.encode(name).subarray(0, 16);
    await this.robot.sendPacketWithoutResponse(this.device, 1, payload);
    return this.getName();
  }

  /**
  @returns {Promise<string>}
  */
  async getName() {
    const packet = await this.robot.sendPacketWithResponse("getNameResponse", this.device, 2);
    const utf8decoder = new TextDecoder();
    return utf8decoder.decode(packet.buffer.slice(3, 19));
  }

  /**
  @returns {Promise<void>}
  */
  async stopAndReset() {
    await this.robot.sendPacketWithoutResponse(this.device, 3);
  }

  /**
  @returns {Promise<void>}
  */
  async disconnect() {
    await this.robot.sendPacketWithoutResponse(this.device, 6);
  }

  /**
  @param {number[]} deviceEvents
  @returns {Promise<void>}
  */
  async enableEvents(deviceEvents) {
    const payload = new Uint8Array(16);
    for (const event of deviceEvents) {
      const byte = 15 - Math.floor(event / 8);
      payload.set([/**@type {number}*/(payload.at(byte)) + 2 ** (event % 8)], byte);
    }
    await this.robot.sendPacketWithoutResponse(this.device, 7, payload);
  }

  /**
  @param {number[]} deviceEvents
  @returns {Promise<void>}
  */
  async disableEvents(deviceEvents) {
    const payload = new Uint8Array(16);
    for (const event of deviceEvents) {
      const byte = 15 - Math.floor(event / 8);
      payload.set([/**@type {number}*/(payload.at(byte)) + 2 ** (event % 8)], byte);
    }
    await this.robot.sendPacketWithoutResponse(this.device, 9, payload);
  }

  /**
  @returns {Promise<void>}
  */
  async getEnabledEvents() {
    const packet = await this.robot.sendPacketWithResponse("getEnabledEventsResponse", this.device, 11);
    const devicesEnabled = [];
    for (let i = 18; i >= 3; i--) {
      for (let device of Array.from(packet.getUint8(i).toString(2).padStart(8, '0')).reverse()) {
        devicesEnabled.push(Number(device));
      }
    }
    console.log("Devices enabled", devicesEnabled);
  }

  /**
  @returns {Promise<string>}
  */
  async getSerialNumber() {
    const packet = await this.robot.sendPacketWithResponse("getSerialNumberResponse", this.device, 14);
    const utf8decoder = new TextDecoder();
    return utf8decoder.decode(packet.buffer.slice(3, 19));
  }

  /**
  @returns {Promise<string>}
  */
  async getSKU() {
    const packet = await this.robot.sendPacketWithResponse("getSKU", this.device, 15);
    const utf8decoder = new TextDecoder();
    return utf8decoder.decode(packet.buffer.slice(3, 19));
  }
}
