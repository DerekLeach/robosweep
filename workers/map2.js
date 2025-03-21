// @ts-check
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**@typedef {import('../js/motors.js').PositionStatus} PositionStatus*/
/**@typedef {import('../js/ir-proximity.js').IRSensors} IRSensors*/

const worker = /**@type {DedicatedWorkerGlobalScope & typeof globalThis}*/(this);
let context = /**@type {OffscreenCanvasRenderingContext2D | null}*/(null);

let x = 0;
let y = 0;
let heading = 0;

let startX = 0;
let startY = 0;
let startHeading = 0;

let charger = false;
let chargerX = 0;
let chargerY = 0;
let chargerHeading = 0;

let docked = false;
let sensors = /**@type {IRSensors}*/({
  triggered: [false, false, false, false, false, false, false],
  value: [0, 0, 0, 0, 0, 0, 0]
});
const frontRadius = 341.9 / 2;

this.addEventListener('message', init);

/**
 * @param {MessageEvent} event
 * @returns {void}
 */
function init(event) {
  if (!(event.data instanceof OffscreenCanvas)) {
    console.log("Expected offscreen canvas");
    return;
  }

  context = event.data.getContext("2d");
  if (context === null) {
    console.log("Could not get 2d context");
    return;
  }

  worker.addEventListener('message', startPosition);
  worker.addEventListener('message', draw);
  worker.removeEventListener('message', init);
}

/**
 * @param {MessageEvent} event
 * @returns {void}
 */
function startPosition(event) {
  if (!(event.data instanceof DataView)) {
    console.log("Expected data view");
    return;
  }

  switch (event.data.getUint16(0)) {
    case 0x0108: // driveDistanceFinishedResponse
    case 0x010C: // rotateAngleFinishedResponse
    case 0x0110: // getPositionResponse
    case 0x0111: // navigateToPositionFinishedResponse
    case 0x011B: // driveArcFinishedResponse
      setStartPosition(event.data);
      worker.removeEventListener('message', startPosition);
      break;
    default:
      break;
  }
}
/**
 * @param {MessageEvent} event
 * @returns {void}
 */
function draw(event) {
  if (!(event.data instanceof DataView)) {
    console.log("Expected data view");
    return;
  }

  switch (event.data.getUint16(0)) {
    case 0x0108: // driveDistanceFinishedResponse
    case 0x010C: // rotateAngleFinishedResponse
    case 0x0110: // getPositionResponse
    case 0x0111: // navigateToPositionFinishedResponse
    case 0x011B: // driveArcFinishedResponse
      updatePosition(event.data);
      if (docked) updateChargerPosition(event.data);
      break;
    // case 0x0113: docked = true; break;
    // case 0x0114: docked = false; break;
    case 0x0B00: // IRProximityEvent
      readPackedIRProximity(event.data);
      break;
    // case 0x0B01: // getIRProximityValuesWithTimestampResponse
    case 0x0B02: // getPackedIRProximityValuesAndStatesResponse
      readPackedIRProximity(event.data);
      break;
    case 0x1300: // dockingSensorEvent
    case 0x1301: // getDockingValuesResponse
      docked = event.data.getUint8(7) === 0 ? false : true;
      break;
    default:
      console.log("Unknown packet", event.data.getUint16(0));
      break;
  }

  charger = charger || docked;

  if (context === null)
    return;

  scaleMap(context);
  if (charger) drawChargingStation(context);
  drawRobot(context);
}

/**
 * @param {DataView} packet
 * @returns {void}
 */
function updatePosition(packet) {
  x = packet.getInt32(7);
  y = packet.getInt32(11);
  heading = packet.getInt16(15) / 10.0;
}

/**
 * @param {DataView} packet
 * @returns {void}
 */
function setStartPosition(packet) {
  startX = packet.getInt32(7);
  startY = packet.getInt32(11);
  startHeading = packet.getInt16(15) / 10.0;
}

/**
 * @param {DataView} packet
 * @returns {void}
 */
function updateChargerPosition(packet) {
  chargerX = packet.getInt32(7);
  chargerY = packet.getInt32(11);
  chargerHeading = packet.getInt16(15) / 10.0;
}

/**
 * @param {OffscreenCanvasRenderingContext2D} context
 * @returns {void}
 **/
function scaleMap(context) {
  const margin = 400;

  const xMax = startX > x ? startX + margin : x + margin;
  const xMin = startX < x ? startX - margin : x - margin;

  const yMax = startY > y ? startY + margin : y + margin;
  const yMin = startY < y ? startY - margin : y - margin;

  const zoomX = context.canvas.width / (xMax - xMin);
  const zoomY = context.canvas.height / (yMax - yMin);

  const zoom = zoomX < zoomY ? zoomX : zoomY;

  const xMinClear = zoomX < zoomY ? xMin : xMin - 0.5 * (context.canvas.width / zoom - (xMax - xMin));
  const xMaxClear = zoomX < zoomY ? xMax : xMax + 0.5 * (context.canvas.width / zoom - (xMax - xMin));

  const yMinClear = zoomX > zoomY ? yMin : yMin - 0.5 * (context.canvas.height / zoom - (yMax - yMin));
  const yMaxClear = zoomX > zoomY ? yMax : yMax + 0.5 * (context.canvas.height / zoom - (yMax - yMin));

  const translateX = 0.5 * (context.canvas.width - zoom * (xMax + xMin));
  const translateY = 0.5 * (context.canvas.height + zoom * (yMax + yMin));

  context.setTransform(zoom, 0, 0, -zoom, translateX, translateY);
  context.clearRect(xMinClear, yMinClear, xMaxClear - xMinClear, yMaxClear - yMinClear);
}

/**
 * @param {OffscreenCanvasRenderingContext2D} context
 */
function drawChargingStation(context) {
  const theta = chargerHeading * (Math.PI / 180);
  const chargingStation = new Path2D();
  context.fillStyle = "rgb(30, 30, 50)";
  context.shadowColor = "black";
  context.shadowBlur = 5;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  context.lineWidth = 0;
  context.save();
  context.translate(chargerX, chargerY);
  context.rotate(theta);
  chargingStation.moveTo(frontRadius - 60, -66);
  chargingStation.arc(frontRadius - 20, 0, 77, -0.5 - Math.PI / 2, Math.PI / 2 + 0.5, true)
  chargingStation.lineTo(frontRadius + 24, 66);
  chargingStation.arcTo(frontRadius + 48, 66, frontRadius + 48, 42, 24);
  chargingStation.lineTo(frontRadius + 48, -42);
  chargingStation.arcTo(frontRadius + 48, -66, frontRadius + 24, -66, 24);
  chargingStation.lineTo(frontRadius - 60, -66);
  chargingStation.closePath();
  context.fill(chargingStation);
  context.stroke(chargingStation)

  const pillar = new Path2D();
  context.fillStyle = "rgb(40, 40, 60)";
  context.shadowColor = "black";
  context.shadowBlur = 15;
  context.shadowOffsetX = 15;
  context.shadowOffsetY = 10;
  pillar.moveTo(frontRadius, -40);
  pillar.arc(frontRadius + 22, -40, 22, -Math.PI, 0, false);
  pillar.lineTo(frontRadius + 44, 40);
  pillar.arc(frontRadius + 22, 40, 22, 0, Math.PI, false);
  pillar.closePath();
  context.fill(pillar);

  // Charging contacts
  context.fillStyle = "rgb(150, 150, 150)";
  context.fillRect(frontRadius - 53, 46, 13, -5);
  context.fillRect(frontRadius - 53, -41, 13, -5);

  context.restore();
}

/**
 * @param {OffscreenCanvasRenderingContext2D} context
 **/
function drawRobot(context) {
  // https://iroboteducation.github.io/create3_docs/hw/mechanical#ir-proximity-sensors
  // const sensorAngles = [-65.3, -34, -14.25, 3, 20, 38, 65.3];
  const sensorAngles = [65.3, 38, 20, 3, -14.25, -34, -65.3];
  const frontRadius = 341.9 / 2;
  const backRadius = 162;

  context.save();
  context.translate(x, y);

  context.rotate(heading * (Math.PI / 180));

  const robot = new Path2D();
  context.shadowColor = "black";
  context.shadowBlur = 15;
  context.shadowOffsetX = 7;
  context.shadowOffsetY = 7;
  context.fillStyle = "rgb(70, 70, 70)";
  context.lineWidth = 8;
  context.lineJoin = "round";

  robot.arc(0, 0, backRadius, -Math.PI / 2, Math.PI / 2, true);
  robot.arc(0, 0, frontRadius, Math.PI / 2 - 0.2, -Math.PI / 2 + 0.2, true);
  robot.closePath();
  context.stroke(robot);
  context.fill(robot);

  context.shadowColor = "";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.fillStyle = "rgba(0, 70, 0, 0.5)";
  context.strokeStyle = "rgba(0, 70, 0, 0.8)";
  context.lineWidth = 2;
  context.lineJoin = "miter";

  const sensorArc = 4 * Math.PI / 180;
  for (const [i, sensorAngle] of sensorAngles.entries()) {
    const angle = sensorAngle * Math.PI / 180;
    const sensorX = backRadius * Math.cos(angle);
    const sensorY = backRadius * Math.sin(angle);
    if (sensors.triggered[i]) {
      context.fillStyle = "rgba(70, 0, 0, 0.5)";
      context.strokeStyle = "rgba(70, 0, 0, 0.8)";
    } else {
      context.fillStyle = "rgba(0, 70, 0, 0.5)";
      context.strokeStyle = "rgba(0, 70, 0, 0.8)";
    }
    const sensor = new Path2D();
    sensor.arc(sensorX, sensorY, frontRadius - backRadius, angle - sensorArc, angle + sensorArc, false);
    sensor.arc(sensorX, sensorY, frontRadius - backRadius + (204.8 - sensors.value[i] / 20), angle + sensorArc, angle - sensorArc, true);
    sensor.closePath();
    context.stroke(sensor);
    context.fill(sensor);
  }
  context.restore();
}

/**
@param {DataView} packet
@returns {void} Sensors 0 to 6, left to right from robot's point of view
*/
function readPackedIRProximity(packet) {
  // const timestamp = utils.readTimestamp(packet)

  const numberOfSensors = 7;

  for (let i = 0; i < numberOfSensors; i++) {
    sensors.triggered[i] = packet.getUint8(7) & 2 ** i ? true : false;
    sensors.value[i] = packet.getUint8(i + 8) * 16 + ((packet.getUint8(Math.floor(i / 2) + 15) >> 4 * (1 - i % 2)) & 15);
  }
}
