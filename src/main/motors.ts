import { Robot } from './robot.js';
import sendMessage from './message.js';

export default class Motors {
  robot: Robot;
  device = 1;

  constructor(robot: Robot) {
    this.robot = robot;
  }

  async setLeftAndRightMotorSpeed(leftMotorSpeed_mmPerSecond: number, rightMotorSpeed_mmPerSecond: number): Promise<void> {
    const command = 4;
    const payload = new Uint8Array(8);

    payload.set(this.robot.getBytes(leftMotorSpeed_mmPerSecond, 4, true, 100, -100));
    payload.set(this.robot.getBytes(rightMotorSpeed_mmPerSecond, 4, true, 100, -100), 4);

    await this.robot.sendPacket(this.device, command, false, payload);
  }

  async setLeftMotorSpeed(motorSpeed_mmPerSecond: number): Promise<void> {
    const command = 6;
    const payload = new Uint8Array(8);

    payload.set(this.robot.getBytes(motorSpeed_mmPerSecond, 4, true, 100, -100));

    await this.robot.sendPacket(this.device, command, false, payload);
  }

  async setRightMotorSpeed(motorSpeed_mmPerSecond: number): Promise<void> {
    const command = 7;
    const payload = new Uint8Array(8);

    payload.set(this.robot.getBytes(motorSpeed_mmPerSecond, 4, true, 100, -100));

    await this.robot.sendPacket(this.device, command, false,  payload);
  }

  async driveDistance(distance_mm: number): Promise<void> {
    const command = 8;
    const payload = new Uint8Array(4);
    const bytes = this.robot.getBytes(distance_mm, 4, true);
    payload.set(bytes);
    await this.robot.sendPacket(this.device, command, true,  payload);
  }

  async rotateAngle(angleDeciDegrees: number): Promise<void> {
    const command = 12;
    const payload = new Uint8Array(4);

    const bytes = this.robot.getBytes(angleDeciDegrees, 4, true);
    payload.set(bytes);
    await this.robot.sendPacket(this.device, command, true, payload);
  }

  async setGravityCompensation(active: 0 | 1 | 2, amountDeciPerCent: number = 500): Promise<void> {
    const command = 13;
    const payload = new Uint8Array(3);
    const amount = this.robot.getBytes(amountDeciPerCent, 2, false, 3000);
    payload.set([active]);
    payload.set(amount, 1);
    await this.robot.sendPacket(this.device, command, false, payload);
  }

  async resetPosition(): Promise<void> {
    const command = 15;
    await this.robot.sendPacket(this.device, command);
  }

  async getPosition(): Promise<void> {
    const command = 16;
    await this.robot.sendPacket(this.device, command, true);
  }

  async navigateToPosition(x_mm: number, y_mm: number, headingDeciDegrees: number = -1): Promise<void> {
    const command = 17;
    const payload = new Uint8Array(10);
    const x = this.robot.getBytes(x_mm, 4, true);
    const y = this.robot.getBytes(y_mm, 4, true);

    const heading = this.robot.getBytes(headingDeciDegrees, 2, false, 3600);

    payload.set(x.concat(y, heading));
    await this.robot.sendPacket(this.device, command, true, payload);
  }

  async dock(): Promise<void> {
    const command = 19;

    sendMessage("Requesting dock", 4000);
    await this.robot.sendPacket(this.device, command, true);
    sendMessage("Docking", 4000);
  }

  async undock(): Promise<void> {
    const command = 20;

    sendMessage("Requesting undock", 4000);
    await this.robot.sendPacket(this.device, command, true);
    sendMessage("Undocking", 4000);
  }

  async driveArc(angleDeciDegrees: number, radius_mm: number): Promise<void> {
    const command = 27;
    const angle = this.robot.getBytes(angleDeciDegrees, 4, true);
    const radius = this.robot.getBytes(radius_mm, 4, true);
    const payload = new Uint8Array(8);
    payload.set(angle.concat(radius));
    await this.robot.sendPacket(this.device, command, true, payload);
  }
}
