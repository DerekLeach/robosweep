import { Robot } from '../js/robot.js';

export class Tests {
  runTests() {
    this.#testBytes();
  }

  #testBytes() {
    console.assert(Robot.prototype.getBytes(23, 1, false)[0] === 23);
  }
}

const tests = new Tests();
if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', tests.runTests);
} else {
  tests.runTests()
}
