// @ts-check
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**@typedef {import('../js/ir-proximity.js').IRSensors} IRSensors*/
/**@typedef {import('../js/motors.js').PositionStatus} PositionStatus*/

// self.addEventListener('message', draw);
class Draw {
  /**@type {OffscreenCanvas}*/
  canvas;

  /**@type {OffscreenCanvasRenderingContext2D}*/
  context;

  /** @type {PositionStatus} */
  startingPosition;

  /** @type {PositionStatus} */
  currentPosition;

  /** @type {PositionStatus} */
  chargingStation;

  /**@type {boolean}*/
  docked = false;

  /**@type {IRSensors}*/
  sensors = { triggered: [false, false, false, false, false, false, false], value: [0, 0, 0, 0, 0, 0, 0] };

  frontRadius = 341.9 / 2;

  /**
  @param {WorkerGlobalScope & typeof globalThis} worker
  */
  constructor(worker) {
    worker.addEventListener('message', this);
  }

  /**
  @param {MessageEvent} event
  */
  handleEvent(event) {
    if (event.data.canvas instanceof OffscreenCanvas) {
      this.canvas = /**@type {OffscreenCanvas}*/(event.data.canvas);
      const context = this.canvas.getContext("2d");
      if (context instanceof OffscreenCanvasRenderingContext2D) {
        this.context = context;
      }
      // this.context.save();
    }

    if ("dockingStatus" in event.data) {
      this.docked = event.data.dockingStatus.contacts;
    }

    if ("position" in event.data) {
      this.currentPosition = /**@type {PositionStatus}*/(event.data.position);
      if (typeof this.startingPosition === "undefined") {
        this.startingPosition = this.currentPosition;
      }
      if (this.docked) this.chargingStation = this.currentPosition;
    }

    if ("sensors" in event.data) {
      this.sensors = event.data.sensors;
    }

    if (this.context instanceof OffscreenCanvasRenderingContext2D) {
      if (typeof this.currentPosition !== "undefined") {
        this.#scaleMap(this.context, this.startingPosition, this.currentPosition);
        if (typeof this.chargingStation !== "undefined") {
          this.#drawChargingStation(this.context, this.chargingStation);
        }
        this.#drawRobot(this.context, this.currentPosition, this.sensors);
      }
    }
  }

  /**
  @param {OffscreenCanvasRenderingContext2D} context
  @param {PositionStatus} startingPosition
  @param {PositionStatus} currentPosition
  @returns {void}
  */
  #scaleMap(context, startingPosition, currentPosition) {
    // context.restore();
    const margin = 400;
    let xMax, xMin, yMax, yMin;
    if (startingPosition.x > currentPosition.x) {
      xMax = startingPosition.x + margin;
      xMin = currentPosition.x - margin;
    } else {
      xMax = currentPosition.x + margin;
      xMin = startingPosition.x - margin;
    }

    if (startingPosition.y > currentPosition.y) {
      yMax = startingPosition.y + margin;
      yMin = currentPosition.y - margin;
    } else {
      yMax = currentPosition.y + margin;
      yMin = startingPosition.y - margin;
    }

    const zoomX = context.canvas.width / (xMax - xMin);
    const zoomY = context.canvas.height / (yMax - yMin);

    let zoom;
    let xMinClear, xMaxClear, yMinClear, yMaxClear;
    if (zoomX < zoomY) {
      zoom = zoomX;
      xMinClear = xMin;
      xMaxClear = xMax;
      yMinClear = yMin - 0.5 * (context.canvas.height / zoom - (yMax - yMin));
      yMaxClear = yMax - 0.5 * (context.canvas.height / zoom - (yMax - yMin));
    } else {
      zoom = zoomY;
      xMinClear = xMin - 0.5 * (context.canvas.width / zoom - (xMax - xMin));
      xMaxClear = xMax + 0.5 * (context.canvas.width / zoom - (xMax - xMin));
      yMinClear = yMin;
      yMaxClear = yMax;
    }
    const translateX = 0.5 * (context.canvas.width - zoom * (xMax + xMin));
    const translateY = 0.5 * (context.canvas.height + zoom * (yMax + yMin));

    context.setTransform(zoom, 0, 0, -zoom, translateX, translateY);
    context.clearRect(xMinClear, yMinClear, xMaxClear - xMinClear, yMaxClear - yMinClear);
  }

  /**
  @param {OffscreenCanvasRenderingContext2D} context
  @param {PositionStatus} position
  */
  #drawChargingStation(context, position) {
    const theta = position.heading * (Math.PI / 180);
    const chargingStation = new Path2D();
    context.fillStyle = "rgb(30, 30, 50)";
    context.shadowColor = "black";
    context.shadowBlur = 5;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.lineWidth = 0;
    context.save();
    context.translate(position.x, position.y);
    context.rotate(theta);
    chargingStation.moveTo(this.frontRadius - 60, -66);
    chargingStation.arc(this.frontRadius - 20, 0, 77, -0.5 - Math.PI / 2, Math.PI / 2 + 0.5, true)
    chargingStation.lineTo(this.frontRadius + 24, 66);
    chargingStation.arcTo(this.frontRadius + 48, 66, this.frontRadius + 48, 42, 24);
    chargingStation.lineTo(this.frontRadius + 48, -42);
    chargingStation.arcTo(this.frontRadius + 48, -66, this.frontRadius + 24, -66, 24);
    chargingStation.lineTo(this.frontRadius - 60, -66);
    chargingStation.closePath();
    context.fill(chargingStation);
    context.stroke(chargingStation)

    const pillar = new Path2D();
    context.fillStyle = "rgb(40, 40, 60)";
    context.shadowColor = "black";
    context.shadowBlur = 15;
    context.shadowOffsetX = 15;
    context.shadowOffsetY = 10;
    pillar.moveTo(this.frontRadius, -40);
    pillar.arc(this.frontRadius + 22, -40, 22, -Math.PI, 0, false);
    pillar.lineTo(this.frontRadius + 44, 40);
    pillar.arc(this.frontRadius + 22, 40, 22, 0, Math.PI, false);
    pillar.closePath();
    context.fill(pillar);

    // Charging contacts
    context.fillStyle = "rgb(150, 150, 150)";
    context.fillRect(this.frontRadius - 53, 46, 13, -5);
    context.fillRect(this.frontRadius - 53, -41, 13, -5);

    context.restore();
  }

  /**
  @param {OffscreenCanvasRenderingContext2D} context
  @param {PositionStatus} position
  @param {IRSensors} sensors
  */
  #drawRobot(context, position, sensors) {
    // https://iroboteducation.github.io/create3_docs/hw/mechanical#ir-proximity-sensors
    // const sensorAngles = [-65.3, -34, -14.25, 3, 20, 38, 65.3];
    const sensorAngles = [65.3, 38, 20, 3, -14.25, -34, -65.3];
    const frontRadius = 341.9 / 2;
    const backRadius = 162;

    context.save();
    context.translate(position.x, position.y);

    context.rotate(position.heading * (Math.PI / 180));

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
}

new Draw(self);
