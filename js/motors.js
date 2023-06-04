import { Robot } from './robot.js';
import sendMessage from './message.js';
import * as utils from './utils.js';
/**
@typedef {{status: "succeeded" | "aborted" | "canceled" | "unknown", result: "not docked" | "docked" }} DockStatus
*/

export default class Motors {
  robot;
  device = 1;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {number} leftMotorSpeed in mm per second
  @param {number} rightMotorSpeed in mm per second
  @returns {Promise<void>}
  */
  async setLeftAndRightMotorSpeed(leftMotorSpeed, rightMotorSpeed) {
    const command = 4;
    const payload = new Uint8Array(8);

    payload.set(utils.getBytes(leftMotorSpeed, 4, true, 100, -100));
    payload.set(utils.getBytes(rightMotorSpeed, 4, true, 100, -100), 4);

    await this.robot.sendPacketWithoutResponse(this.device, command, payload);
  }

  /**
  @param {number} motorSpeed in mm per second
  @returns {Promise<void>}
  */
  async setLeftMotorSpeed(motorSpeed) {
    const payload = new Uint8Array(8);
    payload.set(utils.getBytes(motorSpeed, 4, true, 100, -100));

    await this.robot.sendPacketWithoutResponse(this.device, 6, payload);
  }

  /**
  @param {number} motorSpeed in mm per second
  @returns {Promise<void>}
  */
  async setRightMotorSpeed(motorSpeed) {
    const payload = new Uint8Array(8);
    payload.set(utils.getBytes(motorSpeed, 4, true, 100, -100));

    await this.robot.sendPacketWithoutResponse(this.device, 7, payload);
  }

  /**
  @param {number} distance in mm
  @returns {Promise<PositionStatus>}
  */
  async driveDistance(distance) {
    const payload = new Uint8Array(4);
    const bytes = utils.getBytes(distance, 4, true);
    payload.set(bytes);

    const packet = await this.robot.sendPacketWithResponse("driveDistanceFinishedResponse", this.device, 8, payload);
    return this.#positionStatus(packet);
  }

  /**
  @param {number} angle in deci-degrees i.e. 3600 per rotation
  @returns {Promise<PositionStatus>}
  */
  async rotateAngle(angle) {
    const payload = new Uint8Array(4);
    const bytes = utils.getBytes(angle, 4, true);
    payload.set(bytes);
    const packet = await this.robot.sendPacketWithResponse("rotateAngleFinishedResponse", this.device, 12, payload);
    return this.#positionStatus(packet);
  }

  /**
  @param {0 | 1} active 0: always off; 1: always on; 2: marker down (Root only)
  @param {number} amount in deci-percent min 0 (off); max 3000 (300%); default 500 (50%)
  @returns {Promise<void>}
  */
  async setGravityCompensation(active, amount = 500) {
    const payload = new Uint8Array(3);
    const bytes = utils.getBytes(amount, 2, false, 3000);
    payload.set([active]);
    payload.set(bytes, 1);
    await this.robot.sendPacketWithoutResponse(this.device, 13, payload);
  }

  /**
  @returns {Promise<void>}
  */
  async resetPosition() {
    await this.robot.sendPacketWithoutResponse(this.device, 15);
  }

  /**
  @returns {Promise<PositionStatus>}
  */
  async getPosition() {
    const packet = await this.robot.sendPacketWithResponse("getPositionResponse", this.device, 16);
    return this.#positionStatus(packet);
  }

  /**
  @param {number} x coordinate in mm
  @param {number} y coordinate in mm
  @param {number} heading final orientation in deci-degrees;
                          max: 3599;
                           -1: robot can choose final orientation
  @returns {Promise<PositionStatus>}
  */
  async navigateToPosition(x, y, heading = -1) {
    const payload = new Uint8Array(10);
    const xBytes = utils.getBytes(x, 4, true);
    const yBytes = utils.getBytes(y, 4, true);

    const headingBytes = utils.getBytes(heading, 2, true, 3599, -1);

    payload.set(xBytes.concat(yBytes, headingBytes));
    const packet = await this.robot.sendPacketWithResponse("navigateToPositionFinishedResponse", this.device, 17, payload);
    return this.#positionStatus(packet);
  }

  /**
  @returns {Promise<DockStatus>}
  */
  async dock() {
    sendMessage("Docking", 4000);
    const packet = await this.robot.sendPacketWithResponse("dock", this.device, 19);
    sendMessage("Docking", 4000);

    return this.#dockStatus(packet);
  }

  /**
  @returns {Promise<DockStatus>}
  */
  async undock() {
    sendMessage("Undocking", 4000);
    const packet = await this.robot.sendPacketWithResponse("undock", this.device, 20);
    sendMessage("Undocked", 4000);

    return this.#dockStatus(packet);
  }

  /**
  @param {number} angle in deci-degrees, positive clockwise, negative counterclockwise
                        min: -2,147,483,648 (0x80000000)
                        max:  2,147,483,647 (0x7FFFFFFF)
  @param {number} radius in mm
                         Negative value indicates rotation point to the left of the robot
                         min: -2,147,483,648 (0x80000000)
                         Positive value indicates rotation point to the right of the robot
                         max:  2,147,483,647 (0x7FFFFFFF)
  @returns {Promise<PositionStatus>}
  */
  async driveArc(angle, radius) {
    const angleBytes = utils.getBytes(angle, 4, true);
    const radiusBytes = utils.getBytes(radius, 4, true);
    const payload = new Uint8Array(8);
    payload.set(angleBytes.concat(radiusBytes));
    const packet = await this.robot.sendPacketWithResponse("driveArcFinishedResponse", this.device, 27, payload);
    return this.#positionStatus(packet);
  }

  /**
  @typedef {{x: number, y: number, heading: number}} PositionStatus
  @param {DataView} packet
  @returns {PositionStatus}
  */
  #positionStatus(packet) {
    const x = packet.getInt32(7);
    const y = packet.getInt32(11);
    const heading = packet.getInt16(15) / 10.0;
    return { x: x, y: y, heading: heading };
  }

  /**
  @param {DataView} packet
  @returns {DockStatus}
  */
  #dockStatus(packet) {
    // const time = utils.readTimestamp(packet);
    const status = packet.getUint8(7) === 0 ? "succeeded" :
                   packet.getUint8(7) === 1 ? "aborted" :
                   packet.getUint8(7) === 4 ? "canceled" : "unknown";

    const result = packet.getUint8(8) === 0 ? "not docked" : "docked";
    return { status: status, result: result };
  }

}
