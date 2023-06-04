import { Robot } from './robot.js';

export default class Sweep {
  robot;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {HTMLButtonElement} stopButton
  */
  async start(stopButton) {
    /** @type {[number, number, number, number, number, number, number]}*/
    const thresholds = [70, 70, 70, 70, 70, 70, 70];

    if (!await this.robot.irProximity.setEventThresholds(30, thresholds)) {
      throw Error("Couldn't set thresholds");
    }

    const { contacts: docked, ...sensors } = await this.robot.getDockingValues();
    console.log(sensors);

    if (docked) {
      await this.#undock();
    }

    const controller = new AbortController();
    const emergencyStop = new AbortController();
    stopButton.addEventListener('click', async () => {
      emergencyStop.abort();
      stopButton.disabled = true;
      await this.robot.motors.setLeftAndRightMotorSpeed(0, 0);
    });

    // @ts-ignore
    this.robot.tx.addEventListener(
      "IRProximityEvent",
      () => this.#obstacle(this.robot, controller, emergencyStop),
      { signal: controller.signal }
    );

    stopButton.disabled = false;
    await this.robot.motors.setLeftAndRightMotorSpeed(30, 30);
  }

  /**
  @param {Robot} robot
  @param {AbortController} controller
  @param {AbortController} emergencyStop
  */
  async #obstacle(robot, controller, emergencyStop) {
    controller.abort();

    while (!emergencyStop.signal.aborted) {
      const sensors = await robot.irProximity.getPackedIRProximityValuesAndStates();

      if (!sensors.triggered.includes(true)) break;
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

      await robot.motors.setLeftAndRightMotorSpeed(leftSpeed, rightSpeed);
    }

    if (emergencyStop.signal.aborted) {
      console.log("Detected abort");
      await robot.motors.setLeftAndRightMotorSpeed(0, 0);
    } else {
      const newController = new AbortController();

      // @ts-ignore
      robot.tx.addEventListener(
        "IRProximityEvent",
        () => this.#obstacle(this.robot, newController, emergencyStop),
        { signal: newController.signal }
      );

      await robot.motors.setLeftAndRightMotorSpeed(30, 30);
    }
  }

  async #undock() {
    const distance = 300;
    let { x, y, heading } = await this.robot.motors.getPosition();
    const theta = heading * (Math.PI / 180);

    // Find a point at distance (~30cm) behind the robot.
    const p0 = { x: x - distance * Math.cos(theta), y: y - distance * Math.sin(theta) };
    // Find a second point to define a line at distance (~30cm) behind the robot.
    const p1 = { x: p0.x + distance * Math.cos(theta + Math.PI / 2), y: p0.y + distance * Math.sin(theta + Math.PI / 2) };

    // Calculate on which side of the line the robot is.
    let d = (p1.x - p0.x) * (y - p0.y) - (x - p0.x) * (p1.y - p0.y);

    await this.robot.motors.setLeftAndRightMotorSpeed(-80, -80);

    while (d < 0) {
      const position = await this.robot.motors.getPosition();

      d = (p1.x - p0.x) * (position.y - p0.y) - (position.x - p0.x) * (p1.y - p0.y);
      // console.log(d);
    }

    await this.robot.motors.setLeftAndRightMotorSpeed(0, 0);
    await this.robot.motors.rotateAngle(1800);
  }
}
