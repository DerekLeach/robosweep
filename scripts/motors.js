import { Robot } from './robot.js';
import sendMessage from './message.js';

export default class Motors {
  /**@type {Robot}*/
  robot;
  
  device = 1;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {number} leftMotorSpeed_mmPerSecond
  @param {number} rightMotorSpeed_mmPerSecond
  @returns {Promise<void>}
  */
  async setLeftAndRightMotorSpeed(leftMotorSpeed_mmPerSecond, rightMotorSpeed_mmPerSecond) {
    const command = 4;
    const payload = new Uint8Array(8);

    payload.set(this.robot.getBytes(leftMotorSpeed_mmPerSecond, 4, true, 100, -100));
    payload.set(this.robot.getBytes(rightMotorSpeed_mmPerSecond, 4, true, 100, -100), 4);

    await this.robot.sendPacket(this.device, command, false, payload);
  }

  /**
  @param {number} motorSpeed_mmPerSecond
  @returns {Promise<void>}
  */
  async setLeftMotorSpeed(motorSpeed_mmPerSecond) {
    const payload = new Uint8Array(8);
    payload.set(this.robot.getBytes(motorSpeed_mmPerSecond, 4, true, 100, -100));

    await this.robot.sendPacket(this.device, 6, false, payload);
  }

  /**
  @param {number} motorSpeed_mmPerSecond
  @returns {Promise<void>}
  */
  async setRightMotorSpeed(motorSpeed_mmPerSecond) {
    const payload = new Uint8Array(8);
    payload.set(this.robot.getBytes(motorSpeed_mmPerSecond, 4, true, 100, -100));

    await this.robot.sendPacket(this.device, 7, false,  payload);
  }

  /**
  @param {number} distance_mm
  @returns {Promise<void>}
  */
  async driveDistance(distance_mm) {
    const payload = new Uint8Array(4);
    const bytes = this.robot.getBytes(distance_mm, 4, true);
    payload.set(bytes);

    await this.robot.sendPacket(this.device, 8, true,  payload);
  }

  /**
  @param {number} angleDeciDegrees
  @returns {Promise<void>}
  */
  async rotateAngle(angleDeciDegrees) {
    const payload = new Uint8Array(4);
    const bytes = this.robot.getBytes(angleDeciDegrees, 4, true);
    payload.set(bytes);
    await this.robot.sendPacket(this.device, 12, true, payload);
  }

  /**
  @param {0 | 1 | 2} active
  @param {number} amountDeciPerCent
  @returns {Promise<void>}
  */
  async setGravityCompensation(active, amountDeciPerCent = 500) {
    const payload = new Uint8Array(3);
    const amount = this.robot.getBytes(amountDeciPerCent, 2, false, 3000);
    payload.set([active]);
    payload.set(amount, 1);
    await this.robot.sendPacket(this.device, 13, false, payload);
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
    await this.robot.sendPacket(this.device, 16, true);
  }

  /**
  @param {number} x_mm
  @param {number} y_mm
  @param {number} headingDeciDegrees
  @returns {Promise<void>}
  */
  async navigateToPosition(x_mm, y_mm, headingDeciDegrees = -1) {
    const payload = new Uint8Array(10);
    const x = this.robot.getBytes(x_mm, 4, true);
    const y = this.robot.getBytes(y_mm, 4, true);

    const heading = this.robot.getBytes(headingDeciDegrees, 2, false, 3600);

    payload.set(x.concat(y, heading));
    await this.robot.sendPacket(this.device, 17, true, payload);
  }

  /**
  @returns {Promise<void>}
  */
  async dock() {
    sendMessage("Requesting dock", 4000);
    await this.robot.sendPacket(this.device, 19, true);
    sendMessage("Docking", 4000);
  }

  /**
  @returns {Promise<void>}
  */
  async undock() {
    sendMessage("Requesting undock", 4000);
    await this.robot.sendPacket(this.device, 20, true);
    sendMessage("Undocking", 4000);
  }

  /**
  @param {number} angleDeciDegrees
  @param {number} radius_mm
  @returns {Promise<void>}
  */
  async driveArc(angleDeciDegrees, radius_mm) {
    const angle = this.robot.getBytes(angleDeciDegrees, 4, true);
    const radius = this.robot.getBytes(radius_mm, 4, true);
    const payload = new Uint8Array(8);
    payload.set(angle.concat(radius));
    await this.robot.sendPacket(this.device, 27, true, payload);
  }
}
