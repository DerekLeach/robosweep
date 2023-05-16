import { Robot } from './robot.js';

export default class General {
  /** @type {Robot}*/
  robot;
  /** @type {number} */
  device = 0;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {"main" | "color"} board
  @returns {Promise<void>}
  */
  async getVersions(board) {
    const payload = new Uint8Array(1);
    switch (board) {
      case "main": payload.set([0xA5]); break;
      case "color": payload.set([0xC6]); break;
    }
    await this.robot.sendPacket(this.device, 0, true, payload);
  }

  /**
  @returns {Promise<void>}
  */
  async setName() {

  }

  /**
  @returns {Promise<void>}
  */
  async getName() {
    await this.robot.sendPacket(this.device, 2, true);
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
    await this.robot.sendPacket(this.device, 7, false, payload);
  }

  /**
  @returns {Promise<void>}
  */
  async getEnabledEvents() {
    await this.robot.sendPacket(this.device, 11, true);
  }

  /**
  @returns {Promise<void>}
  */
  async getSerialNumber() {
    await this.robot.sendPacket(this.device, 14, true);
  }

  /**
  @returns {Promise<void>}
  */
  async getSKU() {
    await this.robot.sendPacket(this.device, 15, true);
  }
}
