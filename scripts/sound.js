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
  @param {number} frequencyHertz
  @param {number} durationMilliSeconds
  @returns {Promise<void>}
  */
  async playNote(frequencyHertz, durationMilliSeconds) {
    const payload = new Uint8Array(6);

    const frequency = this.robot.getBytes(frequencyHertz, 4, false);
    const duration = this.robot.getBytes(durationMilliSeconds, 2, false);
    payload.set(frequency.concat(duration));

    await this.robot.sendPacket(this.device, 0, true, payload);
  }

  /**
  @returns {Promise<void>}
  */
  async stopSound() {
    await this.robot.sendPacket(this.device, 1);
  }

  /**
  @param {string} phrase
  @returns {Promise<void>}
  */
  async sayPhrase(phrase) {
    const encoder = new TextEncoder();
    const payload = encoder.encode(phrase).subarray(0, 16);
    await this.robot.sendPacket(this.device, 4, true, payload);
  }

  /**
  @param {number} startFrequencyMilliHertz
  @param {number} endFrequencyMilliHertz
  @param {number} durationMilliSeconds
  @param {number} attackMilliSeconds
  @param {number} releaseMilliSeconds
  @param {number} volume
  @param {"disabled" | "volume" | "pulse width" | "frequency"} modulationType
  @param {number} modulationRateHertz
  @param {boolean} appendSweep
  @returns {Promise<void>}
  */
  async playSweep(
    startFrequencyMilliHertz,
    endFrequencyMilliHertz,
    durationMilliSeconds,
    attackMilliSeconds,
    releaseMilliSeconds,
    volume,
    modulationType,
    modulationRateHertz,
    appendSweep
  ) {
    const payload = new Uint8Array(16);
    const startFrequency = this.robot.getBytes(startFrequencyMilliHertz, 4, false);
    const endFrequency = this.robot.getBytes(endFrequencyMilliHertz, 4, false);
    const duration = this.robot.getBytes(durationMilliSeconds, 2, false);
    const attack = this.robot.getBytes(attackMilliSeconds, 1, false);
    const release = this.robot.getBytes(releaseMilliSeconds, 1, false);
    const volumeBytes = this.robot.getBytes(volume, 1, false);

    let modulation;
    switch (modulationType) {
      case "disabled": modulation = 0; break;
      case "volume": modulation = 1; break;
      case "pulse width": modulation = 2; break;
      case "frequency": modulation = 3; break;
    }

    const modulationRate = this.robot.getBytes(modulationRateHertz, 1, false);
    const append = appendSweep ? 1 : 0;

    const bytes = startFrequency.concat(
      endFrequency,
      duration,
      attack,
      release,
      volumeBytes,
      [modulation],
      modulationRate,
      [append]
    );

    payload.set(bytes);

    await this.robot.sendPacket(this.device, 5, true, payload);
  }
}
