import { Robot } from './robot.js';
import sendMessage from './message.js';
import * as utils from './utils.js';

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
  @returns {void}
  */
  getEnabledEventsResponse(packet) {
    this.#checkRequestStack(packet);
    const devicesEnabled = [];
    for (let i = 18; i >= 3; i--) {
      for (let device of Array.from(packet.getUint8(i).toString(2).padStart(8, '0')).reverse()) {
        devicesEnabled.push(Number(device));
      }
    }
    console.log("Devices enabled", devicesEnabled);
    sendMessage("Check log");
  }

  // /**
  // @param {Uint8Array} packet
  // @returns {void}
  // */
  // getSerialNumberResponse(packet) {
  //   this.#checkRequestStack(packet);
  //   const utf8decoder = new TextDecoder();
  //   sendMessage("Serial number: " + utf8decoder.decode(packet.subarray(3, 19)));
  // }

  // /**
  // @param {Uint8Array} packet
  // @returns {void}
  // */
  // getSKU(packet) {
  //   this.#checkRequestStack(packet);
  //   const utf8decoder = new TextDecoder();
  //   sendMessage("SKU: " + utf8decoder.decode(packet.subarray(3, 19)));
  // }

  /**
  @param {DataView} packet
  @returns {void}
  */
  driveDistanceFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  rotateAngleFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  getPositionResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  navigateToPositionFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  dock(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockStatus(packet));
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  undock(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockStatus(packet));
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  motorStallEvent(packet) {
    this.#updateEventID(packet);
    const time = utils.readTimestamp(packet)
    let motor;
    switch (packet.getUint8(7)) {
      case 0: motor = "Left"; break;
      case 1: motor = "Right"; break;
      case 2: motor = "Marker/eraser"; break;
    }
    let cause;
    switch (packet.getUint8(8)) {
      case 0: cause = "No stall"; break;
      case 1: cause = "Overcurrent"; break;
      case 2: cause = "Undercurrent"; break;
      case 3: cause = "Underspeed"; break;
      case 4: cause = "Saturated PID"; break;
      case 5: cause = "Timeout"; break;
    }
    sendMessage(time + "; " + cause + " in " + motor + " motor!");
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  driveArcFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  playNoteFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage("Finished playing note", 3000);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  sayPhraseFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage("Finished saying phrase", 3000);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  playSweepFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage("Finished playing sweep", 3000);
  }

  /**
  @param {DataView} packet
  @returns {IRSensors}
  */
  IRProximityEvent(packet) {
    this.#updateEventID(packet);
    console.log(this.#packedIRProximity(packet));
    return this.#packedIRProximity(packet);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  getIRProximityValuesWithTimestampResponse(packet) {
    this.#checkRequestStack(packet);
    const time = utils.readTimestamp(packet)
    const sensors = [];
    for (let i = 7; i < 18; i += 2) {
      sensors.push(packet.getUint16(i));
    }
    sendMessage(time + sensors.toString());
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  getPackedIRProximityValuesAndStatesResponse(packet) {
    this.#checkRequestStack(packet);
    console.log(this.#packedIRProximity(packet));
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  getEventThresholdsResponse(packet) {
    this.#checkRequestStack(packet);
    const hysteresis = packet.getUint16(3);
    const thresholds = [];
    for (let i = 5; i < 18; i += 2) {
      thresholds.push(packet.getUint16(i))
    }
    sendMessage("Hysteresis: " + hysteresis + " Thresholds: " + thresholds.toString());
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  bumperEvent(packet) {
    this.#updateEventID(packet);
    const time = utils.readTimestamp(packet)
    const state = packet.getUint8(7);
    let bumper;
    switch (state) {
      case 0x00: bumper = "None"; break;
      case 0x40: bumper = "Right"; break;
      case 0x80: bumper = "Left"; break;
      case 0xC0: bumper = "Both"; break;
    }
    sendMessage(time + "; Bumper: " + bumper, 3000);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  batteryLevelEvent(packet) {
    this.#updateEventID(packet);
    sendMessage(this.#getBatteryLevel(packet), 3000);
  }

  // /**
  // @param {Uint8Array} packet
  // @returns {void}
  // */
  // getBatteryLevelResponse(packet) {
  //   this.#checkRequestStack(packet);
  //   sendMessage(this.#getBatteryLevel(packet), 3000);
  // }

  /**
  @param {DataView} packet
  @returns {void}
  */
  getAccelerometerResponse(packet) {
    this.#checkRequestStack(packet);
    const time = utils.readTimestamp(packet)
    const x = packet.getInt16(7);
    const y = packet.getInt16(9);
    const z = packet.getInt16(11);
    sendMessage(time + "; Acceleration: x=" + x + "mg, y=" + y + "mg, z=" + z + "mg", 5000);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  touchSensorEvent(packet) {
    this.#updateEventID(packet);
    const time = utils.readTimestamp(packet)
    const state = packet.getUint8(7).toString(2).padStart(8, '0').slice(0, 2);
    let buttons;
    switch (state) {
      case "00": buttons = " No Button";
      case "01": buttons = " Button 2";
      case "10": buttons = " Button 1";
      case "11": buttons = " Both Buttons";
    }
    sendMessage(time + buttons, 3000);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  dockingSensorEvent(packet) {
    this.#updateEventID(packet);
    sendMessage(this.#dockingSensor(packet), 3000);
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  getDockingValuesResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockingSensor(packet), 5000);
  }

  /**
  @param {DataView} packet
  @returns {void}
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
  @returns {void}
  */
  IPv4ChangeEvent(packet) {
    this.#updateEventID(packet);
    sendMessage(this.#IPv4Addresses(packet), 5000);
  }

  // /**
  // @param {Uint8Array} packet
  // @returns {void}
  // */
  // getIPv4AddressesResponse(packet) {
  //   this.#checkRequestStack(packet);
  //   sendMessage(this.#IPv4Addresses(packet), 5000);
  // }

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
  #positionStatus(packet) {
    const x = packet.getInt32(7);
    const y = packet.getInt32(11);
    const heading = packet.getInt16(15)/10.0;
    const time = utils.readTimestamp(packet);
    sendMessage(time, 3000);
    sendMessage("x: " + x / 10.0 + "cm", 3000);
    sendMessage("y: " + y / 10.0 + "cm", 3000);
    sendMessage("heading: " + heading.toString() + "°", 3000);
  }

  /**
  @param {DataView} packet
  @returns {string}
  */
  #dockStatus(packet) {
    const time = utils.readTimestamp(packet);
    let status = "Unknown";
    switch (packet.getUint8(7)) {
      case 0: status = "Succeeded"; break;
      case 1: status = "Aborted"; break;
      case 4: status = "Canceled"; break;
    }
    const result = packet.getUint8(8) === 0 ? "Not docked" : "Docked";
    return [time, result, status].join("\n");
  }

  /**
  @typedef {{timestamp: string, triggered: boolean[], value: number[]}} IRSensors
  @param {DataView} packet
  @returns {IRSensors}
  */
  #packedIRProximity(packet) {
    const timestamp = utils.readTimestamp(packet)

    const numberOfSensors = 7;
    const triggered = new Array(numberOfSensors);;
    const value = new Array(numberOfSensors);

    for (let i = 0; i < numberOfSensors; i++) {
      if (packet.getUint8(7) & 2 ** i) {
        triggered[i] = true;
      } else {
        triggered[i] = false;
      }

      const slice = (i % 2)*4;
      value[i] = parseInt(
        packet.getUint8(i+8).toString(2)
        + packet.getUint8(Math.floor(i/2)+15).toString(2).padStart(8, '0').slice(slice, slice + 4),
        2
      );
    }
    
    return {timestamp: timestamp, triggered: triggered, value: value};
  }

  /**
  @param {DataView} packet
  @returns {string}
  */
  #getBatteryLevel(packet) {
    const timestamp = utils.readTimestamp(packet)
    const voltage = packet.getUint16(7);
    const percent = packet.getUint16(9);

    return timestamp + " Battery: " + voltage / 1000.0 + "V, " + percent + "%";
  }

  /**
  @param {DataView} packet
  @returns {string}
  */
  #dockingSensor(packet) {
    const time = utils.readTimestamp(packet);
    const contacts = packet.getUint8(7);
    const irSensor0 = packet.getUint8(8);
    const irSensor1 = packet.getUint8(9);
    // const irSensor2 = packet.getUint8(10);
    return time + " Contacts: " + contacts + "IR Sensor 0: " + irSensor0 + "IR Sensor 1: " + irSensor1;
  }

  /**
  @param {DataView} packet
  @returns {string}
  */
  #IPv4Addresses(packet) {
    const uint8 = new Uint8Array(packet.buffer);
    const wlan0 = uint8.subarray(3, 7).join(".");
    const wlan1 = uint8.subarray(7, 11).join(".");
    const usb0 = uint8.subarray(11, 15).join(".");
    return "wlan0: " + wlan0 + " wlan1: " + wlan1 + " usb0: " + usb0;
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  #updateEventID(packet) {
    // const eventID = /**@type {number}*/(packet.at(2));
    const eventID = packet.getUint8(2);
    const oldEventID = Number(sessionStorage.getItem(this.robot.eventID))
    let lostPackets = eventID - (oldEventID + 1);
    lostPackets = lostPackets < 0 ? lostPackets + 256 : lostPackets;
    if (lostPackets > 0) {
      sendMessage(lostPackets + " packets lost.");
    }
    sessionStorage.setItem(this.robot.eventID, eventID.toString());
  }

  /**
  @param {DataView} packet
  @returns {void}
  */
  #checkRequestStack(packet) {
    const uint8 = new Uint8Array(packet.buffer);
    if (this.robot.requestStack.size === 0) {
      sendMessage("No responses expected!", 3000);
      return;
    }

    if (this.robot.requestStack.delete(uint8.subarray(0, 3).toString())) {
      sendMessage("Received response", 500);
    }

    if (this.robot.requestStack.size > 0) {
      sendMessage(this.robot.requestStack.size + " unresponded request(s)", 4000);
    }
  }
}
