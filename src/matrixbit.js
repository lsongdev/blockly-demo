import { common } from 'blockly/core';
import { Order, pythonGenerator } from 'blockly/python';
import { blockMessage } from './i18n.js';

const oledSetup = `from machine import I2C as _matrixbit_i2c_type, Pin as _matrixbit_pin
import framebuf as _matrixbit_framebuf

_matrixbit_i2c = _matrixbit_i2c_type(0, scl=_matrixbit_pin(22), sda=_matrixbit_pin(23), freq=400000)
_matrixbit_pixels = bytearray(128 * 64 // 8)
_matrixbit_screen = _matrixbit_framebuf.FrameBuffer(
    _matrixbit_pixels, 128, 64, _matrixbit_framebuf.MONO_VLSB
)
_matrixbit_i2c.writeto(0x3c, bytes.fromhex(
    "00ae200040a1a83fc8d300da12d580d9f1db30817fa4a68d14af"
))

def _matrixbit_flush():
    _matrixbit_i2c.writeto(0x3c, b"\\x00\\x21\\x00\\x7f\\x22\\x00\\x07")
    _matrixbit_i2c.writevto(0x3c, (b"\\x40", _matrixbit_pixels))`;

const statement = { previousStatement: null, nextStatement: null, colour: 260 };
const value = name => ({ type: 'input_value', name });

common.defineBlocksWithJsonArray([
  {
    type: 'matrixbit_oled_text',
    message0: blockMessage('oledText'),
    args0: [value('TEXT'), value('X'), value('Y')],
    tooltip: blockMessage('oledTextHint'),
    inputsInline: true,
    ...statement,
  },
  {
    type: 'matrixbit_oled_pixel',
    message0: blockMessage('oledPixel'),
    args0: [
      { type: 'field_dropdown', name: 'STATE', options: [[blockMessage('pixelOn'), '1'], [blockMessage('pixelOff'), '0']] },
      value('X'), value('Y'),
    ],
    inputsInline: true,
    ...statement,
  },
  {
    type: 'matrixbit_oled_clear',
    message0: blockMessage('oledClear'),
    ...statement,
  },
]);

pythonGenerator.addReservedWords(
  '_matrixbit_i2c_type,_matrixbit_pin,_matrixbit_framebuf,_matrixbit_i2c,_matrixbit_pixels,' +
  '_matrixbit_screen,_matrixbit_flush',
);

function draw(generator, command) {
  generator.definitions_.matrixbit_oled = oledSetup;
  return `${command}\n_matrixbit_flush()\n`;
}

function coordinates(block, generator) {
  const x = generator.valueToCode(block, 'X', Order.NONE) || '0';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '0';
  return `int(${x}), int(${y})`;
}

Object.assign(pythonGenerator.forBlock, {
  matrixbit_oled_text: (block, generator) => {
    const text = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
    return draw(generator, `_matrixbit_screen.text(str(${text}), ${coordinates(block, generator)}, 1)`);
  },
  matrixbit_oled_pixel: (block, generator) => {
    const state = block.getFieldValue('STATE');
    return draw(generator, `_matrixbit_screen.pixel(${coordinates(block, generator)}, ${state})`);
  },
  matrixbit_oled_clear: (_block, generator) => draw(generator, '_matrixbit_screen.fill(0)'),
});
