import { Halt } from './halt.js';
import IsDocked from './is-docked.js';
/**
@typedef {import('../robot.js').Robot} Robot
@typedef {import('./sweep.js').Command} Command
@implements Command
*/
export default class Undock {

  /**@type {Command | Halt}*/
  nextCommand;

  controller = new AbortController();

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    /**@readonly*/
    this.robot = robot;
    this.nextCommand = new Halt(this.robot);
  }

  async start() {
    if (this.robot.docked === true) {
      // @ts-ignore
      this.robot.tx.addEventListener("getPositionResponse", this, { signal: this.controller.signal });

      this.robot.mapWorker.postMessage({dockingStatus: {contacts: false}})
      await this.robot.motors.setLeftAndRightMotorSpeed(-80, -80);
      await this.robot.motors.getPosition();
    } else if (this.robot.docked === false) {
      this.nextCommand.start();
    } else if (typeof this.robot.docked === 'undefined') {
      const isDocked = new IsDocked(this.robot);
      isDocked.andThen(this);
      isDocked.start();
    }
  }

  /**
  @param {Command} nextCommand
  */
  andThen(nextCommand) {
    this.nextCommand = nextCommand;
  }

  /**
  @param {CustomEvent} event
  */
  async handleEvent(event) {
    const packet = /**@type {DataView}*/(event.detail.packet);

    const distance = 300;
    const x = packet.getInt32(7);
    const y = packet.getInt32(11);
    const heading = packet.getInt16(15) / 10.0;
    const θ = heading * (Math.PI / 180);

    if (typeof this.p0 === 'undefined') {
      // Find a point at distance (~30cm) behind the robot.
      this.p0 = { x: x - distance * Math.cos(θ), y: y - distance * Math.sin(θ) };
    }

    if (typeof this.p1 === 'undefined') {
      // Find a second point to define a line at distance (~30cm) behind the robot.
      this.p1 = { x: this.p0.x + distance * Math.cos(θ + Math.PI / 2), y: this.p0.y + distance * Math.sin(θ + Math.PI / 2) };
    }

    // Calculate on which side of the line the robot is.
    const d = (this.p1.x - this.p0.x) * (y - this.p0.y) - (x - this.p0.x) * (this.p1.y - this.p0.y);
    console.log("distance: " + d)

    if (d < 0) {
      await this.robot.motors.getPosition()
    } else {
      console.log("aborting undock eventlistener");
      this.controller.abort()
      this.p0 = undefined;
      this.p1 = undefined;
      await this.robot.motors.setLeftAndRightMotorSpeed(0, 0);
      await this.robot.motors.rotateAngle(1800);
      this.nextCommand.start();
    }
  }
}
