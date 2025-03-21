import { Robot } from './robot.js';
import sendMessage from './message.js';
import { stopAndReset, getPosition, displayIPv4Address } from './commands.js';
import {
  readTimestamp,
  checkCRC,
  readBatteryLevel,
  IR_PROXIMITY_EVENT,
  DOCKING_SENSOR_EVENT,
  STOP_PROJECT,
  MOTOR_STALL_EVENT,
  BUMPER_EVENT,
  BATTER_LEVEL_EVENT,
  TOUCH_SENSOR_EVENT,
  CLIFF_EVENT,
  IPV4_CHANGE_EVENT,
  EASY_UPDATE_EVENT,
} from './utils.js';

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
    return { motor: motor, cause: cause };
  }

  /**
  @param {DataView} packet
  @returns {IRSensors}
  */
  IRProximityEvent(packet) {
    this.#updateEventID(packet);
    // console.log(this.robot.readPackedIRProximity(packet));
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
    const bumper = { left: false, right: false };
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
    const time = readTimestamp(packet);
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
    const time = readTimestamp(packet);
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

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
export async function emergencyStop(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  if (!(tx.value instanceof DataView)) {
    console.log("Not a DataView");
    return;
  }

  if (checkCRC(tx.value) !== 0) {
    console.log("Packet corrupted");
    return;
  }

  switch (tx.value.getUint16(0)) {
    case 0x0004: // stopProject
    case 0x011D: // motorStallEvent
      await stopAndReset();
      break;
    case 0x0C00: // bumperEvent
    case 0x1400: // cliffEvent
      if (tx.value.getUint8(7) !== 0x00) {
        await stopAndReset();
      }
      break;
    default: return;
  }
}

/**
 * @param {Event} event
 * @returns {void}
 */
export function onEvent(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  if (!(tx.value instanceof DataView)) {
    console.error("Not a DataView");
    return;
  }

  if (checkCRC(tx.value) !== 0) {
    console.error("Packet corrupted");
    return;
  }

  const id = tx.value.getUint8(2);
  let eventName;
  switch (tx.value.getUint16(0)) {
    case STOP_PROJECT:
      eventName = "stopProject"; break;
    case MOTOR_STALL_EVENT:
      eventName = "motorStallEvent"; break;
    case IR_PROXIMITY_EVENT:
      eventName = "IRProximityEvent"; break;
    case BUMPER_EVENT:
      eventName = "bumperEvent"; break;
    case BATTER_LEVEL_EVENT:
      eventName = "batteryLevelEvent"; readBatteryLevel(tx); break;
    case TOUCH_SENSOR_EVENT:
      eventName = "touchSensorEvent"; break;
    case DOCKING_SENSOR_EVENT:
      eventName = "dockingSensorEvent"; break;
    case CLIFF_EVENT:
      eventName = "cliffEvent"; break;
    case IPV4_CHANGE_EVENT:
      eventName = "IPv4ChangeEvent"; displayIPv4Address(tx.value); break;
    case EASY_UPDATE_EVENT:
      eventName = "easyUpdateEvent"; break;
  }

  if (eventName === undefined)
    return;

  console.debug("Event: " + id.toString() + ": " + eventName);

  const eventQueue = document.getElementById("event-queue");
  if (!(eventQueue instanceof HTMLUListElement))
    return;

  const eventListItem = document.createElement('li');
  eventListItem.innerText = id.toString() + ": " + eventName;
  eventListItem.dataset.eventID = id.toString();
  eventListItem.classList.add("event");

  const events = document.querySelectorAll("li.event");

  const numberOfSlots = 5;
  let inserted = false;
  for (const event of events) {
    if (!(event instanceof HTMLLIElement))
      continue;

    let countDown = id - parseInt(event.dataset.eventID ?? "0");

    if (countDown < 1)
      countDown += 256;

    if (countDown > numberOfSlots) {
      event.remove();
      continue;
    }

    if (countDown < numberOfSlots)
      continue;

    event.replaceWith(eventListItem);
    inserted = true;
  }

  if (!inserted)
    eventQueue.append(eventListItem);
}
