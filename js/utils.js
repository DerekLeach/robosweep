export const IDENTIFIER = '48c5d828-ac2a-442d-97a3-0c9822b04979';
export const INFORMATION = '0000180a-0000-1000-8000-00805f9b34fb';
export const UART = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// Device 0: General
export const GET_VERSIONS = 0x0000;
export const GET_NAME = 0x0002;
export const STOP_AND_RESET = 0x0003;
export const STOP_PROJECT = 0x0004;
export const DISCONNECT = 0x0006;
export const ENABLE_EVENTS = 0x0007;
export const DISABLE_EVENTS = 0x0009;
export const GET_ENABLED_EVENTS = 0x000B;
export const GET_SERIAL_NUMBER = 0x000E;
export const GET_SKU = 0x000F;

// Device 1: Motors
export const SET_LEFT_AND_RIGHT_MOTOR_SPEED = 0x0104;
export const SET_LEFT_MOTOR_SPEED = 0x0106;
export const SET_RIGHT_MOTOR_SPEED = 0x0107;
export const DRIVE_DISTANCE = 0x0108;
export const ROTATE_ANGLE = 0x010C;
export const RESET_POSITION = 0x010F;
export const GET_POSITION = 0x0110;
export const NAVIGATE_TO_POSITION = 0x0111;
export const DOCK = 0x0113;
export const UNDOCK = 0x0114;
export const DRIVE_ARC = 0x011B;
export const MOTOR_STALL_EVENT = 0x011D;

// Device 3: LED Lights
export const SET_LED_ANIMATION = 0x0302;

// Device 5: Sound
export const PLAY_NOTE = 0x0500;
export const STOP_SOUND = 0x0501;
export const SAY_PHRASE = 0x0504;
export const PLAY_SWEEP = 0x0505;

// Device 11: IR Proximity
export const IR_PROXIMITY_EVENT = 0x0B00;
export const GET_IR_PROXIMITY_VALUES_WITH_TIMESTAMP = 0x0B01;
export const GET_PACKED_IR_PROXIMITY_VALUES_AND_STATES = 0x0B02;
export const SET_EVENT_THRESHOLDS = 0x0B03;
export const GET_EVENT_THRESHOLDS = 0x0B04;

// Device 12: Bumpers
export const BUMPER_EVENT = 0x0C00;

// Device 14: Battery
export const BATTER_LEVEL_EVENT = 0x0E00;
export const GET_BATTERY_LEVEL = 0x0E01;

// Device 16: Accelerometer
export const GET_ACCELEROMETER = 0x1001;

// Device 17: Touch Sensors
export const TOUCH_SENSOR_EVENT = 0x1100;

// Device 19: Docking Sensors
export const DOCKING_SENSOR_EVENT = 0x1300;
export const GET_DOCKING_VALUES = 0x1301;

// Device 20: Cliff Sensor
export const CLIFF_EVENT = 0x1400;

// Device 100: Connectivity
export const IPV4_CHANGE_EVENT = 0x6400;
export const GET_IPV4_ADDRESSES = 0x6401;
export const REQUEST_EASY_UPDATE = 0x6402;
export const EASY_UPDATE_EVENT = 0x6403;

import { sendPacket } from './commands.js';

/**
 * @param {string | undefined} id
 * @returns {Promise<BluetoothRemoteGATTServer | undefined>}
 */
export async function getGATTServer(id) {
  if (id === undefined) {
    console.error("No ID given");
    return;
  }

  let devices = undefined;

  try {
    devices = await navigator.bluetooth.getDevices();
  } catch (error) {
    console.error(error);
    return;
  }

  let device = null;
  let deviceFound = false;
  for (device of devices) {
    if (device.id === id) {
      deviceFound = true;
      break;
    }
  }

  if (device === null) {
    console.error("No known device");
    return;
  }

  if (!deviceFound) {
    console.error("No device matches ID");
    return;
  }

  return device.gatt;
}

/**
 * @param {BluetoothRemoteGATTCharacteristic} tx
 * @return {void}
 */
export function readBatteryLevel(tx) {
  if (tx.value === undefined) return;
  const voltage = tx.value.getUint16(7) / 1000.0;
  const percent = tx.value.getUint8(9);
  const batteryLevel = document.getElementById("battery-level");
  if (batteryLevel === null) return;
  batteryLevel.innerText = percent + "% (" + voltage + " V)";
}

/**
@param {number} value
@param {number} byteLength
@param {boolean} signed
@param {number} [maxValue]
@param {number} [minValue]
@returns {number[]}
*/
export function getBytes(value, byteLength, signed, maxValue, minValue) {
  const sign = signed ? 1 : 0;
  let maximum = 2 ** (byteLength * 8 - sign) - 1;
  let minimum = -sign * 2 ** (byteLength * 8 - sign);

  if (typeof maxValue === 'number' && maxValue < maximum) {
    maximum = maxValue;
  }

  if (typeof minValue === 'number' && minValue > minimum) {
    minimum = minValue;
  }

  if (minimum > maximum) {
    throw new Error("Minimum (" + minimum + ") is greater than maximum (" + maximum + ")");
  } else if (value > maximum) {
    throw new Error(value + " is greater than maximum permissable value: " + maximum);
  } else if (value < minimum) {
    throw new Error(value + " is less than minimum permissable value: " + minimum);
  }

  value = value < 0 ? value + 2 ** (byteLength * 8) : value;

  const bytes = [];
  for (let i = byteLength - 1; i >= 0; i--) {
    bytes.push(Math.floor(value / (256 ** i)) % 256);
  }
  return bytes;
}

/**
@param {DataView} packet
@returns {string}
*/
export function readTimestamp(packet) {
  const timestamp = packet.getUint32(3);
  const milliseconds = timestamp % 1000;
  const seconds = Math.floor((timestamp / 1000) % 60);
  const minutes = Math.floor((timestamp / 1000 / 60) % 60);
  const hours = Math.floor((timestamp / 1000 / 60 / 60));
  return "Time: " + [hours.toString(), minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":") + "." + milliseconds + " ";
}

// /**
// @param {Uint8Array} bytes
// @param {boolean} signed
// @returns {number}
// */
// export function getNumberFromBytes(bytes, signed) {
//   let number = 0;

//   for (let i = 0; i < bytes.length; i++) {
//     number += /**@type {number}*/(bytes.at(i)) * 256 ** (bytes.length - (i + 1));
//   }

//   if (signed) {
//     number = number > 2 ** (bytes.length * 8 - 1) ? number - 2 ** (bytes.length * 8) : number;
//   }
//   return number;
// }

// Copied calc_crc from:
// https://github.com/iRobotEducation/irobot-edu-python-sdk/blob/78dc01026532225efef2b9e14dbd1ce646697e8c/irobot_edu_sdk/packet.py
/**
 *
@param {DataView} packet
@returns {number}
*/
export function checkCRC(packet) {
  let crc = 0;
  for (let j = 0; j < packet.byteLength; j++) {
    const c = packet.getUint8(j);
    for (let i = 0; i < 8; i++) {
      let b = crc & 0x80;
      if (c & (0x80 >> i)) {
        b ^= 0x80;
      }
      crc <<= 1;
      if (b) {
        crc ^= 0x07;
      }
    }
    crc &= 0xFF;
  }
  return crc;
}

/**
@param {Uint8Array} packet
@returns {number}
*/
export function calculateCRC(packet) {
  let crc = 0;
  for (const c of packet.values()) {
    for (let i = 0; i < 8; i++) {
      let b = crc & 0x80;
      if (c & (0x80 >> i)) {
        b ^= 0x80;
      }
      crc <<= 1;
      if (b) {
        crc ^= 0x07;
      }
    }
    crc &= 0xFF;
  }
  return crc;
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
export async function onResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  if (!(tx.value instanceof DataView)) {
    console.error("Not a DataView");
    return;
  }

  if (checkCRC(tx.value) !== 0) {
    console.error("Packet corrupted");
    return;
  }

  let responseName;
  switch (tx.value.getUint16(0)) {
    case GET_VERSIONS:
      responseName = "getVersions"; break;
    case GET_NAME:
      responseName = "getName"; break;
    case GET_ENABLED_EVENTS:
      responseName = "getEnabledEvents"; break;
    case GET_SERIAL_NUMBER:
      responseName = "getSerialNumber"; break;
    case GET_SKU:
      responseName = "getSKU"; break;
    case DRIVE_DISTANCE:
      responseName = "driveDistance"; break;
    case ROTATE_ANGLE:
      responseName = "rotateAngle"; break;
    case GET_POSITION:
      responseName = "getPosition"; break;
    case NAVIGATE_TO_POSITION:
      responseName = "navigateToPosition"; break;
    case DOCK:
      responseName = "dock"; break;
    case UNDOCK:
      responseName = "undock"; break;
    case DRIVE_ARC:
      responseName = "driveArc"; break;
    case PLAY_NOTE:
      responseName = "playNote"; break;
    case SAY_PHRASE:
      responseName = "sayPhrase"; break;
    case PLAY_SWEEP:
      responseName = "playSweep"; break;
    case GET_IR_PROXIMITY_VALUES_WITH_TIMESTAMP:
      responseName = "getIRProximityValuesWithTimestamp"; break;
    case GET_PACKED_IR_PROXIMITY_VALUES_AND_STATES:
      responseName = "getPackedIRProximityValuesAndStates"; break;
    case GET_EVENT_THRESHOLDS:
      responseName = "getEventThresholds"; break;
    case GET_BATTERY_LEVEL:
      responseName = "getBatteryLevel"; break;
    case GET_ACCELEROMETER:
      responseName = "getAccelerometer"; break;
    case GET_DOCKING_VALUES:
      responseName = "getDockingValues"; break;
    case GET_IPV4_ADDRESSES:
      responseName = "getIPv4Addresses"; break;
  }
  if (responseName === undefined) return;

  console.debug("Response: " + responseName + " ID: " + tx.value.getUint8(2));

  const postponedRequests = document.getElementsByClassName("request postponed");

  if (postponedRequests.length < 1)
    return;

  const requestListItem = postponedRequests.item(0);
  if (!(requestListItem instanceof HTMLLIElement))
    return;

  await sendPacket(requestListItem);
}
