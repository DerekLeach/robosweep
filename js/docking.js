import { UART, TX, checkCRC, getGATTServer, UNDOCK, DOCKING_SENSOR_EVENT } from './utils.js';
import { dock, undock, getPosition } from './commands.js';

import { tx } from './bluetooth.js';

/**
 * @param {Event} event
 * @return {Promise<void>}
 */
export async function dockStatus(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const dockButton = /**@type {HTMLButtonElement}*/(document.getElementById("dock-button"));

  if (tx.value === undefined) {
    console.log("No packet received");
    return;
  }

  if (tx.value.getUint16(0) !== 0x1301) return;

  tx.removeEventListener("characteristicvaluechanged", dockStatus);

  if (tx.value.getUint8(7) === 0) {
    dockButton.addEventListener('click', startDock);
    dockButton.innerHTML = "Dock";
  }

  if (tx.value.getUint8(7) === 1) {
    dockButton.addEventListener('click', startUndock);
    dockButton.innerHTML = "Undock";
  }

  dockButton.disabled = false;
  await getPosition();
}

/**
 * @param {Event} event
 * @return {Promise<void>}
 */
async function startDock(event) {
  if (tx === undefined)
    return;

  const button = /**@type {HTMLButtonElement}*/(event.target);
  button.disabled = true;
  button.innerText = "Docking";

  button.removeEventListener('click', startDock);
  tx.addEventListener("characteristicvaluechanged", dockEvent);
  tx.addEventListener("characteristicvaluechanged", dockingSensorEvent);

  await dock();
}

/**
 * @param {Event} event
 * @return {Promise<void>}
 */
async function dockEvent(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  if (!(tx.value instanceof DataView)) {
    console.log("Not a DataView");
    return;
  }

  if (checkCRC(tx.value) !== 0) {
    console.log("Packet corrupted");
    return;
  }

  if (tx.value.getUint16(0) !== 0x0113) {
    return;
  }

  tx.removeEventListener("characteristicvaluechanged", dockEvent);
  tx.removeEventListener("characteristicvaluechanged", dockingSensorEvent);

  const button = /**@type {HTMLButtonElement}*/(document.getElementById("dock-button"));

  button.addEventListener('click', startUndock);
  button.innerHTML = "Undock";
  button.disabled = false;

  await getPosition();
}

/**
 * @param {Event} event
 * @return {Promise<void>}
 */
async function dockingSensorEvent(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  if (!(tx.value instanceof DataView)) {
    console.log("Not a DataView");
    return;
  }

  if (checkCRC(tx.value) !== 0) {
    console.log("Packet corrupted");
    return;
  }

  if (tx.value.getUint16(0) !== DOCKING_SENSOR_EVENT) {
    return;
  }

  await getPosition();
}

/**
 * @param {Event} event
 * @return {Promise<void>}
 */
async function startUndock(event) {
  if (tx === undefined)
    return;

  const undockButton = /**@type {HTMLButtonElement}*/(event.target);
  undockButton.disabled = true;
  undockButton.innerText = "Undocking";

  undockButton.removeEventListener('click', startUndock);
  tx.addEventListener("characteristicvaluechanged", undockEvent);
  tx.addEventListener("characteristicvaluechanged", dockingSensorEvent);

  await undock();
}

/**
 * @param {Event} event
 * @return {Promise<void>}
 */
async function undockEvent(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);
  const response = tx.value;

  if (!(response instanceof DataView)) {
    console.log("Not a DataView");
    return;
  }

  if (checkCRC(response) !== 0) {
    console.log("Packet corrupted");
    return;
  }

  if (response.getUint16(0) !== UNDOCK) {
    return;
  }

  tx.removeEventListener("characteristicvaluechanged", undockEvent);
  tx.removeEventListener("characteristicvaluechanged", dockingSensorEvent);
  const button = /**@type {HTMLButtonElement}*/(document.getElementById("dock-button"));

  button.addEventListener('click', startDock);
  button.innerHTML = "Dock";
  button.disabled = false;

  await getPosition();
}
