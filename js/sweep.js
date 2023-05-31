import { Robot } from './robot.js';

export default class Sweep {
  robot;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }
  
  async start() {
    /** @type {[number, number, number, number, number, number, number]}*/
    const thresholds = [50, 50, 50, 50, 50, 50, 50];

    if (!await this.robot.irProximity.setEventThresholds(30, thresholds)) {
      throw Error("Couldn't set thresholds");
    }

    const {contacts: docked, ...sensors} = await this.robot.getDockingValues();
    console.log(sensors);

    if (docked) {
      const {status, result} = await this.robot.motors.undock();
      if (status !== 'succeeded' || result === 'docked') throw Error("Undocking failed");
      
      const controller = new AbortController();
      // @ts-ignore
      this.robot.tx.addEventListener(
        "dockingSensorEvent",
        (event) => this.#undock(/**@type {DataView}*/(/**@type {CustomEvent}*/(event).detail.packet), this.robot, controller),
        {signal: controller.signal}
      )
      await this.robot.motors.setLeftAndRightMotorSpeed(-40, -40);
    }
    
    const controller = new AbortController();

    // @ts-ignore
    this.robot.tx.addEventListener(
      "IRProximityEvent",
      () => this.#obstacle(this.robot, controller),
      {signal: controller.signal}
    );
    this.robot.motors.setLeftAndRightMotorSpeed(30, 30);
  }
  
    /**
  @param {DataView} packet
  @param {Robot} robot
  @param {AbortController} controller
  */
  #undock(packet, robot, controller) {

    robot.motors.setLeftAndRightMotorSpeed(0, 0);
    controller.abort();
  }
  
  /**
  @param {Robot} robot
  @param {AbortController} controller
  */
  #obstacle(robot, controller) {
    robot.motors.setLeftAndRightMotorSpeed(0, 0);
    controller.abort();
  }
}
