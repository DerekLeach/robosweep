import { Robot } from './robot.js';

export default class IRProximity {
  robot;
  device = 11;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }
  

  /**
  @returns {Promise<void>}
  */
  async getIRProximityValuesWithTimestamp() {
    await this.robot.sendPacket(this.device, 1, true);
  }

  /**
  @returns {Promise<void>}
  */
  async getPackedIRProximityValuesAndStates() {
    await this.robot.sendPacket(this.device, 2, true);
  }
  
  /**
  @param {number} hysteresis
  @param {[number, number, number, number, number, number, number]} sensors
  @returns {Promise<void>}
  */
  async setEventThresholds(hysteresis, sensors) {
    const payload = new Uint8Array(16);
    const hysteresisBytes = this.robot.getBytes(hysteresis, 2, false);
    payload.set(hysteresisBytes);
    for (let [index, sensor] of sensors.entries()) {
      payload.set(this.robot.getBytes(sensor, 2, false), index*2 + 2);
    }
    await this.robot.sendPacket(this.device, 3, false, payload);
  }
  
  /**
  @returns {Promise<void>}
  */
  async getEventThresholds() {
    await this.robot.sendPacket(this.device, 4, true);
  }
}
