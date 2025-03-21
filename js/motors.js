import { Robot } from './robot.js';
import sendMessage from './message.js';
import * as utils from './utils.js';
import { sendRequest } from './commands.js';
import { tx } from './bluetooth.js';
import { findRequest } from './commands.js';
import {
  ROTATE_ANGLE,
  SET_LEFT_AND_RIGHT_MOTOR_SPEED,
  DRIVE_DISTANCE
} from './utils.js';

/**
@typedef {{status: "succeeded" | "aborted" | "canceled" | "unknown", result: "not docked" | "docked" }} DockStatus
@typedef {{x: number, y: number, heading: number}} PositionStatus
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

    await this.robot.sendPacket(this.device, command, payload);
  }

  /**
  @param {number} motorSpeed in mm per second
  @returns {Promise<void>}
  */
  async setLeftMotorSpeed(motorSpeed) {
    const payload = new Uint8Array(8);
    payload.set(utils.getBytes(motorSpeed, 4, true, 100, -100));

    await this.robot.sendPacket(this.device, 6, payload);
  }

  /**
  @param {number} motorSpeed in mm per second
  @returns {Promise<void>}
  */
  async setRightMotorSpeed(motorSpeed) {
    const payload = new Uint8Array(8);
    payload.set(utils.getBytes(motorSpeed, 4, true, 100, -100));

    await this.robot.sendPacket(this.device, 7, payload);
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
  @param {number} amount in deci-percent: min 0 (off); max 3000 (300%); default 500 (50%)
  @returns {Promise<void>}
  */
  async setGravityCompensation(active, amount = 500) {
    const payload = new Uint8Array(3);
    const bytes = utils.getBytes(amount, 2, false, 3000);
    payload.set([active]);
    payload.set(bytes, 1);
    await this.robot.sendPacket(this.device, 13, payload);
  }

  /**
  @returns {Promise<void>}
  */
  async resetPosition() {
    await this.robot.sendPacket(this.device, 15);
  }

  /**
  @returns {Promise<void>}
  */
  async getPosition() {
    await this.robot.sendPacket(this.device, 16);
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


/**
@param {number} leftMotorSpeed in mm per second
@param {number} rightMotorSpeed in mm per second
@returns {Promise<void>}
*/
export async function setLeftAndRightMotorSpeed(leftMotorSpeed, rightMotorSpeed) {
  const payload = new Uint8Array(8);

  if (leftMotorSpeed > 100)
    leftMotorSpeed = 100;

  if (leftMotorSpeed < -100)
    leftMotorSpeed = -100;

  if (rightMotorSpeed > 100)
    rightMotorSpeed = 100;

  if (rightMotorSpeed < -100)
    rightMotorSpeed = -100;

  const dataView = new DataView(payload.buffer);
  dataView.setInt32(0, leftMotorSpeed);
  dataView.setInt32(4, rightMotorSpeed);

  await sendRequest("setLeftAndRightMotorSpeed", false, SET_LEFT_AND_RIGHT_MOTOR_SPEED, payload);
}

/**
@param {number} distance in mm
@returns {Promise<void>}
*/
export async function driveDistance(distance) {
  const payload = new Uint8Array(4);
  const dataView = new DataView(payload.buffer);
  dataView.setInt32(0, distance);

  if (tx === undefined)
    return;
  tx.addEventListener("characteristicvaluechanged", driveDistanceFinishedResponse);
  await sendRequest("driveDistanceFinishedResponse", true, DRIVE_DISTANCE, payload);
}

/**
 * @param {Event} event
 * @return {void}
 */
function driveDistanceFinishedResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);
  const requestFound = findRequest(tx.value, DRIVE_DISTANCE);
  if (!requestFound)
    return;
  tx.removeEventListener("characteristicvaluechanged", driveDistanceFinishedResponse);
}

/**
@param {number} angle in deci-degrees i.e. 3600 per rotation
@returns {Promise<void>}
*/
export async function rotateAngle(angle) {
  const payload = new Uint8Array(4);
  const dataView = new DataView(payload.buffer);
  dataView.setInt32(0, angle);
  if (tx === undefined)
    return;
  tx.addEventListener("characteristicvaluechanged", rotateAngleFinishedResponse);
  await sendRequest("rotateAngle", true, ROTATE_ANGLE, payload);
}

/**
 * @param {Event} event
 * @return {void}
 */
function rotateAngleFinishedResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);
  const requestFound = findRequest(tx.value, ROTATE_ANGLE);
  if (!requestFound)
    return;
  tx.removeEventListener("characteristicvaluechanged", rotateAngleFinishedResponse);
}
