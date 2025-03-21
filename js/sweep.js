import { tx } from './bluetooth.js';
import { setLeftAndRightMotorSpeed, driveDistance, rotateAngle } from './motors.js';
import { getPosition } from './commands.js';
import { BUMPER_EVENT, DRIVE_DISTANCE, IR_PROXIMITY_EVENT, ROTATE_ANGLE } from './utils.js';

const SPEED = 90;
const SLOW_SPEED = 20;
let intervalID = 0;

const NO_BUMPERS = 0x00;
const RIGHT_BUMPER = 0x40;
const LEFT_BUMPER = 0x80;
const BOTH_BUMPERS = 0xC0;

let bumperState = NO_BUMPERS;

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
export async function startSweep(event) {
  const button = /**@type {HTMLButtonElement}*/(event.target);
  button.removeEventListener('click', startSweep);
  button.addEventListener('click', stopSweep);
  if (tx === undefined)
    return;
  button.innerText = "Stop Sweep";
  tx.addEventListener("characteristicvaluechanged", collision);
  tx.addEventListener("characteristicvaluechanged", detectObstacle);

  await setLeftAndRightMotorSpeed(SPEED, SPEED);
  // intervalID = setInterval(getPosition, 1000);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function stopSweep(event) {
  const button = /**@type {HTMLButtonElement}*/(event.target);
  button.removeEventListener('click', stopSweep);
  button.addEventListener('click', startSweep);
  if (tx === undefined)
    return;
  button.innerText = "Start Sweep";
  tx.removeEventListener("characteristicvaluechanged", collision);
  tx.removeEventListener("characteristicvaluechanged", detectObstacle);
  tx.removeEventListener("characteristicvaluechanged", clearObstacle);
  await setLeftAndRightMotorSpeed(0, 0);
  // clearInterval(intervalID);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function detectObstacle(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);
  if (tx.value === undefined)
    return;

  if (tx.value.getUint16(0) !== IR_PROXIMITY_EVENT)
    return;

  const triggered = isIRProximityTriggered(tx.value);

  if (!triggered)
    return;

  tx.removeEventListener("characteristicvaluechanged", detectObstacle);
  tx.addEventListener("characteristicvaluechanged", clearObstacle);

  await setLeftAndRightMotorSpeed(SLOW_SPEED, SLOW_SPEED);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function clearObstacle(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);
  if (tx.value === undefined)
    return;

  if (tx.value.getUint16(0) !== IR_PROXIMITY_EVENT)
    return;

  const triggered = isIRProximityTriggered(tx.value);

  if (triggered)
    return;

  tx.removeEventListener("characteristicvaluechanged", clearObstacle);
  tx.addEventListener("characteristicvaluechanged", detectObstacle);

  await setLeftAndRightMotorSpeed(SPEED, SPEED);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function collision(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  if (tx.value === undefined)
    return;

  if (tx.value.getUint16(0) !== BUMPER_EVENT)
    return;

  bumperState = tx.value.getUint8(7);

  if (bumperState === NO_BUMPERS)
    return;

  tx.removeEventListener("characteristicvaluechanged", detectObstacle);
  tx.removeEventListener("characteristicvaluechanged", clearObstacle);
  tx.removeEventListener("characteristicvaluechanged", collision);

  await setLeftAndRightMotorSpeed(0, 0);

  tx.addEventListener("characteristicvaluechanged", sweepDriveDistanceFinishedResponse);

  await driveDistance(-40);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function sweepDriveDistanceFinishedResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);
  if (tx.value === undefined)
    return;

  if (tx.value.getUint16(0) !== DRIVE_DISTANCE)
    return;

  tx.removeEventListener("characteristicvaluechanged", sweepDriveDistanceFinishedResponse);
  tx.addEventListener("characteristicvaluechanged", sweepRotateAngleFinishedResponse);

  let angle = 0;

  switch (bumperState) {
    case RIGHT_BUMPER:
      angle = Math.floor((Math.random() * -1200) - 300);
      break;
    case LEFT_BUMPER:
      angle = Math.floor((Math.random() * 1200) + 300);
      break;
    case BOTH_BUMPERS:
      angle = Math.floor((Math.random() * 1200) + 1200);
      break;
    default:
      break;
  }

  await rotateAngle(angle);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function sweepRotateAngleFinishedResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);
  if (tx.value === undefined)
    return;

  if (tx.value.getUint16(0) !== ROTATE_ANGLE)
    return;

  tx.removeEventListener("characteristicvaluechanged", sweepRotateAngleFinishedResponse);

  tx.addEventListener("characteristicvaluechanged", collision);
  tx.addEventListener("characteristicvaluechanged", detectObstacle);

  await setLeftAndRightMotorSpeed(SPEED, SPEED);
}

/**
 * @param {DataView} packet
 * @returns {boolean} Sensors 0 to 6, left to right from robot's point of view
 */
function isIRProximityTriggered(packet) {
  // const timestamp = utils.readTimestamp(packet)

  const numberOfSensors = 7;

  for (let i = 0; i < numberOfSensors; i++) {
    const triggered = packet.getUint8(7) & 2 ** i ? true : false;
    if (triggered)
      return true;
    // sensors.value[i] = packet.getUint8(i + 8) * 16 + ((packet.getUint8(Math.floor(i / 2) + 15) >> 4 * (1 - i % 2)) & 15);
  }

  return false;
}
