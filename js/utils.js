
/**
@param {number} value
@param {number} byteLength
@param {boolean} signed
@param {number} [maxValue]
@param {number} [minValue]
@returns {number[]}
*/
export function getBytes(value, byteLength, signed, maxValue, minValue) {
  const sign = signed ? 1 : 0;
  let maximum = 2 ** (byteLength * 8 - sign) - 1;
  let minimum = -sign * 2 ** (byteLength * 8 - sign);

  if (typeof maxValue === 'number' && maxValue < maximum) {
    maximum = maxValue;
  }

  if (typeof minValue === 'number' && minValue > minimum) {
    minimum = minValue;
  }

  if (minimum > maximum) {
    throw new Error("Minimum (" + minimum + ") is greater than maximum (" + maximum + ")");
  } else if (value > maximum) {
    throw new Error(value + " is greater than maximum permissable value: " + maximum);
  } else if (value < minimum) {
    throw new Error(value + " is less than minimum permissable value: " + minimum);
  }

  value = value < 0 ? value + 2 ** (byteLength * 8) : value;

  const bytes = [];
  for (let i = byteLength - 1; i >= 0; i--) {
    bytes.push(Math.floor(value / (256 ** i)) % 256);
  }
  return bytes;
}

/**
@param {DataView} packet
@returns {string}
*/
export function readTimestamp(packet) {
  const timestamp = packet.getUint32(3);
  const milliseconds = timestamp % 1000;
  const seconds = Math.floor((timestamp / 1000) % 60);
  const minutes = Math.floor((timestamp / 1000 / 60) % 60);
  const hours = Math.floor((timestamp / 1000 / 60 / 60));
  return "Time: " + [hours.toString(), minutes.toString().padStart(2, "0"), seconds.toString().padStart(2, "0")].join(":") + "." + milliseconds + " ";
}

// /**
// @param {Uint8Array} bytes
// @param {boolean} signed
// @returns {number}
// */
// export function getNumberFromBytes(bytes, signed) {
//   let number = 0;

//   for (let i = 0; i < bytes.length; i++) {
//     number += /**@type {number}*/(bytes.at(i)) * 256 ** (bytes.length - (i + 1));
//   }

//   if (signed) {
//     number = number > 2 ** (bytes.length * 8 - 1) ? number - 2 ** (bytes.length * 8) : number;
//   }
//   return number;
// }

// Copied calc_crc from:
// https://github.com/iRobotEducation/irobot-edu-python-sdk/blob/78dc01026532225efef2b9e14dbd1ce646697e8c/irobot_edu_sdk/packet.py
/**
@param {Uint8Array | DataView} packet
@returns {number}
*/
export function calculateCRC(packet) {
  let crc = 0;
  if (packet instanceof DataView) {
    for (let j = 0; j < packet.byteLength; j++) {
      const c = packet.getUint8(j);
      for (let i = 0; i < 8; i++) {
        let b = crc & 0x80;
        if (c & (0x80 >> i)) {
          b ^= 0x80;
        }
        crc <<= 1;
        if (b) {
          crc ^= 0x07;
        }
      }
      crc &= 0xFF;
    }
  } else if (packet instanceof Uint8Array) {
    for (const c of packet.values()) {
      for (let i = 0; i < 8; i++) {
        let b = crc & 0x80;
        if (c & (0x80 >> i)) {
          b ^= 0x80;
        }
        crc <<= 1;
        if (b) {
          crc ^= 0x07;
        }
      }
      crc &= 0xFF;
    }
  }
  return crc;
}
