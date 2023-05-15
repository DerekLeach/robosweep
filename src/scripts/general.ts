import { Robot } from './robot.js';

export default class General {
  robot: Robot;
  device = 0;

  constructor(robot: Robot) {
    this.robot = robot;
  }

  async getVersions(board: "main" | "color"): Promise<void> {
    const payload = new Uint8Array(1);
    switch (board) {
      case "main": payload.set([0xA5]); break;
      case "color": payload.set([0xC6]); break;
    }
    await this.robot.sendPacket(this.device, 0, true, payload);
  }
  
  async setName() {
    
  }

  async getName() {
    await this.robot.sendPacket(this.device, 2, true);
  }

  async enableEvents(deviceEvents: number[]) {
    const payload = new Uint8Array(16);
    for (const event of deviceEvents) {
      const byte = 15 - Math.floor(event/8);
      payload.set([payload.at(byte)! + 2**(event % 8)], byte);
    }
    await this.robot.sendPacket(this.device, 7, false, payload);
  }

  async getEnabledEvents() {
    await this.robot.sendPacket(this.device, 11, true);
  }

  async getSerialNumber() {
    await this.robot.sendPacket(this.device, 14, true);
  }

  async getSKU() {
    await this.robot.sendPacket(this.device, 15, true);
  }
}
