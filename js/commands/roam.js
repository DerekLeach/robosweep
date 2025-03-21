import { Halt } from './halt.js';
import Obstacle from './obstacle.js';

/**
@typedef {import('../robot.js').Robot} Robot
@typedef {import('./sweep.js').Command} Command
@implements Command
*/
export default class Roam {
  /**@type {Command | Halt}*/
  nextCommand;

  controller = new AbortController();

  /**
  @param {Robot} robot
  @param {AbortController} emergencyStop
  */
  constructor(robot, emergencyStop) {
    this.robot = robot;
    // this.nextCommand = new Obstacle(this.robot, emergencyStop);
    this.nextCommand = new Halt(this.robot);
    this.emergencyStop = emergencyStop;
  }

  async start() {
    this.nextCommand = new Obstacle(this.robot, this.emergencyStop);
    // @ts-expect-error
    this.robot.tx.addEventListener("IRProximityEvent", this, { signal: this.controller.signal });
    console.log("Roaming: setting motor speed");
    this.robot.motors.setLeftAndRightMotorSpeed(80, 80);
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
    // const packet = /**@type {DataView}*/(event.detail.packet);
    this.controller.abort();
    console.log("Handing over to obstacle controller")
    this.nextCommand.start();
  }
}
