import sendMessage from './message.js';
import { displayKnownDevices } from './bluetooth.js';

/**
 * @returns {Promise<void>}
 */
async function checkBluetoothAvailability() {
  if (!("bluetooth" in navigator)) {
    sendMessage('Bluetooth not available.');
    sendMessage('Is Bluetooth enabled in the browser settings? Go to chrome://flags#enable-experimental-web-platform-features and enable.');
    sendMessage('Go to chrome://flags#enable-web-bluetooth-new-permissions-backend and enable.');
    return;
  }

  const bluetoothAvailable = await navigator.bluetooth.getAvailability();

  if (!bluetoothAvailable) {
    navigator.bluetooth.addEventListener("availabilitychanged", displayKnownDevices);
    sendMessage("Enable Bluetooth and reload page");
    return;
  }

  displayKnownDevices();
}

checkBluetoothAvailability();
