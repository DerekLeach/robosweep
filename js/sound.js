import { Robot } from './robot.js';

export default class Sound {
  robot;
  device = 5;

  /**
  @param {Robot} robot
  */
  constructor(robot) {
    this.robot = robot;
  }

  /**
  @param {number} frequency in Hertz (Uint32)
  @param {number} duration in milliseconds (Uint16)
                           0 cancels any currently playing note.
  @returns {Promise<void>}
  */
  async playNote(frequency, duration) {
    const payload = new Uint8Array(6);

    const frequencyBytes = this.robot.getBytes(frequency, 4, false);
    const durationBytes = this.robot.getBytes(duration, 2, false);
    payload.set(frequencyBytes.concat(durationBytes));

    await this.robot.sendPacket(this.device, 0, true, payload);
  }

  /**
  @returns {Promise<void>}
  */
  async stopSound() {
    await this.robot.sendPacket(this.device, 1);
  }

  /**
  @param {string} phrase no more than 16 bytes
  @returns {Promise<void>}
  */
  async sayPhrase(phrase) {
    const encoder = new TextEncoder();
    const payload = encoder.encode(phrase).subarray(0, 16);
    await this.robot.sendPacket(this.device, 4, true, payload);
  }

  /**
  @param {number} startFrequency in milli-Hertz (Uint32)
  @param {number} endFrequency in milli-Hertz (Uint32)
  @param {number} duration in milliseconds (Uint16)
  @param {number} attack in milliseconds (Uint8)
  @param {number} release in milliseconds (Uint8)
  @param {number} volume 0 is silent, max 255
  @param {"disabled" | "volume" | "pulse width" | "frequency"} modulationType
  @param {number} modulationRate in Hertz (Uint8)
  @param {boolean} appendSweep true to append, false to interrupt
                               Only one sweep packet can be pending,
                               New packets will replace any already pending packet
  @returns {Promise<void>}
  */
  async playSweep(
    startFrequency,
    endFrequency,
    duration,
    attack,
    release,
    volume,
    modulationType,
    modulationRate,
    appendSweep
  ) {
    const payload = new Uint8Array(16);
    const startFrequencyBytes = this.robot.getBytes(startFrequency, 4, false);
    const endFrequencyBytes = this.robot.getBytes(endFrequency, 4, false);
    const durationBytes = this.robot.getBytes(duration, 2, false);
    const attackBytes = this.robot.getBytes(attack, 1, false);
    const releaseBytes = this.robot.getBytes(release, 1, false);
    const volumeBytes = this.robot.getBytes(volume, 1, false);

    let modulation;
    switch (modulationType) {
      case "disabled": modulation = 0; break;
      case "volume": modulation = 1; break;
      case "pulse width": modulation = 2; break;
      case "frequency": modulation = 3; break;
    }

    const modulationRateBytes = this.robot.getBytes(modulationRate, 1, false);
    const append = appendSweep ? 1 : 0;

    const bytes = startFrequencyBytes.concat(
      endFrequencyBytes,
      durationBytes,
      attackBytes,
      releaseBytes,
      volumeBytes,
      [modulation],
      modulationRateBytes,
      [append]
    );

    payload.set(bytes);

    await this.robot.sendPacket(this.device, 5, true, payload);
  }
}
