import { tx, rx } from './bluetooth.js';
import {
  readBatteryLevel,
  STOP_AND_RESET,
  DISCONNECT,
  GET_POSITION,
  DOCK,
  UNDOCK,
  GET_PACKED_IR_PROXIMITY_VALUES_AND_STATES,
  SET_EVENT_THRESHOLDS,
  GET_EVENT_THRESHOLDS,
  GET_BATTERY_LEVEL,
  GET_IPV4_ADDRESSES,
  GET_DOCKING_VALUES,
} from './utils.js';

/**
 * @return {Promise<void>}
 */
export async function stopAndReset() {
  await sendRequest("stopAndReset", false, STOP_AND_RESET);
}

/**
 * @return {Promise<void>}
 */
export async function disconnect() {
  await sendRequest("disconnect", false, DISCONNECT);
}

/**
 * @return {Promise<void>}
 */
export async function getPosition() {
  if (tx === undefined)
    return;

  const pendingRequests = document.getElementsByClassName("request sending");
  for (let i = 0; i < pendingRequests.length; i++) {
    const request = pendingRequests[i];
    if (!(request instanceof HTMLLIElement))
      continue;

    if (request.dataset.command === "getPosition") {
      console.debug("getPosition already pending");
      return;
    }
  }

  const postponedRequests = document.getElementsByClassName("request postponed");

  for (let i = 0; i < postponedRequests.length; i++) {
    const request = postponedRequests[i];
    if (!(request instanceof HTMLLIElement))
      continue;

    if (request.dataset.command === "getPosition") {
      console.debug("getPosition already postponed");
      return;
    }
  }

  console.debug("Adding event listener getPositionResponse");
  tx.addEventListener("characteristicvaluechanged", getPositionResponse);
  await sendRequest("getPosition", true, GET_POSITION);
}

/**
 * @param {Event} event
 * @return {void}
 */
function getPositionResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const requestFound = findRequest(tx.value, GET_POSITION);
  if (!requestFound) return;

  const pendingRequests = document.getElementsByClassName("request sending");
  for (let i = 0; i < pendingRequests.length; i++) {
    const request = pendingRequests[i];
    if (!(request instanceof HTMLLIElement))
      continue;

    if (request.dataset.command === "getPosition") {
      console.debug("getPosition already pending");
      return;
    }
  }

  const postponedRequests = document.getElementsByClassName("request postponed");

  for (let i = 0; i < postponedRequests.length; i++) {
    const request = postponedRequests[i];
    if (!(request instanceof HTMLLIElement))
      continue;

    if (request.dataset.command === "getPosition") {
      console.debug("getPosition already postponed");
      return;
    }
  }

  console.debug("Removing event listener getPositionResponse");
  tx.removeEventListener("characteristicvaluechanged", getPositionResponse);
}

/**
 * @return {Promise<void>}
 */
export async function dock() {
  if (tx === undefined)
    return;
  tx.addEventListener("characteristicvaluechanged", dockResponse);
  await sendRequest("dock", true, DOCK);
}

/**
 * @param {Event} event
 * @return {void}
 */
function dockResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const requestFound = findRequest(tx.value, DOCK);
  if (!requestFound) return;

  tx.removeEventListener("characteristicvaluechanged", dockResponse);
}

/**
 * @return {Promise<void>}
 */
export async function undock() {
  if (tx === undefined)
    return;
  tx.addEventListener("characteristicvaluechanged", undockResponse);
  await sendRequest("undock", true, UNDOCK);
}

/**
 * @param {Event} event
 * @return {void}
 */
function undockResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const requestFound = findRequest(tx.value, UNDOCK);
  if (!requestFound)
    return;

  tx.removeEventListener("characteristicvaluechanged", undockResponse);
}

/**
 * @return {Promise<void>}
 */
export async function getPackedIRProximityValuesAndStates() {
  if (tx === undefined)
    return;
  tx.addEventListener("characteristicvaluechanged", getPackedIRProximityValuesAndStatesResponse);
  await sendRequest("getPackedIRProximityValuesAndStates", true, GET_PACKED_IR_PROXIMITY_VALUES_AND_STATES);
}

/**
 * @param {Event} event
 * @return {void}
 */
function getPackedIRProximityValuesAndStatesResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const requestFound = findRequest(tx.value, GET_PACKED_IR_PROXIMITY_VALUES_AND_STATES);
  if (!requestFound)
    return;

  tx.removeEventListener("characteristicvaluechanged", getPackedIRProximityValuesAndStatesResponse);
}

/**
 * @return {Promise<void>}
 */
export async function setEventThresholds() {
  const payload = new Uint8Array(16);
  const dataView = new DataView(payload.buffer);
  dataView.setUint16(0, 20); // hysteresis
  for (let i = 2; i < 16; i += 2) {
    dataView.setUint16(i, 150);
  }
  await sendRequest("setEventThresholds", false, SET_EVENT_THRESHOLDS, payload);
}

/**
 * @return {Promise<void>}
 */
export async function getEventThresholds() {
  if (tx === undefined)
    return;
  tx.addEventListener("characteristicvaluechanged", getEventThresholdsResponse);
  await sendRequest("getEventThresholds", true, GET_EVENT_THRESHOLDS);
}

/**
 * @param {Event} event
 * @return {void}
 */
function getEventThresholdsResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const requestFound = findRequest(tx.value, GET_EVENT_THRESHOLDS);
  if (!requestFound)
    return;

  if (tx.value === undefined)
    return;

  const hysteresis = document.getElementById("ir-hysteresis");
  if (!(hysteresis instanceof HTMLInputElement))
    return;

  hysteresis.value = tx.value.getUint16(3).toString();
  for (let i = 0; i < 7; ++i) {
    const threshold = document.getElementById("ir-sensor-" + i);
    if (!(threshold instanceof HTMLInputElement))
      return;

    threshold.value = tx.value.getUint16(i * 2 + 5).toString();
  }

  tx.removeEventListener("characteristicvaluechanged", getEventThresholdsResponse);
}


/**
 * @return {Promise<void>}
 */
export async function getBatteryLevel() {
  if (tx === undefined)
    return;

  tx.addEventListener("characteristicvaluechanged", getBatteryLevelResponse);

  await sendRequest("getBatteryLevel", true, GET_BATTERY_LEVEL);
}

/**
 * @param {Event} event
 * @return {void}
 */
function getBatteryLevelResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const requestFound = findRequest(tx.value, GET_BATTERY_LEVEL);
  if (!requestFound) return;


  tx.removeEventListener("characteristicvaluechanged", getBatteryLevelResponse);

  readBatteryLevel(tx);
}

/**
 * @return {Promise<void>}
 */
export async function getIPv4Addresses() {
  if (tx === undefined)
    return;
  tx.addEventListener("characteristicvaluechanged", getIPv4AddressesResponse);

  await sendRequest("getIPv4Addresses", true, GET_IPV4_ADDRESSES);
}

/**
 * @param {Event} event
 * @return {void}
 */
function getIPv4AddressesResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const requestFound = findRequest(tx.value, GET_IPV4_ADDRESSES);
  if (!requestFound)
    return;

  if (tx.value === undefined)
    return;

  displayIPv4Address(tx.value);

  tx.removeEventListener("characteristicvaluechanged", getIPv4AddressesResponse);
}

/**
 * @param {DataView} packet
 * @return {void}
 */
export function displayIPv4Address(packet) {
  const link = document.getElementById("ipv4-address");
  if (!(link instanceof HTMLAnchorElement))
    return;

  const IPv4Address = packet.getUint8(3) + "." + packet.getUint8(4)
    + "." + packet.getUint8(5) + "." + packet.getUint8(6);

  link.href = "http://" + IPv4Address;
  link.innerHTML = IPv4Address;
}

/**
 * @return {Promise<void>}
 */
export async function getDockingValues() {
  if (tx === undefined)
    return;

  tx.addEventListener("characteristicvaluechanged", getDockingValuesResponse);

  await sendRequest("getDockingValues", true, GET_DOCKING_VALUES);
}

/**
 * @param {Event} event
 * @return {void}
 */
function getDockingValuesResponse(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  const requestFound = findRequest(tx.value, GET_DOCKING_VALUES);
  if (!requestFound) return;

  tx.removeEventListener("characteristicvaluechanged", getDockingValuesResponse);
}

/**
 * @param {DataView | undefined} packet
 * @param {number} command
 * @return {boolean}
 */
export function findRequest(packet, command) {
  if (packet === undefined) {
    console.error("No packet received");
    return false;
  }

  if (packet.getUint16(0) !== command)
    return false;

  const id = packet.getUint8(2);

  const requestListItem = document.getElementById("request-" + id);
  if (requestListItem === null) return false;

  requestListItem.classList.remove('awaiting-response');
  requestListItem.classList.add("received");

  return true;
}

/**
 * @param {HTMLLIElement} listItem
 * @return {void}
 */
export function removeListItem(listItem) {
  listItem.remove();
}

/**
 * @param {string} request
 * @param {boolean} response
 * @param {number} command
 * @param {Uint8Array} [payload]
 * @return {Promise<void>}
 */
export async function sendRequest(request, response, command, payload) {
  const packet = new Uint8Array(20);
  const dataView = new DataView(packet.buffer);
  dataView.setUint16(0, command);

  if (payload instanceof Uint8Array && payload.length > 16) {
    console.error("Payload too big.");
    return;
  }

  if (payload instanceof Uint8Array)
    packet.set(payload, 3);

  const requestListItem = document.createElement('li');
  requestListItem.classList.add('request');
  requestListItem.innerText = request;
  requestListItem.dataset.packet = packet.toString();
  requestListItem.dataset.command = request;

  if (response)
    requestListItem.classList.add('expect-response');

  const requestQueue = document.getElementById('request-queue');
  if (!(requestQueue instanceof HTMLUListElement)) {
    console.error("Couldn't find request queue.");
    return;
  }

  const requests = document.querySelectorAll('li.request');
  const numberOfRequests = 5;
  let toRemove = requests.length - numberOfRequests;

  for (let i = 0; i < requests.length; i++) {
    if (toRemove < 0)
      break;

    if (requests[i].classList.contains('awaiting-response'))
      continue;

    if (!(requests[i].classList.contains('sent')))
      continue;

    requests[i].remove();
    toRemove--;
  }

  requestQueue.append(requestListItem);

  const postponedRequests = document.getElementsByClassName('request postponed');
  let requestCandidate = requestListItem;

  if (postponedRequests[0] instanceof HTMLLIElement) {
    console.debug("Postponing request " + request);
    requestListItem.classList.add("postponed");
    requestCandidate = postponedRequests[0];
  }

  await sendPacket(requestCandidate);
}

/**
 * @param {HTMLLIElement} requestListItem
 * @return {Promise<void>}
 */
export async function sendPacket(requestListItem) {
  if (rx === undefined) return;

  const requestQueue = document.getElementById('request-queue');
  if (!(requestQueue instanceof HTMLUListElement)) {
    console.error("Couldn't find request queue.");
    return;
  }

  const packetString = requestListItem.dataset.packet;
  if (packetString === undefined)
    return;

  const packet = Uint8Array.from(JSON.parse("[" + packetString + "]"));

  let currentID = parseInt(requestQueue.dataset.incrementID ?? "-1");
  currentID = isNaN(currentID) ? -1 : currentID;
  const id = (currentID + 1) % 256;
  packet.set([id], 2);

  const crc = calculateCRC(packet.subarray(0, 19));
  packet.set([crc], 19);

  const request = requestListItem.innerText;
  const response = requestListItem.classList.contains("expect-response");

  requestListItem.classList.add("sending");
  try {
    console.debug("Sending " + request + ", ID: " + id.toString());
    await rx.writeValueWithResponse(packet.buffer);
    console.debug("Sent " + request + ", ID: " + id.toString());

    // if (!response)
    // setTimeout(removeListItem, 2000, requestListItem);

    requestQueue.dataset.incrementID = id.toString();
    requestListItem.innerText = id.toString() + ": " + request;
    requestListItem.id = "request-" + id.toString();
    requestListItem.dataset.requestID = id.toString();
    requestListItem.classList.remove("sending");
    requestListItem.classList.remove("postponed");
    requestListItem.classList.add("sent");

    if (response)
      requestListItem.classList.add("awaiting-response");

  } catch (error) {
    if (!(error instanceof DOMException && error.message === "GATT operation already in progress.")) {
      return;
    }
    console.debug("Unable to send " + request + ", ID: " + id.toString());
    requestListItem.innerText = request;
    requestListItem.classList.remove("sending");
    requestListItem.classList.add("postponed");
    requestListItem.dataset.packet = packet.toString();
  }
}

/**
@param {Uint8Array} packet
@returns {number}
*/
function calculateCRC(packet) {
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
