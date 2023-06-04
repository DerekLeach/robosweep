import { Robot } from './robot.js';
import * as utils from './utils.js';

/**
@typedef {import('./robot.js').IRSensors} IRSensors
@typedef {{hysteresis: number, thresholds: [number, number, number, number, number, number, number]}} IREventThresholds
*/

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
  @returns {Promise<number[]>}
  */
  async getIRProximityValuesWithTimestamp() {
    const packet = await this.robot.sendPacketWithResponse("getIRProximityValuesWithTimestampResponse", this.device, 1);
    // const time = utils.readTimestamp(packet)
    const sensors = [];
    for (let i = 7; i < 18; i += 2) {
      sensors.push(packet.getUint16(i));
    }
    return sensors;
  }

  /**
  @returns {Promise<IRSensors>}
  */
  async getPackedIRProximityValuesAndStates() {
    const packet = await this.robot.sendPacketWithResponse("getPackedIRProximityValuesAndStatesResponse", this.device, 2);

    return this.robot.readPackedIRProximity(packet);
  }
  
  /**
  @param {number} hysteresis
                  From 0 to 4095
                  For a rising value an event will trigger at the threshold set below
                  For a falling value an event will trigger at the threshold minus hysteresis
  @param {[number, number, number, number, number, number, number]} sensors
         Sensor 0 to 7 (left to right?)
         Threshold value from 0 to 4095
  @returns {Promise<boolean>}
  */
  async setEventThresholds(hysteresis, sensors) {
    const payload = new Uint8Array(16);
    const hysteresisBytes = utils.getBytes(hysteresis, 2, false);
    payload.set(hysteresisBytes);
    for (let [index, sensor] of sensors.entries()) {
      payload.set(utils.getBytes(sensor, 2, false), index*2 + 2);
    }
    await this.robot.sendPacketWithoutResponse(this.device, 3, payload);
    const thresholds = await this.getEventThresholds();
    if (thresholds.hysteresis === hysteresis && thresholds.thresholds.toString() === sensors.toString()) {
      return true;
    } else {
      return false;
    }
  }
  
  /**
  @returns {Promise<IREventThresholds>}
  */
  async getEventThresholds() {
    const packet = await this.robot.sendPacketWithResponse("getEventThresholdsResponse", this.device, 4);
    const hysteresis = packet.getUint16(3);
    const thresholds = [];
    for (let i = 5; i < 18; i += 2) {
      thresholds.push(packet.getUint16(i))
    }
    return {
      hysteresis: hysteresis,
      thresholds: /** @type {[number, number, number, number, number, number, number]}*/(thresholds),
    };
  }
}
