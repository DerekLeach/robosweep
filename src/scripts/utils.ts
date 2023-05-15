import sendMessage from './message';
import { robotServices } from './robot';

export async function scanServices(robot: BluetoothRemoteGATTServer): Promise<void> {
  try {
    sendMessage("Scanning for services", 3000);
    const scannedServices = await robot.getPrimaryServices();
    if (scannedServices.length != 0) {
      for (const foundService of scannedServices) {
        console.log("Found service: ", foundService.uuid);
        if (foundService.uuid === robotServices.identifier.uuid) {
          continue;
        }
        const scannedCharacteristics = await foundService.getCharacteristics();
        if (scannedCharacteristics.length != 0) {
          for (const foundCharacteristic of scannedCharacteristics) {
            console.log("Found characteristic: ", foundCharacteristic.uuid);
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof DOMException) {
      sendMessage("Failed to scan for services: " + error.message);
    }
  }
}
