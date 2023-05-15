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

export async function scanForRobots(button: HTMLButtonElement, table: HTMLTableSectionElement): Promise<void> {
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

async function connectRobot(
  gattServer: BluetoothRemoteGATTServer,
  connectButton: HTMLButtonElement,
  forgetButton: HTMLButtonElement
): Promise<void> {
  sendMessage("Connecting", 3000);
  try {
    gattServer = await gattServer.connect()
    sendMessage("Connected", 3000);
    connectButton.innerText = "Disconnect";

    const robot = new Robot(gattServer);
    robot.listenForIncomingPackets();
    const dashboard = new Dashboard(robot, forgetButton);

    gattServer.device.addEventListener("gattserverdisconnected", () => onDisconnected(connectButton, dashboard));

  } catch (error) {
    if (error instanceof DOMException) {
      sendMessage(error.message);
    }
  }
}

function addToKnownDevices(
  gattServer: BluetoothRemoteGATTServer,
  table: HTMLTableSectionElement,
): HTMLButtonElement[] {
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

async function connectToGATTServer(
  gattServer: BluetoothRemoteGATTServer,
  connectButton: HTMLButtonElement,
  forgetButton: HTMLButtonElement,
) {
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

async function forgetDevice(
  button: HTMLButtonElement,
  row: HTMLTableRowElement,
  gattServer: BluetoothRemoteGATTServer
) {
  button.disabled = true;
  if (gattServer.connected) {
    gattServer.disconnect();
  }
  gattServer.device.forget();
  button.innerText = "Removed";
  setTimeout(() => row.remove(), 600);
}

function onDisconnected(button: HTMLButtonElement, dashboard: Dashboard) {
  button.innerText = "Connect";
  dashboard.remove();
  sendMessage("Robot disconnected", 3000);
}
