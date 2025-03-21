import { Halt } from './halt.js';

/**
@typedef {import('../robot.js').Robot} Robot
@typedef {import('./sweep.js').Command} Command
@implements {Command}
*/
export default class SetInfraRedThreshold {
  /** @type {Command | Halt} */
  nextCommand;

	/**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
    this.controller = new AbortController();
    this.nextCommand = new Halt(this.robot);
  }

  async start() {
    await this.robot.irProximity.setEventThresholds(this.robot.hysteresis, this.robot.irThresholds);
    // @ts-expect-error
    this.robot.tx.addEventListener("getEventThresholdsResponse", this, {signal: this.controller.signal});
    await this.robot.irProximity.getEventThresholds();
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
    const packet = /**@type {DataView}*/(/**@type {CustomEvent}*/(event).detail.packet);
    const hysteresis = packet.getUint16(3);
    const thresholds = [];
    for (let i = 5; i < 18; i += 2) {
      thresholds.push(packet.getUint16(i))
    }
    if (
      hysteresis === this.robot.hysteresis
      && thresholds.toString() === this.robot.irThresholds.toString()
    ) {
      this.controller.abort();
      this.nextCommand.start();
    } else {
      await this.robot.irProximity.setEventThresholds(this.robot.hysteresis, this.robot.irThresholds);
      await this.robot.irProximity.getEventThresholds();
    }
  }
}
