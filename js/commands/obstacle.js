import { Halt } from './halt.js';
import Roam from './roam.js';

/**
@typedef {import('../robot.js').Robot} Robot
@typedef {import('./sweep.js').Command} Command
@implements Command
*/
export default class Obstacle {
  /**@type {Command | Halt}*/
  nextCommand;

  controller = new AbortController();

  /**
  @param {Robot} robot
  @param {AbortController} emergencyStop
  */
  constructor(robot, emergencyStop) {
    this.robot = robot;
    this.nextCommand = new Halt(this.robot);
    this.emergencyStop = emergencyStop;
  }

  async start() {
    this.nextCommand = new Roam(this.robot, this.emergencyStop);
    // @ts-expect-error
    this.robot.tx.addEventListener("getPackedIRProximityValuesAndStatesResponse", this, { signal: this.controller.signal });
    await this.robot.irProximity.getPackedIRProximityValuesAndStates();
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
    console.log("Handling obstacle");
    const packet = /**@type {DataView}*/(event.detail.packet);
    const sensors = this.robot.readPackedIRProximity(packet);

    if (this.emergencyStop.signal.aborted) {
      console.log("Detected abort");
      await this.robot.motors.setLeftAndRightMotorSpeed(0, 0);
      this.controller.abort();
    } else if (!sensors.triggered.includes(true)) {
      console.log("No more obstacles detected")
      this.controller.abort();
      this.nextCommand.start();
    } else {
      let leftSpeed = sensors.value.reduce((a, b, i) => a - 0.05 * b * (i + 1) + 7, 0);
      let rightSpeed = sensors.value.reduce((a, b, i) => a - 0.05 * b * (7 - i) + 7, 0);
      console.log(sensors);
      console.log(leftSpeed, rightSpeed);

      if (leftSpeed < 0) {
        leftSpeed = Math.max(Math.floor(leftSpeed), -70);
      } else {
        leftSpeed = Math.min(Math.floor(leftSpeed), 70);
      }

      if (rightSpeed < 0) {
        rightSpeed = Math.max(Math.floor(rightSpeed), -70);
      } else {
        rightSpeed = Math.min(Math.floor(rightSpeed), 70);
      }

      await this.robot.motors.setLeftAndRightMotorSpeed(leftSpeed, rightSpeed);
      await this.robot.irProximity.getPackedIRProximityValuesAndStates();
    }
  }
}