import { Robot } from './robot.js';

export default class General {
  robot: Robot;
  device = 0;
  
  constructor(robot: Robot) {
    this.robot = robot;
  }

  async getVersions(board: "main" | "color"): Promise<void> {
    const command = 0;
    const payload = new Uint8Array(1);
    if (board === "main") {
      payload.set([0xA5]);
    } else if (board === "color") {
      payload.set([0xC6]);
    }
    await this.robot.sendPacket(this.device, command, payload, true);
  }

  async getName() {
    const command = 2;
    await this.robot.sendPacket(this.device, command, undefined, true);
  }

  async enableEvents(deviceEvents: number[]) {
    const command = 7;

    const payload = new Uint8Array(16);
    payload.fill(255);
    // for (const event of events) {

    // }
    // payload.set([1],15);
    await this.robot.sendPacket(this.device, command, payload);

  }

  async getEnabledEvents() {
    const command = 11;
    await this.robot.sendPacket(this.device, command, undefined, true);
  }

  async getSerialNumber() {
    const command = 14;
    await this.robot.sendPacket(this.device, command, undefined, true);
  }

  async getSKU() {
    const command = 15;
    await this.robot.sendPacket(this.device, command, undefined, true);
  }
}
