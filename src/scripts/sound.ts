import { Robot } from './robot.js';

export default class Sound {
  robot: Robot;
  device = 5;

  constructor(robot: Robot) {
    this.robot = robot;
  }

  async playNote(frequencyHertz: number, durationMilliSeconds: number): Promise<void> {
    const payload = new Uint8Array(6);

    const frequency = this.robot.getBytes(frequencyHertz, 4, false);
    const duration = this.robot.getBytes(durationMilliSeconds, 2, false);
    payload.set(frequency.concat(duration));

    await this.robot.sendPacket(this.device, 0, true, payload);
  }

  async stopSound(): Promise<void> {
    await this.robot.sendPacket(this.device, 1);
  }

  async sayPhrase(phrase: string): Promise<void> {
    const encoder = new TextEncoder();
    const payload = encoder.encode(phrase).subarray(0, 16);
    await this.robot.sendPacket(this.device, 4, true, payload);
  }

  async playSweep(
    startFrequencyMilliHertz: number,
    endFrequencyMilliHertz: number,
    durationMilliSeconds: number,
    attackMilliSeconds: number,
    releaseMilliSeconds: number,
    volume: number,
    modulationType: "disabled" | "volume" | "pulse width" | "frequency",
    modulationRateHertz: number,
    appendSweep: boolean
  ): Promise<void> {
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
