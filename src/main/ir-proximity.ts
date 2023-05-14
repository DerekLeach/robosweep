import { Robot } from './robot.js';

export default class IRProximity {
  robot: Robot;
  device = 11;

  constructor(robot: Robot) {
    this.robot = robot;
  }
  
  async getIRProximityValuesWithTimestamp() {
    const command = 1;
    await this.robot.sendPacket(this.device, command, true);
  }

  async getPackedIRProximityValuesAndStates() {
    const command = 2;
    await this.robot.sendPacket(this.device, command, true);
  }
  
  async setEventThresholds(
    hysteresis: number,
    sensors: [number, number, number, number, number, number, number]
  ): Promise<void> {
    const command = 3;
    const payload = new Uint8Array(16);
    const hysteresisBytes = this.robot.getBytes(hysteresis, 2, false);
    payload.set(hysteresisBytes);
    for (let [index, sensor] of sensors.entries()) {
      payload.set(this.robot.getBytes(sensor, 2, false), index*2 + 2);
    }
    await this.robot.sendPacket(this.device, command, false, payload);
  }
  
  async getEventThresholds(): Promise<void> {
    const command = 4;
    await this.robot.sendPacket(this.device, command, true);
  }
}
