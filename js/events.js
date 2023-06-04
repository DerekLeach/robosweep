import { Robot } from './robot.js';
import sendMessage from './message.js';
import * as utils from './utils.js';
/**
@typedef {import('./robot.js').IRSensors} IRSensors
@typedef {import('./robot.js').BatteryLevel} BatteryLevel
@typedef {import('./robot.js').DockingSensors} DockingSensors
@typedef {import('./robot.js').IPv4Addresses} IPv4Addresses
@typedef {"left" | "right" | "marker" | "unknown"} Motor
@typedef {"no stall" | "overcurrent" | "undercurrent" | "underspeed" | "saturated PID" | "timeout" | "unknown"} Cause
@typedef {{ motor: Motor, cause: Cause }} MotorStall
@typedef {{left: boolean, right: boolean}} Bumper
@typedef {[boolean, boolean]} Button
*/

export default class Events {
  robot;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  stopProject(packet) {
    this.#updateEventID(packet);
    sendMessage("Project stopped!", 5000);
  }

  /**
  @param {DataView} packet
  @returns {MotorStall}
  */
  motorStallEvent(packet) {
    this.#updateEventID(packet);
    // const time = utils.readTimestamp(packet)

    let /**@type {Motor}*/motor;
    switch (packet.getUint8(7)) {
      case 0: motor = "left"; break;
      case 1: motor = "right"; break;
      case 2: motor = "marker"; break;
      default: motor = "unknown";
    }
    let /**@type {Cause}*/cause;
    switch (packet.getUint8(8)) {
      case 0: cause = "no stall"; break;
      case 1: cause = "overcurrent"; break;
      case 2: cause = "undercurrent"; break;
      case 3: cause = "underspeed"; break;
      case 4: cause = "saturated PID"; break;
      case 5: cause = "timeout"; break;
      default: cause = "unknown";
    }
    return {motor: motor, cause: cause};
  }

  /**
  @param {DataView} packet
  @returns {IRSensors}
  */
  IRProximityEvent(packet) {
    this.#updateEventID(packet);
    console.log(this.robot.readPackedIRProximity(packet));
    return this.robot.readPackedIRProximity(packet);
  }

  /**
  @param {DataView} packet
  @returns {Bumper}
  */
  bumperEvent(packet) {
    this.#updateEventID(packet);
    // const time = utils.readTimestamp(packet)
    const state = packet.getUint8(7);
    const bumper = {left: false, right: false};
    switch (state) {
      case 0x40: bumper.right = true; break;
      case 0x80: bumper.left = true; break;
      case 0xC0: bumper.left = true; bumper.right = true; break;
    }
    return bumper;
  }

  /**
  @param {DataView} packet
  @returns {BatteryLevel}
  */
  batteryLevelEvent(packet) {
    this.#updateEventID(packet);
    return this.robot.readBatteryLevel(packet);
  }

  /**
  @param {DataView} packet
  @returns {Button}
  */
  touchSensorEvent(packet) {
    this.#updateEventID(packet);
    // const time = utils.readTimestamp(packet)
    const /**@type {Button}*/button = [false, false];
    switch (packet.getUint8(7)) {
      case 16: button[1] = true; break;
      case 32: button[0] = true; break;
      case 48: button[0] = true, button[1] = true; break;
  }
    return button;
  }

  /**
  @param {DataView} packet
  @returns {DockingSensors}
  */
  dockingSensorEvent(packet) {
    this.#updateEventID(packet);
    return this.robot.readDockingSensor(packet);
  }

  /**
  @param {DataView} packet
  @returns {void}
  @todo return an object
  */
  cliffEvent(packet) {
    this.#updateEventID(packet);
    const time = utils.readTimestamp(packet);
    const cliff = packet.getUint8(7).toString(2).padStart(8, '0');
    const sensor = packet.getUint16(8);
    const threshold = packet.getUint16(10);
    sendMessage(time + " Cliff: " + cliff + " Sensor: " + sensor + "mV, Threshold: " + threshold + "mV", 3000);
  }

  /**
  @param {DataView} packet
  @returns {IPv4Addresses}
  */
  IPv4ChangeEvent(packet) {
    this.#updateEventID(packet);
    return this.robot.readIPv4Addresses(packet);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  easyUpdateEvent(packet) {
    this.#updateEventID(packet);
    const time = utils.readTimestamp(packet);
    let stage;
    switch (String.fromCharCode(packet.getUint8(7))) {
      case "d": stage = "downloading"; break;
      case "i": stage = "installing"; break;
    }
    const percent = packet.getUint8(8);
    sendMessage(time + " Update: " + stage + " " + percent + "%", 5000);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  #updateEventID(packet) {
    const eventID = packet.getUint8(2);
    const oldEventID = Number(sessionStorage.getItem(this.robot.eventID))
    let lostPackets = eventID - (oldEventID + 1);
    lostPackets = lostPackets < 0 ? lostPackets + 256 : lostPackets;
    if (lostPackets > 0) {
      sendMessage(lostPackets + " packets lost.");
    }
    sessionStorage.setItem(this.robot.eventID, eventID.toString());
  }

  // /**
  // @param {DataView} packet
  // @returns {void}
  // */
  // #checkRequestStack(packet) {
  //   const uint8 = new Uint8Array(packet.buffer);
  //   if (this.robot.requestStack.size === 0) {
  //     sendMessage("No responses expected!", 3000);
  //     return;
  //   }

  //   if (this.robot.requestStack.delete(uint8.subarray(0, 3).toString())) {
  //     sendMessage("Received response", 500);
  //   }

  //   if (this.robot.requestStack.size > 0) {
  //     sendMessage(this.robot.requestStack.size + " unresponded request(s)", 4000);
  //   }
  // }
}
