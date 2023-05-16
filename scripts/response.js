import { Robot } from './robot.js';
import sendMessage from './message.js';

export default class Response {
  robot;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getVersionsResponse(packet) {
    this.#checkRequestStack(packet);
    let board;
    switch (packet.at(3)) {
      case 0xA5: board = "Main board: "; break;
      case 0xC6: board = "Color board: "; break;
    }
    const firmware = "Firmware: " + String.fromCharCode(/**@type {number}*/(packet.at(4))) + "." + packet.at(5) + "." + packet.at(12);
    const hardware = "Hardware: " + packet.at(6) + "." + packet.at(7);
    const bootloader = "Bootloader: " + packet.at(8) + "." + packet.at(9);
    const protocol = "Protocol: " + packet.at(10) + "." + packet.at(11);
    sendMessage(board + firmware + "; " + hardware + "; " + bootloader + "; " + protocol + "; ");
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getNameResponse(packet) {
    this.#checkRequestStack(packet);
    const utf8decoder = new TextDecoder();
    sendMessage("Name: " + utf8decoder.decode(packet.subarray(3, 19)));
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  stopProject(packet) {
    this.#updateEventID(packet);
    sendMessage("Project stopped!", 5000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getEnabledEventsResponse(packet) {
    this.#checkRequestStack(packet);
    /** @type {number[]} */
    const devicesEnabled = [];
    for (let i = 18; i >= 3; i--) {
      for (let device of Array.from(/**@type {number}*/(packet.at(i)).toString(2).padStart(8, '0')).reverse()) {
        devicesEnabled.push(Number(device));
      }
    }
    console.log("Devices enabled", devicesEnabled);
    sendMessage("Check log");
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getSerialNumberResponse(packet) {
    this.#checkRequestStack(packet);
    const utf8decoder = new TextDecoder();
    sendMessage("Serial number: " + utf8decoder.decode(packet.subarray(3, 19)));
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getSKU(packet) {
    this.#checkRequestStack(packet);
    const utf8decoder = new TextDecoder();
    sendMessage("SKU: " + utf8decoder.decode(packet.subarray(3, 19)));
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  driveDistanceFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  rotateAngleFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getPositionResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  navigateToPositionFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  dock(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockStatus(packet));
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  undock(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockStatus(packet));
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  motorStallEvent(packet) {
    this.#updateEventID(packet);
    const time = this.#readTimestamp(packet)
    let motor;
    switch (packet.at(7)) {
      case 0: motor = "Left"; break;
      case 1: motor = "Right"; break;
      case 2: motor = "Marker/eraser"; break;
    }
    let cause;
    switch (packet.at(8)) {
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
  @param {Uint8Array} packet
  @returns {void}
  */
  driveArcFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  playNoteFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage("Finished playing note", 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  sayPhraseFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage("Finished saying phrase", 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  playSweepFinishedResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage("Finished playing sweep", 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  IRProximityEvent(packet) {
    this.#updateEventID(packet);
    sendMessage(this.#packedIRProximity(packet), 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getIRProximityValuesWithTimestampResponse(packet) {
    this.#checkRequestStack(packet);
    const time = this.#readTimestamp(packet)
    const sensors = [];
    for (let i = 7; i < 18; i += 2) {
      sensors.push(/**@type {number}*/(packet.at(i)) * 256 + /**@type {number}*/(packet.at(i + 1)));
    }
    sendMessage(time + sensors.toString());
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getPackedIRProximityValuesAndStatesResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#packedIRProximity(packet));
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getEventThresholdsResponse(packet) {
    this.#checkRequestStack(packet);
    const hysteresis = /**@type {number}*/(packet.at(3)) * 256 + /**@type {number}*/(packet.at(4));
    const thresholds = [];
    for (let i = 5; i < 18; i += 2) {
      thresholds.push(/**@type {number}*/(packet.at(i)) * 256 + /**@type {number}*/(packet.at(i + 1)));
    }
    sendMessage("Hysteresis: " + hysteresis + " Thresholds: " + thresholds.toString());
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  bumperEvent(packet) {
    this.#updateEventID(packet);
    const time = this.#readTimestamp(packet)
    const state = packet.at(7);
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
  @param {Uint8Array} packet
  @returns {void}
  */
  batteryLevelEvent(packet) {
    this.#updateEventID(packet);
    sendMessage(this.#getBatteryLevel(packet), 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getBatteryLevelResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#getBatteryLevel(packet), 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getAccelerometerResponse(packet) {
    this.#checkRequestStack(packet);
    const time = this.#readTimestamp(packet)
    let x = /**@type {number}*/(packet.at(7)) * 256 + /**@type {number}*/(packet.at(8));
    let y = /**@type {number}*/(packet.at(9)) * 256 + /**@type {number}*/(packet.at(10));
    let z = /**@type {number}*/(packet.at(11)) * 256 + /**@type {number}*/(packet.at(12));
    x = x >= 2 ** 15 ? x - 2 ** 16 : x;
    y = y >= 2 ** 15 ? y - 2 ** 16 : y;
    z = z >= 2 ** 15 ? z - 2 ** 16 : z;
    sendMessage(time + "; Acceleration: x=" + x + "mg, y=" + y + "mg, z=" + z + "mg", 5000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  touchSensorEvent(packet) {
    this.#updateEventID(packet);
    const time = this.#readTimestamp(packet)
    const state = /**@type {number}*/(packet.at(7)).toString(2).padStart(8, '0').slice(0, 2);
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
  @param {Uint8Array} packet
  @returns {void}
  */
  dockingSensorEvent(packet) {
    this.#updateEventID(packet);
    sendMessage(this.#dockingSensor(packet), 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getDockingValuesResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockingSensor(packet), 5000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  cliffEvent(packet) {
    this.#updateEventID(packet);
    const time = this.#readTimestamp(packet.subarray(3, 7));
    const cliff = /**@type {number}*/(packet.at(7)).toString(2).padStart(8, '0');
    const sensor = /**@type {number}*/(packet.at(8)) * 256 + /**@type {number}*/(packet.at(9));
    const threshold = /**@type {number}*/(packet.at(10)) * 256 + /**@type {number}*/(packet.at(11));
    sendMessage(time + " Cliff: " + cliff + " Sensor: " + sensor + "mV, Threshold: " + threshold + "mV", 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  IPv4ChangeEvent(packet) {
    this.#updateEventID(packet);
    sendMessage(this.#IPv4Addresses(packet), 5000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  getIPv4AddressesResponse(packet) {
    this.#checkRequestStack(packet);
    sendMessage(this.#IPv4Addresses(packet), 5000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  easyUpdateEvent(packet) {
    this.#updateEventID(packet);
    const time = this.#readTimestamp(packet);
    const utf8decoder = new TextDecoder();
    let stage;
    switch (utf8decoder.decode(packet.subarray(7, 8))) {
      case "d": stage = "downloading"; break;
      case "i": stage = "installing"; break;
    }
    const percent = /**@type {number}*/(packet.at(8));
    sendMessage(time + " Update: " + stage + " " + percent + "%", 5000);
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  #positionStatus(packet) {
    let x = /**@type {number}*/(packet.at(7)) * 256 ** 3 + /**@type {number}*/(packet.at(8)) * 256 ** 2 + /**@type {number}*/(packet.at(9)) * 256 + /**@type {number}*/(packet.at(10));
    let y = /**@type {number}*/(packet.at(11)) * 256 ** 3 + /**@type {number}*/(packet.at(12)) * 256 ** 2 + /**@type {number}*/(packet.at(13)) * 256 + /**@type {number}*/(packet.at(14));
    x = x > 2 ** 31 ? x - 2 ** 32 : x;
    y = y > 2 ** 31 ? y - 2 ** 32 : y;
    const heading = (/**@type {number}*/(packet.at(15)) * 256 + /**@type {number}*/(packet.at(16))) / 10.0;
    const time = this.#readTimestamp(packet);
    sendMessage(time, 3000);
    sendMessage("x: " + x / 10.0 + "cm", 3000);
    sendMessage("y: " + y / 10.0 + "cm", 3000);
    sendMessage("heading: " + heading.toString() + "°", 3000);
  }

  /**
  @param {Uint8Array} packet
  @returns {string}
  */
  #dockStatus(packet) {
    const time = this.#readTimestamp(packet);
    let status = "Unknown";
    switch (packet.at(7)) {
      case 0: status = "Succeeded"; break;
      case 1: status = "Aborted"; break;
      case 4: status = "Canceled"; break;
    }
    const result = /**@type {number}*/(packet.at(8)) === 0 ? "Not docked" : "Docked";
    return [time, result, status].join("\n");
  }

  /**
  @param {Uint8Array} packet
  @returns {string}
  */
  #packedIRProximity(packet) {
    const time = this.#readTimestamp(packet)
    const state = /**@type {number}*/(packet.at(7)).toString(2).padStart(8, '0');

    /** @type {number[]} */
    const sensors = new Array(7);

    sensors[0] = parseInt(
      /**@type {number}*/(packet.at(8)).toString(2).padStart(8, '0') + /**@type {number}*/(packet.at(15)).toString(2).padStart(8, '0').slice(0, 4),
      2
    );
    sensors[1] = parseInt(
      /**@type {number}*/(packet.at(9)).toString(2).padStart(8, '0') + /**@type {number}*/(packet.at(15)).toString(2).padStart(8, '0').slice(4, 8),
      2
    );
    sensors[2] = parseInt(
      /**@type {number}*/(packet.at(10)).toString(2).padStart(8, '0') + /**@type {number}*/(packet.at(16)).toString(2).padStart(8, '0').slice(0, 4),
      2
    );
    sensors[3] = parseInt(
      /**@type {number}*/(packet.at(11)).toString(2).padStart(8, '0') + /**@type {number}*/(packet.at(16)).toString(2).padStart(8, '0').slice(4, 8),
      2
    );
    sensors[4] = parseInt(
      /**@type {number}*/(packet.at(12)).toString(2).padStart(8, '0') + /**@type {number}*/(packet.at(17)).toString(2).padStart(8, '0').slice(0, 4),
      2
    );
    sensors[5] = parseInt(
      /**@type {number}*/(packet.at(13)).toString(2).padStart(8, '0') + /**@type {number}*/(packet.at(17)).toString(2).padStart(8, '0').slice(4, 8),
      2
    );
    sensors[6] = parseInt(
      /**@type {number}*/(packet.at(14)).toString(2).padStart(8, '0') + /**@type {number}*/(packet.at(18)).toString(2).padStart(8, '0').slice(0, 4),
      2
    );
    return time + " triggered: " + state + " " + sensors.toString();
  }

  /**
  @param {Uint8Array} packet
  @returns {string}
  */
  #getBatteryLevel(packet) {
    const timestamp = this.#readTimestamp(packet)
    const voltage = /**@type {number}*/(packet.at(7)) * 256 + /**@type {number}*/(packet.at(8));
    const percent = /**@type {number}*/(packet.at(9));
    return timestamp + " Battery: " + voltage / 1000.0 + "V, " + percent + "%";
  }

  /**
  @param {Uint8Array} packet
  @returns {string}
  */
  #dockingSensor(packet) {
    const time = this.#readTimestamp(packet);
    const contacts = packet.at(7);
    const irSensor0 = packet.at(8);
    const irSensor1 = packet.at(9);
    // const irSensor2 = packet.at(10);
    return time + " Contacts: " + contacts + "IR Sensor 0: " + irSensor0 + "IR Sensor 1: " + irSensor1;
  }

  /**
  @param {Uint8Array} packet
  @returns {string}
  */
  #IPv4Addresses(packet) {
    const wlan0 = /**@type {number}*/(packet.at(3)) + "." + /**@type {number}*/(packet.at(4)) + "." + /**@type {number}*/(packet.at(5)) + "." + /**@type {number}*/(packet.at(6));
    const wlan1 = /**@type {number}*/(packet.at(7)) + "." + /**@type {number}*/(packet.at(8)) + "." + /**@type {number}*/(packet.at(9)) + "." + /**@type {number}*/(packet.at(10));
    const usb0 = /**@type {number}*/(packet.at(11)) + "." + /**@type {number}*/(packet.at(12)) + "." + /**@type {number}*/(packet.at(13)) + "." + /**@type {number}*/(packet.at(14));
    return "wlan0: " + wlan0 + " wlan1: " + wlan1 + " usb0: " + usb0;
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  #updateEventID(packet) {
    const eventID = /**@type {number}*/(packet.at(2));
    const oldEventID = Number(sessionStorage.getItem(this.robot.eventID))
    let lostPackets = eventID - (oldEventID + 1);
    lostPackets = lostPackets < 0 ? lostPackets + 256 : lostPackets;
    if (lostPackets > 0) {
      sendMessage(lostPackets + " packets lost.");
    }
    sessionStorage.setItem(this.robot.eventID, eventID.toString());
  }

  /**
  @param {Uint8Array} packet
  @returns {void}
  */
  #checkRequestStack(packet) {
    const packetID = [/**@type {number}*/(packet.at(0)), /**@type {number}*/(packet.at(1)), /**@type {number}*/(packet.at(2))];
    if (this.robot.requestStack.length === 0) {
      sendMessage("No responses expected!", 3000);
      return;
    }
    let awaitingRequest;
    /** @type {[number, number, number][]} */
    const tempStack = [];
    while (awaitingRequest = this.robot.requestStack.pop()) {
      if (awaitingRequest.toString() === packetID.toString()) {
        sendMessage("Received response", 500);
      } else {
        tempStack.push(awaitingRequest);
      }
    }
    let numberOfRequests;
    while (awaitingRequest = tempStack.pop()) {
      numberOfRequests = this.robot.requestStack.push(awaitingRequest);
    }
    if (numberOfRequests) {
      sendMessage(numberOfRequests + " unresponded request(s)", 4000);
    }
  }

  /**
  @param {Uint8Array} packet
  @returns {string}
  */
  #readTimestamp(packet) {
    const timestamp = /**@type {number}*/(packet.at(3)) * 256 ** 3 + /**@type {number}*/(packet.at(4)) * 256 ** 2 + /**@type {number}*/(packet.at(5)) * 256 + /**@type {number}*/(packet.at(6));
    const milliseconds = timestamp % 1000;
    const seconds = Math.floor((timestamp / 1000) % 60);
    const minutes = Math.floor((timestamp / 1000 / 60) % 60);
    const hours = Math.floor((timestamp / 1000 / 60 / 60));
    return "Time: " + [hours.toString(), minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":") + "." + milliseconds + " ";
  }
}
