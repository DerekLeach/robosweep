export class Halt {
  /**
  @typedef {import('../robot.js').Robot} Robot
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  async start() {
    this.robot.motors.setLeftAndRightMotorSpeed(0, 0);
  }
}
