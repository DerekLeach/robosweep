import { IDENTIFIER, INFORMATION, UART, TX, RX, checkCRC, getGATTServer, onResponse } from './utils.js';
import { dockStatus } from './docking.js';
import { disconnect, getDockingValues, getBatteryLevel, getIPv4Addresses, getEventThresholds, setEventThresholds } from './commands.js';
import { emergencyStop, onEvent } from './events.js';
import { startSweep } from './sweep.js';

let mapWorker = /**@type {Worker | undefined}*/(undefined);
export let rx = /**@type {BluetoothRemoteGATTCharacteristic | undefined}*/(undefined);
export let tx = /**@type {BluetoothRemoteGATTCharacteristic | undefined}*/(undefined);

/**
 * @returns {void}
 */
function setupMenu() {
  const menuTabs = document.getElementsByClassName('tab');
  for (let i = 0; i < menuTabs.length; ++i) {
    menuTabs[i].addEventListener('click', displayMenu);
    menuTabs[i].classList.add('connected');
    if (menuTabs[i].id === 'ir-sensors-tab')
      menuTabs[i].addEventListener('click', getEventThresholds);
  }
}

/**
 * @returns {void}
 */
function disableMenu() {
  const menuTabs = document.getElementsByClassName('tab');
  for (let i = 0; i < menuTabs.length; ++i) {
    menuTabs[i].removeEventListener('click', displayMenu);
    menuTabs[i].classList.remove('connected');
  }

  const selectedElements = document.querySelectorAll('.selected-tab');

  for (let i = 0; i < selectedElements.length; ++i) {
    selectedElements[i].classList.remove('selected-tab');
  }

  const devicesTab = document.getElementById('devices-tab');
  const devicesTabPage = document.getElementById('devices-tab-page');
  devicesTab?.classList.add('selected-tab');
  devicesTabPage?.classList.add('selected-tab');
}

/**
 * @param {Event} event
 * @returns {void}
 */
function displayMenu(event) {
  const menuTab = /**@type {HTMLLIElement}*/(event.target);
  const menuTabPage = document.getElementById(menuTab.id + '-page');

  if (menuTabPage === null)
    return;

  const selectedElements = document.querySelectorAll('.selected-tab');

  for (let i = 0; i < selectedElements.length; ++i) {
    selectedElements[i].classList.remove('selected-tab');
  }

  menuTab.classList.add('selected-tab');
  menuTabPage.classList.add('selected-tab');
}

export async function displayKnownDevices() {
  const devices = await navigator.bluetooth.getDevices();

  for (const device of devices) {
    if (device.gatt === undefined) {
      device.forget();
      continue;
    }
    addToKnownDevices(device.gatt);
  }

  const scanForRobotsButton = document.getElementById('scan-button');
  if (!(scanForRobotsButton instanceof HTMLButtonElement))
    return;
  scanForRobotsButton.disabled = false;
  scanForRobotsButton.addEventListener('click', scanForDevices);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function scanForDevices(event) {
  const button = /** @type {HTMLButtonElement} */ (event.target);
  button.disabled = true;
  button.innerText = "Scanning";

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [IDENTIFIER] }],
    // Optional services need to be listed to be able to access them later.
    optionalServices: [
      INFORMATION,
      UART
    ]
  });

  if (device.gatt === undefined) {
    console.log("No GATT server found");
    button.innerText = "Scan";
    button.disabled = false;
    return;
  }

  addToKnownDevices(device.gatt);

  button.innerText = "Scan";
  button.disabled = false;
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function connectRobot(event) {
  const connectButton = /**@type {HTMLButtonElement}*/(event.target);
  connectButton.disabled = true;
  connectButton.innerText = "Connecting";

  var gattServer = await getGATTServer(connectButton.dataset.deviceID);
  if (gattServer === undefined) {
    connectButton.innerText = "Error";
    console.log("No device found");
    return;
  }

  const dockButton = document.getElementById("dock-button");
  if (dockButton === null)
    return;
  dockButton.dataset.deviceID = connectButton.dataset.deviceID;

  try {
    gattServer = await gattServer.connect()
  } catch (error) {
    console.error(error);
  }

  if (!gattServer.connected) {
    console.log("Not connected");
    connectButton.innerText = "Connect";
    connectButton.disabled = false;
    return;
  }

  gattServer.device.addEventListener("gattserverdisconnected", disconnected);
  setupMenu();

  const uart = await gattServer.getPrimaryService(UART);
  tx = await uart.getCharacteristic(TX);
  rx = await uart.getCharacteristic(RX);

  // tx.addEventListener("characteristicvaluechanged", emergencyStop);
  tx.addEventListener("characteristicvaluechanged", onEvent);
  tx.addEventListener("characteristicvaluechanged", onResponse);
  tx.startNotifications();

  await dashboard(gattServer, tx);

  const runProgram = /**@type {HTMLButtonElement}*/(document.getElementById('run-program'));
  runProgram.addEventListener('click', startSweep);
  runProgram.disabled = false;

  connectButton.removeEventListener('click', connectRobot);
  connectButton.addEventListener('click', disconnectRobot);
  connectButton.innerText = "Disconnect";
  connectButton.disabled = false;
}

/**
 * @param {BluetoothRemoteGATTServer} gattServer
 * @param {BluetoothRemoteGATTCharacteristic} tx
 * @return {Promise<void>}
 */
async function dashboard(gattServer, tx) {
  const id = gattServer.device.id;
  const dashboard = document.getElementById('dashboard');
  if (!(dashboard instanceof HTMLDivElement))
    return;
  dashboard.id = "dashboard-" + id;

  const requestQueue = document.createElement('ul');
  requestQueue.id = "request-queue";
  requestQueue.dataset.incrementID = "-1";

  const eventQueue = document.createElement('ul');
  eventQueue.id = "event-queue";
  eventQueue.dataset.incrementID = "-1";

  mapWorker = new Worker('../workers/map2.js');

  const canvas = document.getElementById('map');
  if (!(canvas instanceof HTMLCanvasElement))
    return;

  const offscreen = canvas.transferControlToOffscreen();
  mapWorker.postMessage(offscreen, [offscreen]);

  dashboard.append(eventQueue);
  dashboard.append(requestQueue);

  tx.addEventListener("characteristicvaluechanged", updateMap);
  tx.addEventListener("characteristicvaluechanged", dockStatus);

  document.getElementsByTagName('main')[0].append(dashboard);

  await getDockingValues();
  await getBatteryLevel();
  await getIPv4Addresses();
  await setEventThresholds();
}

/**
 * @param {Event} event
 * @return {Promise<void>}
 */
async function disconnectRobot(event) {
  const connectButton = /**@type {HTMLButtonElement}*/(event.target);
  connectButton.disabled = true;
  connectButton.innerText = "Disconnecting";

  const gattServer = await getGATTServer(connectButton.dataset.deviceID);
  if (gattServer === undefined) {
    console.log("No device found");
    return;
  }

  if (!gattServer.connected) {
    connectButton.innerText = "Connect";
    connectButton.disabled = false;
    console.log("Not connected");
    return;
  }

  const uart = await gattServer.getPrimaryService(UART);
  const tx = await uart.getCharacteristic(TX);

  tx.removeEventListener("characteristicvaluechanged", onResponse);
  tx.removeEventListener("characteristicvaluechanged", onEvent);
  tx.removeEventListener("characteristicvaluechanged", updateMap);
  tx.removeEventListener("characteristicvaluechanged", emergencyStop);
  await tx.stopNotifications();

  await disconnect();

  gattServer.disconnect();
}

/**
 * @param {Event} event
 * @return {void}
 */
function disconnected(event) {
  disableMenu();
  const device = /**@type {BluetoothDevice}*/(event.target);
  device.removeEventListener("gattserverdisconnected", disconnected);
  const connectButtonID = "connect-" + device.id;
  const connectButton = /**@type {HTMLButtonElement}*/(document.getElementById(connectButtonID));
  connectButton.removeEventListener('click', disconnectRobot);
  connectButton.addEventListener('click', connectRobot);
  connectButton.innerText = "Connect";
  connectButton.disabled = false;

  mapWorker?.terminate();
}

/**
 * @param {Event} event
 * @returns {void}
 */
function updateMap(event) {
  const tx = /**@type {BluetoothRemoteGATTCharacteristic}*/(event.target);

  if (!(tx.value instanceof DataView)) {
    console.log("Not a DataView");
    return;
  }

  if (checkCRC(tx.value) !== 0) {
    console.log("Packet corrupted");
    return;
  }

  if (mapWorker === undefined) {
    console.log("Map worker not initialized");
    return;
  }

  switch (tx.value.getUint16(0)) {
    case 0x0108: // driveDistanceFinishedResponse
    case 0x010C: // rotateAngleFinishedResponse
    case 0x0110: // getPositionResponse
    case 0x0111: // navigateToPositionFinishedResponse
    // case 0x0113: // dock
    // case 0x0114: // undock
    case 0x011B: // driveArcFinishedResponse
    case 0x0B00: // IRProximityEvent
    // case 0x0B01: // getIRProximityValuesWithTimestampResponse
    case 0x0B02: // getPackedIRProximityValuesAndStatesResponse
    // case 0x0B04: // getEventThresholdsResponse
    case 0x1300: // dockingSensorEvent
    case 0x1301: // getDockingValuesResponse
      mapWorker.postMessage(tx.value /*, [tx.value.buffer]*/);
    default: break;
  }
}

/**
@param {BluetoothRemoteGATTServer} gattServer
@returns {void}
*/
function addToKnownDevices(gattServer) {
  const deviceDiv = document.createElement('div');
  deviceDiv.id = "device-" + gattServer.device.id;
  deviceDiv.classList.add("menu-row");
  const deviceName = document.createElement('span');
  deviceName.innerText = gattServer.device.name ?? gattServer.device.id;
  deviceName.classList.add("menu-name");
  deviceDiv.append(deviceName);

  const devicesMenu = document.getElementById("devices-tab-page");
  if (devicesMenu === null) {
    console.log("No devices menu found");
    return;
  }

  const connectButton = document.createElement('button');
  connectButton.innerText = "Connect";
  connectButton.id = "connect-" + gattServer.device.id;
  connectButton.dataset.deviceID = gattServer.device.id;
  connectButton.addEventListener('click', connectRobot);
  deviceDiv.append(connectButton);

  const forgetButton = document.createElement('button');
  forgetButton.innerText = "Forget";
  forgetButton.id = "forget-" + gattServer.device.id;
  forgetButton.dataset.deviceID = gattServer.device.id;
  forgetButton.addEventListener('click', forgetDevice)
  deviceDiv.append(forgetButton);

  devicesMenu.prepend(deviceDiv);
}

/**
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function forgetDevice(event) {
  const button = /**@type {HTMLButtonElement}*/(event.target);
  const divID = "device-" + button.dataset.deviceID;
  const div = /**@type {HTMLTableRowElement}*/(document.getElementById(divID));

  const gattServer = await getGATTServer(button.dataset.deviceID);
  if (gattServer === undefined) {
    console.log("No device found");
    return;
  }

  button.disabled = true;
  if (gattServer.connected) {
    gattServer.disconnect();
  }
  gattServer.device.forget();
  button.innerText = "Removed";
  div.remove();
}
