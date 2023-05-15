import { Robot } from './robot.js';
import sendMessage from './message.js';

export default class Response {
  robot: Robot;

  constructor(robot: Robot) {
    this.robot = robot;
  }

  getVersionsResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    let board;
    switch (packet.at(3)) {
      case 0xA5: board = "Main board: "; break;
      case 0xC6: board = "Color board: "; break;
    }
    const firmware = "Firmware: " + String.fromCharCode(packet.at(4)!) + "." + packet.at(5) + "." + packet.at(12);
    const hardware = "Hardware: " + packet.at(6) + "." + packet.at(7);
    const bootloader = "Bootloader: " + packet.at(8) + "." + packet.at(9);
    const protocol = "Protocol: " + packet.at(10) + "." + packet.at(11);
    sendMessage(board + firmware + "; " + hardware + "; " + bootloader + "; " + protocol + "; ");
  }

  getNameResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    const utf8decoder = new TextDecoder();
    sendMessage("Name: " + utf8decoder.decode(packet.subarray(3, 19)));
  }

  stopProject(packet: Uint8Array): void {
    this.#updateEventID(packet);
    sendMessage("Project stopped!", 5000);
  }

  getEnabledEventsResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    const devicesEnabled: number[] = [];
    for (let i = 18; i >= 3; i--) {
      for (let device of Array.from(packet.at(i)!.toString(2).padStart(8, '0')).reverse()) {
        devicesEnabled.push(Number(device));
      }
    }
    console.log("Devices enabled", devicesEnabled);
    sendMessage("Check log");
  }

  getSerialNumberResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    const utf8decoder = new TextDecoder();
    sendMessage("Serial number: " + utf8decoder.decode(packet.subarray(3, 19)));
  }

  getSKU(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    const utf8decoder = new TextDecoder();
    sendMessage("SKU: " + utf8decoder.decode(packet.subarray(3, 19)));
  }

  driveDistanceFinishedResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  rotateAngleFinishedResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  getPositionResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  navigateToPositionFinishedResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  dock(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockStatus(packet));
  }

  undock(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockStatus(packet));
  }

  motorStallEvent(packet: Uint8Array): void {
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

  driveArcFinishedResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    this.#positionStatus(packet);
  }

  playNoteFinishedResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage("Finished playing note", 3000);
  }

  sayPhraseFinishedResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage("Finished saying phrase", 3000);
  }

  playSweepFinishedResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage("Finished playing sweep", 3000);
  }

  IRProximityEvent(packet: Uint8Array): void {
    this.#updateEventID(packet);
    sendMessage(this.#packedIRProximity(packet), 3000);
  }

  getIRProximityValuesWithTimestampResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    const time = this.#readTimestamp(packet)
    const sensors = [];
    for (let i = 7; i < 18; i += 2) {
      sensors.push(packet.at(i)! * 256 + packet.at(i + 1)!);
    }
    sendMessage(time + sensors.toString());
  }

  getPackedIRProximityValuesAndStatesResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage(this.#packedIRProximity(packet));
  }

  getEventThresholdsResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    const hysteresis = packet.at(3)! * 256 + packet.at(4)!;
    const thresholds = [];
    for (let i = 5; i < 18; i += 2) {
      thresholds.push(packet.at(i)! * 256 + packet.at(i + 1)!);
    }
    sendMessage("Hysteresis: " + hysteresis + " Thresholds: " + thresholds.toString());
  }

  bumperEvent(packet: Uint8Array): void {
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

  batteryLevelEvent(packet: Uint8Array): void {
    this.#updateEventID(packet);
    sendMessage(this.#getBatteryLevel(packet), 3000);
  }

  getBatteryLevelResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage(this.#getBatteryLevel(packet), 3000);
  }

  getAccelerometerResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    const time = this.#readTimestamp(packet)
    let x = packet.at(7)! * 256 + packet.at(8)!;
    let y = packet.at(9)! * 256 + packet.at(10)!;
    let z = packet.at(11)! * 256 + packet.at(12)!;
    x = x >= 2 ** 15 ? x - 2 ** 16 : x;
    y = y >= 2 ** 15 ? y - 2 ** 16 : y;
    z = z >= 2 ** 15 ? z - 2 ** 16 : z;
    sendMessage(time + "; Acceleration: x=" + x + "mg, y=" + y + "mg, z=" + z + "mg", 5000);
  }

  touchSensorEvent(packet: Uint8Array): void {
    this.#updateEventID(packet);
    const time = this.#readTimestamp(packet)
    const state = packet.at(7)!.toString(2).padStart(8, '0').slice(0, 2);
    let buttons;
    switch (state) {
      case "00": buttons = " No Button";
      case "01": buttons = " Button 2";
      case "10": buttons = " Button 1";
      case "11": buttons = " Both Buttons";
    }
    sendMessage(time + buttons, 3000);
  }

  dockingSensorEvent(packet: Uint8Array): void {
    this.#updateEventID(packet);
    sendMessage(this.#dockingSensor(packet), 3000);
  }

  getDockingValuesResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage(this.#dockingSensor(packet), 5000);
  }

  cliffEvent(packet: Uint8Array): void {
    this.#updateEventID(packet);
    const time = this.#readTimestamp(packet.subarray(3, 7));
    const cliff = packet.at(7)!.toString(2).padStart(8, '0');
    const sensor = packet.at(8)! * 256 + packet.at(9)!;
    const threshold = packet.at(10)! * 256 + packet.at(11)!;
    sendMessage(time + " Cliff: " + cliff + " Sensor: " + sensor + "mV, Threshold: " + threshold + "mV", 3000);
  }

  IPv4ChangeEvent(packet: Uint8Array): void {
    this.#updateEventID(packet);
    sendMessage(this.#IPv4Addresses(packet), 5000);
  }

  getIPv4AddressesResponse(packet: Uint8Array): void {
    this.#checkRequestStack(packet);
    sendMessage(this.#IPv4Addresses(packet), 5000);
  }

  easyUpdateEvent(packet: Uint8Array): void {
    this.#updateEventID(packet);
    const time = this.#readTimestamp(packet);
    const utf8decoder = new TextDecoder();
    let stage;
    switch (utf8decoder.decode(packet.subarray(7, 8))) {
      case "d": stage = "downloading"; break;
      case "i": stage = "installing"; break;
    }
    const percent = packet.at(8)!;
    sendMessage(time + " Update: " + stage + " " + percent + "%", 5000);
  }

  #positionStatus(packet: Uint8Array): void {
    let x = packet.at(7)! * 256 ** 3 + packet.at(8)! * 256 ** 2 + packet.at(9)! * 256 + packet.at(10)!;
    let y = packet.at(11)! * 256 ** 3 + packet.at(12)! * 256 ** 2 + packet.at(13)! * 256 + packet.at(14)!;
    x = x > 2 ** 31 ? x - 2 ** 32 : x;
    y = y > 2 ** 31 ? y - 2 ** 32 : y;
    const heading = (packet.at(15)! * 256 + packet.at(16)!) / 10.0;
    const time = this.#readTimestamp(packet);
    sendMessage(time, 3000);
    sendMessage("x: " + x / 10.0 + "cm", 3000);
    sendMessage("y: " + y / 10.0 + "cm", 3000);
    sendMessage("heading: " + heading.toString() + "°", 3000);
  }

  #dockStatus(packet: Uint8Array): string {
    const time = this.#readTimestamp(packet);
    let status = "Unknown";
    switch (packet.at(7)) {
      case 0: status = "Succeeded"; break;
      case 1: status = "Aborted"; break;
      case 4: status = "Canceled"; break;
    }
    const result = packet.at(8)! === 0 ? "Not docked" : "Docked";
    return [time, result, status].join("\n");
  }

  #packedIRProximity(packet: Uint8Array): string {
    const time = this.#readTimestamp(packet)
    const state = packet.at(7)!.toString(2).padStart(8, '0');
    const sensors: number[] = new Array(7);
    sensors[0] = parseInt(
      packet.at(8)!.toString(2).padStart(8, '0') + packet.at(15)!.toString(2).padStart(8, '0').slice(0, 4),
      2
    );
    sensors[1] = parseInt(
      packet.at(9)!.toString(2).padStart(8, '0') + packet.at(15)!.toString(2).padStart(8, '0').slice(4, 8),
      2
    );
    sensors[2] = parseInt(
      packet.at(10)!.toString(2).padStart(8, '0') + packet.at(16)!.toString(2).padStart(8, '0').slice(0, 4),
      2
    );
    sensors[3] = parseInt(
      packet.at(11)!.toString(2).padStart(8, '0') + packet.at(16)!.toString(2).padStart(8, '0').slice(4, 8),
      2
    );
    sensors[4] = parseInt(
      packet.at(12)!.toString(2).padStart(8, '0') + packet.at(17)!.toString(2).padStart(8, '0').slice(0, 4),
      2
    );
    sensors[5] = parseInt(
      packet.at(13)!.toString(2).padStart(8, '0') + packet.at(17)!.toString(2).padStart(8, '0').slice(4, 8),
      2
    );
    sensors[6] = parseInt(
      packet.at(14)!.toString(2).padStart(8, '0') + packet.at(18)!.toString(2).padStart(8, '0').slice(0, 4),
      2
    );
    return time + " triggered: " + state + " " + sensors.toString();
  }

  #getBatteryLevel(packet: Uint8Array): string {
    const timestamp = this.#readTimestamp(packet)
    const voltage = packet.at(7)! * 256 + packet.at(8)!;
    const percent = packet.at(9)!;
    return timestamp + " Battery: " + voltage / 1000.0 + "V, " + percent + "%";
  }

  #dockingSensor(packet: Uint8Array): string {
    const time = this.#readTimestamp(packet);
    const contacts = packet.at(7);
    const irSensor0 = packet.at(8);
    const irSensor1 = packet.at(9);
    // const irSensor2 = packet.at(10);
    return time + " Contacts: " + contacts + "IR Sensor 0: " + irSensor0 + "IR Sensor 1: " + irSensor1;
  }

  #IPv4Addresses(packet: Uint8Array): string {
    const wlan0 = packet.at(3)! + "." + packet.at(4)! + "." + packet.at(5)! + "." + packet.at(6)!;
    const wlan1 = packet.at(7)! + "." + packet.at(8)! + "." + packet.at(9)! + "." + packet.at(10)!;
    const usb0 = packet.at(11)! + "." + packet.at(12)! + "." + packet.at(13)! + "." + packet.at(14)!;
    return "wlan0: " + wlan0 + " wlan1: " + wlan1 + " usb0: " + usb0;
  }

  #updateEventID(packet: Uint8Array) {
    const eventID = packet.at(2)!;
    const oldEventID = Number(sessionStorage.getItem(this.robot.eventID))
    let lostPackets = eventID - (oldEventID + 1);
    lostPackets = lostPackets < 0 ? lostPackets + 256 : lostPackets;
    if (lostPackets > 0) {
      sendMessage(lostPackets + " packets lost.");
    }
    sessionStorage.setItem(this.robot.eventID, eventID.toString());
  }

  #checkRequestStack(packet: Uint8Array): void {
    const packetID = [packet.at(0)!, packet.at(1)!, packet.at(2)!];
    if (this.robot.requestStack.length === 0) {
      sendMessage("No responses expected!", 3000);
      return;
    }
    let awaitingRequest;
    const tempStack: [number, number, number][] = [];
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

  #readTimestamp(packet: Uint8Array): string {
    const timestamp = packet.at(3)! * 256 ** 3 + packet.at(4)! * 256 ** 2 + packet.at(5)! * 256 + packet.at(6)!;
    const milliseconds = timestamp % 1000;
    const seconds = Math.floor((timestamp / 1000) % 60);
    const minutes = Math.floor((timestamp / 1000 / 60) % 60);
    const hours = Math.floor((timestamp / 1000 / 60 / 60));
    return "Time: " + [hours.toString(), minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":") + "." + milliseconds + " ";
  }
}
