import { Robot } from './robot.js';
import Sweep from './commands/sweep.js';

export default class Dashboard {
  // robot;
  div;

  /**
  @param {Robot} robot
  @param {HTMLButtonElement} forgetButton
  */
  constructor(robot, forgetButton) {
    this.robot = robot;
    this.div = document.createElement('div');
    this.display(robot, this.div);
    forgetButton.addEventListener('click', () => this.remove());

    // this.robot.server.device.addEventListener("gattserverdisconnected", this.onDisconnected);
  }

  /**
  @param {Robot} robot
  @param {HTMLDivElement} div
  @returns {Promise<void>}
  */
  async display(robot, div) {
    const stopButton = document.createElement('button');
    stopButton.innerText = "Stop!";
    stopButton.disabled = true;
    div.append(stopButton);

    // const infoButton = document.createElement('button');
    // infoButton.innerText = "Info";
    // infoButton.addEventListener('click', () => this.getRobotInfo(robot.server))
    // div.append(infoButton);

    const undockButton = document.createElement('button');
    undockButton.innerText = "Undock";
    undockButton.addEventListener('click', async () => await robot.motors.undock());
    div.append(undockButton);

    const dockButton = document.createElement('button');
    dockButton.innerText = "Dock";
    dockButton.addEventListener('click', () => robot.motors.dock());
    div.append(dockButton);

    const getEventsButton = document.createElement('button');
    getEventsButton.innerText = "getEvents";
    getEventsButton.addEventListener('click', () => robot.general.getEnabledEvents());
    div.append(getEventsButton);

    const enableEventsButton = document.createElement('button');
    enableEventsButton.innerText = this.toTitleCase("enableEvents");
    enableEventsButton.addEventListener('click', () => robot.general.enableEvents([1, 4, 120, 123, 56, 58, 40]));
    div.append(enableEventsButton);

    // const getBatteryLevelButton = document.createElement('button');
    // getBatteryLevelButton.innerText = this.toTitleCase("getBatteryLevel");
    // getBatteryLevelButton.addEventListener('click', () => robot.getBatteryLevel());
    // div.append(getBatteryLevelButton);

    const driveDistanceButton = document.createElement('button');
    driveDistanceButton.innerText = this.toTitleCase("driveDistance");
    driveDistanceButton.addEventListener('click', () => robot.motors.driveDistance(100));
    div.append(driveDistanceButton);

    const getPositionButton = document.createElement('button');
    getPositionButton.innerText = this.toTitleCase("getPosition");
    getPositionButton.addEventListener('click', () => robot.motors.getPosition());
    div.append(getPositionButton);

    const setMotorSpeed40Button = document.createElement('button');
    setMotorSpeed40Button.innerText = this.toTitleCase("setMotorSpeed10");
    setMotorSpeed40Button.addEventListener('click', () => robot.motors.setLeftAndRightMotorSpeed(40, 40));
    div.append(setMotorSpeed40Button);

    const setMotorSpeed0Button = document.createElement('button');
    setMotorSpeed0Button.innerText = this.toTitleCase("setMotorSpeed0");
    setMotorSpeed0Button.addEventListener('click', () => robot.motors.setLeftAndRightMotorSpeed(0, 0));
    div.append(setMotorSpeed0Button);

    const rotateLeftButton = document.createElement('button');
    rotateLeftButton.innerText = this.toTitleCase("rotateLeft");
    rotateLeftButton.addEventListener('click', () => robot.motors.rotateAngle(-900));
    div.append(rotateLeftButton);

    const rotateRightButton = document.createElement('button');
    rotateRightButton.innerText = this.toTitleCase("rotateRight");
    rotateRightButton.addEventListener('click', () => robot.motors.rotateAngle(900));
    div.append(rotateRightButton);

    const navigateToPositionButton = document.createElement('button');
    navigateToPositionButton.innerText = this.toTitleCase("navigateToPosition");
    navigateToPositionButton.addEventListener('click', () => robot.motors.navigateToPosition(-200, -950, 2345));
    div.append(navigateToPositionButton);

    const driveArcButton = document.createElement('button');
    driveArcButton.innerText = this.toTitleCase("driveArc");
    driveArcButton.addEventListener('click', () => robot.motors.driveArc(900, 300));
    div.append(driveArcButton);

    const sayPhraseButton = document.createElement('button');
    sayPhraseButton.innerText = this.toTitleCase("sayPhrase");
    sayPhraseButton.addEventListener('click', () => robot.sound.sayPhrase("test"));
    div.append(sayPhraseButton);

    const stopSoundButton = document.createElement('button');
    stopSoundButton.innerText = this.toTitleCase("stopSound");
    stopSoundButton.addEventListener('click', () => robot.sound.stopSound());
    div.append(stopSoundButton);

    const irProximityButton = document.createElement('button');
    irProximityButton.innerText = this.toTitleCase("irProximity");
    irProximityButton.addEventListener('click', () => robot.irProximity.getIRProximityValuesWithTimestamp());
    div.append(irProximityButton);

    const irProximityPackedButton = document.createElement('button');
    irProximityPackedButton.innerText = this.toTitleCase("irProximityPacked");
    irProximityPackedButton.addEventListener('click', () => robot.irProximity.getPackedIRProximityValuesAndStates());
    div.append(irProximityPackedButton);

    const irEventThresholds = document.createElement('button');
    irEventThresholds.innerText = this.toTitleCase("irEventThresholds");
    irEventThresholds.addEventListener('click', () => robot.irProximity.getEventThresholds());
    div.append(irEventThresholds);

    const setIREventThresholds = document.createElement('button');
    setIREventThresholds.innerText = this.toTitleCase("setIREventThresholds");
    setIREventThresholds.addEventListener('click', () => robot.irProximity.setEventThresholds(20, [150, 150, 150, 150, 150, 150, 150]));
    div.append(setIREventThresholds);

    const updateButton = document.createElement('button');
    updateButton.innerText = this.toTitleCase("update");
    updateButton.addEventListener('click', () => robot.requestEasyUpdate());
    div.append(updateButton);

    const changeNameButton = document.createElement('button');
    changeNameButton.innerText = this.toTitleCase("changeName");
    changeNameButton.addEventListener('click', () => robot.general.setName("iRobot-6CD80E0AA"));
    div.append(changeNameButton);

    const accelerometerButton = document.createElement('button');
    accelerometerButton.innerText = this.toTitleCase("accelerometer");
    accelerometerButton.addEventListener('click', () => robot.getAccelerometer());
    div.append(accelerometerButton);


    const controller = new AbortController();
    const executeCommandsButton = document.createElement('button');
    executeCommandsButton.innerText = this.toTitleCase("Run program");
    executeCommandsButton.addEventListener(
      'click',
      () => this.#someProgram(robot, executeCommandsButton, controller, stopButton),
      { signal: controller.signal }
    );
    div.append(executeCommandsButton);

    this.addMap(div);

    robot.tx.addEventListener("getPositionResponse", (event) => {
      const packet = /**@type {CustomEvent}*/(event).detail.packet;
      const x = packet.getInt32(7);
      const y = packet.getInt32(11);
      const heading = packet.getInt16(15) / 10.0;
      this.robot.mapWorker.postMessage({position: { x: x, y: y, heading: heading }});
    });

    robot.tx.addEventListener("IRProximityEvent", (event) => {
      const packet = /**@type {CustomEvent}*/(event).detail.packet;
      const sensors = robot.readPackedIRProximity(packet);
      this.robot.mapWorker.postMessage({sensors: sensors})
    });

    robot.tx.addEventListener("getDockingValuesResponse", (event) => {
      const packet = /**@type {CustomEvent}*/(event).detail.packet;
      const dockingStatus = this.robot.readDockingSensor(packet);
      this.robot.mapWorker.postMessage({dockingStatus: dockingStatus})
    });

    await robot.getDockingValues();
    await robot.motors.getPosition();

    document.getElementsByTagName('main')[0].append(div);
    // this.#getRobotInfo(robot, div);
  }

  remove() {
    this.div.remove()
  }

  /**
  @param {HTMLDivElement} div
  @returns {void}
  */
  addMap(div) {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 400;

    // const dockingStatus = await this.robot.getDockingValues();
    // const position = await robot.motors.getPosition();

    const offscreen = canvas.transferControlToOffscreen();
    // const mapWorker = new Worker('../workers/map.js');
    // mapWorker.postMessage({ canvas: offscreen, dockingStatus: dockingStatus, position: position }, [offscreen]);
    this.robot.mapWorker.postMessage({canvas: offscreen}, [offscreen]);
    div.append(canvas);
  }

  /**
  @param {Robot} robot
  @param {HTMLButtonElement} button
  @param {AbortController} controller
  @param {HTMLButtonElement} stopButton
  @returns {Promise<void>}
  */
  async #someProgram(robot, button, controller, stopButton) {
    button.disabled = true;
    controller.abort();

    stopButton.addEventListener('click', () => {
      const newController = new AbortController();

      button.addEventListener(
        'click',
        () => this.#someProgram(robot, button, newController, stopButton),
        { signal: newController.signal }
      );
      button.disabled = false;
    });

    const program = new Sweep(robot);
    await program.start(stopButton);
  }

  /**
  @param {Robot} robot
  @param {HTMLDivElement} div
  @returns {Promise<void>}
  */
  async #getRobotInfo(robot, div) {
    const list = document.createElement('ul');

    const name = document.createTextNode(await robot.general.getName());
    const nameListItem = document.createElement('li');
    nameListItem.innerText = "Name: ";
    nameListItem.append(name);
    const changeNameButton = document.createElement('button');
    changeNameButton.innerText = "Change";
    changeNameButton.addEventListener('click', () => this.#changeName(nameListItem, name, changeNameButton));
    nameListItem.append(changeNameButton);
    list.append(nameListItem);

    const logsLink = await this.#addLogsLink(robot);
    const logsListItem = document.createElement('li');
    logsListItem.append(logsLink);
    list.append(logsListItem);

    const skuListItem = document.createElement('li');
    const sku = await robot.general.getSKU();
    skuListItem.innerText = "SKU: " + sku;
    list.append(skuListItem);

    const versionNumbers = await robot.general.getVersions("main");

    const firmwareListItem = document.createElement('li');
    firmwareListItem.innerText = "Firmware: " + versionNumbers.firmware;
    list.append(firmwareListItem);

    const protocolListItem = document.createElement('li');
    protocolListItem.innerText = "Bluetooth protocol: " + versionNumbers.bluetoothProtocol;
    list.append(protocolListItem);

    const batteryListItem = document.createElement('li');
    const { percent, milliVolts } = await robot.getBatteryLevel();
    batteryListItem.innerText = "Battery: " + percent + "% (" + milliVolts / 1000 + "V)";
    list.append(batteryListItem);

    // const serialNumberListItem = document.createElement('li');
    // const serialNumber = await robot.general.getSerialNumber();
    // skuListItem.innerText = "Serial number: " + serialNumber;
    // list.append(serialNumberListItem);

    div.append(list);
  }

  /**
  @param {HTMLLIElement} listItem
  @param {Text} name
  @param {HTMLButtonElement} button
  */
  #changeName(listItem, name, button) {
    const formName = "changeName";

    const form = document.createElement('form');

    const label = document.createElement('label');
    label.htmlFor = formName;
    label.innerText = "Name: ";
    form.append(label);

    const input = document.createElement('input');
    input.id = formName;
    input.name = "name";
    input.value = name.nodeValue ? name.nodeValue : "My Robot";
    input.required = true;
    form.append(input);

    const submitButton = document.createElement('button');
    submitButton.type = "submit";
    submitButton.innerText = "Submit";
    form.append(submitButton);

    const cancelButton = document.createElement('button');
    cancelButton.type = "button";
    cancelButton.innerText = "cancel";
    form.append(cancelButton);

    input.addEventListener('input', () => this.#validateName(input, submitButton));
    form.addEventListener('submit', (event) => this.#requestNameChange(event, form, listItem, name, button));
    cancelButton.addEventListener('click', () => listItem.replaceChildren("Name: ", name, button));

    listItem.replaceChildren(form);
  }

  /**
  Ensures name isn't more than 16 utf-8 bytes long, also ensures it isn't solely blank spaces.
  @param {HTMLInputElement} input
  @param {HTMLButtonElement} button
  */
  #validateName(input, button) {
    const encoder = new TextEncoder();
    if (encoder.encode(input.value).length > 16 || /^\s*$/.test(input.value)) {
      input.className = "error";
      button.disabled = true;
    } else {
      input.className = "";
      button.disabled = false;
    }
  }

  /**
  @param {SubmitEvent} event
  @param {HTMLFormElement} form
  @param {HTMLLIElement} listItem
  @param {Text} name
  @param {HTMLButtonElement} button
  @todo check if connected to robot
  @todo gracefully fail if no response from setName request
  */
  async #requestNameChange(event, form, listItem, name, button) {
    event.preventDefault();

    const data = new FormData(form);
    const newName = data.get("name");

    if (newName) {
      name.nodeValue = await this.robot.general.setName(newName.toString());
    }

    listItem.replaceChildren("Name: ", name, button);
  }

  /**
  @param {Robot} robot
  @returns {Promise<HTMLAnchorElement>}
  */
  async #addLogsLink(robot) {
    const addresses = await robot.getIPv4Addresses();
    const anchor = document.createElement('a');
    anchor.href = "http://" + addresses.wlan0 + "/logs";
    anchor.innerText = "Logs";
    anchor.target = "_blank";
    return anchor;
  }

  // /**
  // @param {BluetoothRemoteGATTServer} robot
  // @returns {Promise<void>}
  // */
  // async getRobotInfo(robot) {
  //   try {
  //     sendMessage("Getting robot information", 4000);
  //     const services = await robot.getPrimaryServices(robotServices.information.uuid);

  //     const table = document.createElement('table');
  //     const tableBody = table.createTBody();

  //     for (const service of services) {
  //       try {
  //         const characteristics = await service.getCharacteristics();
  //         for (const characteristic of characteristics) {
  //           try {
  //             const value = await characteristic.readValue();

  //             let characteristicEntry = Object.entries(robotServices.information.characteristic).find((item) => {
  //               return item[1] === characteristic.uuid
  //             });

  //             if (typeof characteristicEntry !== 'undefined') {
  //               const [characteristicName,] = characteristicEntry;

  //               const row = tableBody.insertRow();
  //               row.insertCell().innerText = this.toTitleCase(characteristicName);

  //               let characteristicValue;
  //               if (characteristic.uuid === robotServices.information.characteristic.state) {
  //                 characteristicValue = this.getStateInformation(value);
  //               } else {
  //                 characteristicValue = this.parseValue(value);
  //               }

  //               row.insertCell().innerText = characteristicValue;
  //             }

  //           } catch (error) {
  //             if (error instanceof DOMException) {
  //               sendMessage(error.message);
  //               console.log("Couldn't read value.")
  //             }
  //           }
  //         }
  //       } catch (error) {
  //         if (error instanceof DOMException) {
  //           sendMessage(error.message);
  //           console.log("Coudn't find any characteristics for this service.")
  //         }
  //       }
  //     }
  //     document.getElementsByTagName('main')[0].append(table);
  //   } catch (error) {
  //     if (error instanceof DOMException) {
  //       sendMessage(error.message);
  //       console.log("No services found");
  //     }
  //   }
  // }

  /**
  @param {DataView} data
  @returns {string}
  */
  getStateInformation(data) {
    const length = data.byteLength;
    const sensors = data.getUint8(0);
    const bits = (sensors >>> 0).toString(2);
    const battery = data.getUint8(1);
    console.log("Sensor bits: ", bits, "Battery: ", battery);
    return "Sensor bits: " + bits.toString() + " Battery: " + battery.toString() + " Length: " + length.toString();
  }

  /**
  @param {DataView} value
  @returns {string}
  */
  parseValue(value) {
    const utf8decoder = new TextDecoder();
    const something = new Uint8Array(value.buffer)
    return utf8decoder.decode(something);
  }

  /**
  @param {string} text
  @returns {string}
  */
  toTitleCase(text) {
    const textWithSpaces = text.replace(/([A-Z])/g, " $1");
    return textWithSpaces.charAt(0).toUpperCase() + textWithSpaces.slice(1);
  }
}
