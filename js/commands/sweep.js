import SetInfraRedThresholds from './ir-thresholds.js';
import Undock from './undock.js';
import Roam from './roam.js';

/**
@typedef {import('./halt.js').Halt} Halt
*/

/**
@typedef Command
@property {Robot} robot
@property {AbortController} controller
@property {Command | Halt} nextCommand
@property {() => void} start
@property {(nextCommand: Command) => void} andThen
@property {(event: CustomEvent) => void} handleEvent
*/

export default class Sweep {
  robot;

  /**
  @typedef {import('../robot.js').Robot} Robot
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {HTMLButtonElement} stopButton
  */
  async start(stopButton) {
    const emergencyStop = new AbortController();

    const setThresholds = new SetInfraRedThresholds(this.robot);
    const undock = new Undock(this.robot);
    const roam = new Roam(this.robot, emergencyStop);

    setThresholds.andThen(undock);
    undock.andThen(roam);

    stopButton.addEventListener('click', async () => {
      emergencyStop.abort();
      stopButton.disabled = true;
      await this.robot.motors.setLeftAndRightMotorSpeed(0, 0);
    });

    stopButton.disabled = false;

    setThresholds.start();
  }
}
