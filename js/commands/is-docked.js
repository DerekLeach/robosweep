import { Halt } from './halt.js';
/**
@typedef {import('../robot.js').Robot} Robot
@typedef {import('./sweep.js').Command} Command
@implements {Command}
*/
export default class IsDocked {
  /**@type {Command | Halt}*/
  nextCommand;

  controller = new AbortController();

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
    this.nextCommand = new Halt(this.robot);
  }

  async start() {
    // @ts-expect-error
    this.robot.tx.addEventListener("getDockingValuesResponse", this, {signal: this.controller.signal});
    await this.robot.getDockingValues();
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
  handleEvent(event) {
    this.controller.abort();

    const packet = /**@type {DataView}*/(event.detail.packet);
    
    this.robot.docked = packet.getUint8(7) === 0 ? false : packet.getUint8(7) === 1 ? true : false;
    this.nextCommand.start();
  }
}
