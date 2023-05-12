import sendMessage from './message.js';
import { displayBluetooth } from './bluetooth.js';

async function activateBluetooth() {
  const bluetoothAvailable = await navigator.bluetooth.getAvailability();
  if (bluetoothAvailable) {
    displayBluetooth();
  } else {
    sendMessage("Bluetooth not available");
  }
}

async function checkBluetoothAvailability() {
  if ("bluetooth" in navigator) {
    const bluetoothAvailable = await navigator.bluetooth.getAvailability();
    if (bluetoothAvailable) {
      activateBluetooth();
    } else {
      navigator.bluetooth.addEventListener("availabilitychanged", activateBluetooth);
      sendMessage("Enable Bluetooth and reload page");
    }
  } else {
    sendMessage('Bluetooth not available.');
    sendMessage('Is Bluetooth enabled in the browser settings? Go to chrome://flags#enable-experimental-web-platform-features and enable.');
  }
}

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', checkBluetoothAvailability);
} else {
  checkBluetoothAvailability();
}
