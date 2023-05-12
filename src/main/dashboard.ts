import { Robot, robotServices } from './robot.js';
import sendMessage from './message.js';

export default class Dashboard {
  robot: Robot;
  div: HTMLDivElement;

  constructor(robot: Robot, forgetButton: HTMLButtonElement) {
    this.robot = robot;
    this.div = document.createElement('div');
    this.display();

    forgetButton.addEventListener('click', () => this.div.remove());
    // this.robot.server.device.addEventListener("gattserverdisconnected", this.onDisconnected);
  }

  display() {
    const infoButton = document.createElement('button');
    infoButton.innerText = "Info";
    infoButton.addEventListener('click', () => this.getRobotInfo(this.robot.server))
    this.div.append(infoButton);

    const undockButton = document.createElement('button');
    undockButton.innerText = "Undock";
    undockButton.addEventListener('click', () => this.robot.undock());
    this.div.append(undockButton);

    const dockButton = document.createElement('button');
    dockButton.innerText = "Dock";
    dockButton.addEventListener('click', () => this.robot.dock());
    this.div.append(dockButton);

    const boardVersionButton = document.createElement('button');
    boardVersionButton.innerText = "boardVersion";
    boardVersionButton.addEventListener('click', () => this.robot.getVersions("main"));
    this.div.append(boardVersionButton);

    const nameButton = document.createElement('button');
    nameButton.innerText = "name";
    nameButton.addEventListener('click', () => this.robot.getName());
    this.div.append(nameButton);

    const getEventsButton = document.createElement('button');
    getEventsButton.innerText = "getEvents";
    getEventsButton.addEventListener('click', () => this.robot.getEnabledEvents());
    this.div.append(getEventsButton);

    const getSerialNumberButton = document.createElement('button');
    getSerialNumberButton.innerText = this.toTitleCase("getSerialNumber");
    getSerialNumberButton.addEventListener('click', () => this.robot.getSerialNumber());
    this.div.append(getSerialNumberButton);

    const getSKUButton = document.createElement('button');
    getSKUButton.innerText = this.toTitleCase("getSKU");
    getSKUButton.addEventListener('click', () => this.robot.getSKU());
    this.div.append(getSKUButton);

    const enableEventsButton = document.createElement('button');
    enableEventsButton.innerText = this.toTitleCase("enableEvents");
    enableEventsButton.addEventListener('click', () => this.robot.enableEvents([1]));
    this.div.append(enableEventsButton);

    const getBatteryLevelButton = document.createElement('button');
    getBatteryLevelButton.innerText = this.toTitleCase("getBatteryLevel");
    getBatteryLevelButton.addEventListener('click', () => this.robot.getBatteryLevel());
    this.div.append(getBatteryLevelButton);

    const driveDistanceButton = document.createElement('button');
    driveDistanceButton.innerText = this.toTitleCase("driveDistance");
    driveDistanceButton.addEventListener('click', () => this.robot.driveDistance(1000));
    this.div.append(driveDistanceButton);
    
    const getPositionButton = document.createElement('button');
    getPositionButton.innerText = this.toTitleCase("getPosition");
    getPositionButton.addEventListener('click', () => this.robot.getPosition());
    this.div.append(getPositionButton);

    document.getElementsByTagName('main')[0].append(this.div);
  }
  
  remove() {
    this.div.remove()
  }
  
  async getRobotInfo(robot: BluetoothRemoteGATTServer) {
    try {
      sendMessage("Getting robot information", 4000);
      const services = await robot.getPrimaryServices(robotServices.information.uuid);

      const table = document.createElement('table');
      const tableBody = table.createTBody();

      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const characteristic of characteristics) {
            try {
              const value = await characteristic.readValue();

              let characteristicEntry = Object.entries(robotServices.information.characteristic).find((item) => {
                return item[1] === characteristic.uuid
              });

              if (typeof characteristicEntry !== 'undefined') {
                const [characteristicName,] = characteristicEntry;

                const row = tableBody.insertRow();
                row.insertCell().innerText = this.toTitleCase(characteristicName);

                let characteristicValue;
                if (characteristic.uuid === robotServices.information.characteristic.state) {
                  characteristicValue = this.getStateInformation(value);
                } else {
                  characteristicValue = this.parseValue(value);
                }

                row.insertCell().innerText = characteristicValue;
              }

            } catch (error) {
              if (error instanceof DOMException) {
                sendMessage(error.message);
                console.log("Couldn't read value.")
              }
            }
          }
        } catch (error) {
          if (error instanceof DOMException) {
            sendMessage(error.message);
            console.log("Coudn't find any characteristics for this service.")
          }
        }
      }
      document.getElementsByTagName('main')[0].append(table);
    } catch (error) {
      if (error instanceof DOMException) {
        sendMessage(error.message);
        console.log("No services found");
      }
    }
  }

  getStateInformation(data: DataView): string {
    const length = data.byteLength;
    const sensors = data.getUint8(0);
    const bits = (sensors >>> 0).toString(2);
    const battery = data.getUint8(1);
    console.log("Sensor bits: ", bits, "Battery: ", battery);
    return "Sensor bits: " + bits.toString() + " Battery: " + battery.toString() + " Length: " + length.toString();
  }

  parseValue(value: DataView): string {
    const utf8decoder = new TextDecoder();
    const something = new Uint8Array(value.buffer)
    return utf8decoder.decode(something);
  }

  toTitleCase(text: string): string {
    const textWithSpaces = text.replace(/([A-Z])/g, " $1");
    return textWithSpaces.charAt(0).toUpperCase() + textWithSpaces.slice(1);
  }
}
