import { Robot, robotServices } from './robot.js';
import Dashboard from './dashboard.js';
import sendMessage from './message.js';

export async function displayBluetooth() {
  const table = document.createElement('table');
  const header = document.createElement('th');
  header.colSpan = 3;
  header.innerText = "Known Devices";
  table.createTHead().insertRow().append(header);
  const tableBody = table.createTBody();
  const devices = await navigator.bluetooth.getDevices();

  for (const device of devices) {
    if (typeof device.gatt !== 'undefined') {
      addToKnownDevices(device.gatt, tableBody);
    } else {
      device.forget();
    }
  }

  const row = tableBody.insertRow();
  row.insertCell().innerText = "Scan for new robots: ";
  const scanForRobotsButton = document.createElement('button');
  scanForRobotsButton.innerText = "Scan";
  scanForRobotsButton.addEventListener('click', () => scanForRobots(scanForRobotsButton, tableBody));
  row.insertCell();
  row.insertCell().append(scanForRobotsButton);
  document.getElementsByTagName('header')[0].prepend(table);
}

/**
* @param {HTMLButtonElement} button
* @param {HTMLTableSectionElement} table
* @returns {Promise<void>}
*/
async function scanForRobots(button, table) {
  button.disabled = true;
  button.innerText = "Scanning";
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [robotServices.identifier.uuid] }],
      // Optional services need to be listed to be able to access them later.
      optionalServices: [
        robotServices.information.uuid,
        robotServices.uart.uuid
      ]
    });

    if (typeof device.gatt !== 'undefined') {
      const [connectButton, forgetButton] = addToKnownDevices(device.gatt, table);
      connectRobot(device.gatt, connectButton, forgetButton);
    } else {
      throw new DOMException("No GATT Server found")
    }

  } catch (error) {
    if (error instanceof DOMException) {
      sendMessage(error.message);
    }
  } finally {
    button.innerText = "Scan";
    button.disabled = false;
  }
}

/**
@param {BluetoothRemoteGATTServer} gattServer
@param {HTMLButtonElement} connectButton
@param {HTMLButtonElement} forgetButton
@returns {Promise<void>}
*/
async function connectRobot( gattServer, connectButton, forgetButton) {
  sendMessage("Connecting", 3000);
  try {
    gattServer = await gattServer.connect()
    const uart = await gattServer.getPrimaryService(robotServices.uart.uuid);
    const rx = await uart.getCharacteristic(robotServices.uart.characteristic.rx);
    const tx = await uart.getCharacteristic(robotServices.uart.characteristic.tx);
    sendMessage("Connected", 3000);
    connectButton.innerText = "Disconnect";
    const robot = new Robot(gattServer, rx, tx);
    const dashboard = new Dashboard(robot, forgetButton);
    const controller = new AbortController();

    // @ts-ignore
    gattServer.device.addEventListener(
      "gattserverdisconnected",
      () => onDisconnected(connectButton, dashboard, controller),
      {signal: controller.signal}
    );

  } catch (error) {
    if (error instanceof DOMException) {
      sendMessage(error.message);
    }
  }
}

/**
@param {BluetoothRemoteGATTServer} gattServer
@param {HTMLTableSectionElement} table
@returns {HTMLButtonElement[]}
*/
function addToKnownDevices(gattServer, table) {
  const row = table.insertRow(0);
  row.insertCell().innerText = gattServer.device.name ? gattServer.device.name : gattServer.device.id;
  row.id = gattServer.device.id;
  const connectButton = document.createElement('button');
  connectButton.innerText = "Connect";
  connectButton.addEventListener('click', () => connectToGATTServer(gattServer, connectButton, forgetButton));
  row.insertCell().append(connectButton);

  const forgetButton = document.createElement('button');
  forgetButton.innerText = "Forget";
  forgetButton.addEventListener('click', () => forgetDevice(forgetButton, row, gattServer))
  row.insertCell().append(forgetButton);

  return [connectButton, forgetButton];
}

/**
@param {BluetoothRemoteGATTServer} gattServer
@param {HTMLButtonElement} connectButton
@param {HTMLButtonElement} forgetButton
@returns {Promise<void>}
*/
async function connectToGATTServer(gattServer, connectButton, forgetButton) {
  connectButton.disabled = true;
  if (gattServer.connected) {
    sendMessage("Disconnecting", 3000);
    gattServer.disconnect();
    sendMessage("Disconnected", 3000);
    connectButton.innerText = "Connect";
  } else {
    try {
      connectRobot(gattServer, connectButton, forgetButton);
    } catch (error) {
      if (error instanceof DOMException) {
        sendMessage(error.message);
      }
    } finally {
      connectButton.disabled = false;
    }
  }
  connectButton.disabled = false;
}

/**
@param {HTMLButtonElement} button
@param {HTMLTableRowElement} row
@param {BluetoothRemoteGATTServer} gattServer
@returns {Promise<void>}
*/
async function forgetDevice(button, row, gattServer) {
  button.disabled = true;
  if (gattServer.connected) {
    gattServer.disconnect();
  }
  gattServer.device.forget();
  button.innerText = "Removed";
  setTimeout(() => row.remove(), 600);
}

/**
@param {HTMLButtonElement} button
@param {Dashboard} dashboard
@param {AbortController} controller
*/
function onDisconnected(button, dashboard, controller) {
  button.innerText = "Connect";
  dashboard.remove();
  controller.abort();
  sendMessage("Robot disconnected", 3000);
}
