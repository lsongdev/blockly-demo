import { common } from 'blockly/core';
import { Order, pythonGenerator } from 'blockly/python';
import { blockMessage } from './i18n.js';
import { buttonEventBlock, buttonEventCode } from './button-events.js';

const frameBufferSetup = `_matrixbit_pixels = bytearray(128 * 64 // 8)
_matrixbit_screen = _matrixbit_framebuf.FrameBuffer(
    _matrixbit_pixels, 128, 64, _matrixbit_framebuf.MONO_VLSB
)`;

const oledOutput = `_matrixbit_i2c = _matrixbit_i2c_type(0, scl=_matrixbit_pin(22), sda=_matrixbit_pin(23), freq=400000)
_matrixbit_i2c.writeto(0x3c, bytes.fromhex(
    "00ae200040a1a83fc8d300da12d580d9f1db30817fa4a68d14af"
))

def _matrixbit_flush():
    _matrixbit_i2c.writeto(0x3c, b"\\x00\\x21\\x00\\x7f\\x22\\x00\\x07")
    _matrixbit_i2c.writevto(0x3c, (b"\\x40", _matrixbit_pixels))`;

const statement = { previousStatement: null, nextStatement: null, colour: 260 };
const value = name => ({ type: 'input_value', name });

const white = [blockMessage('oledWhite'), '1'];
const black = [blockMessage('oledBlack'), '0'];
const colorField = (...options) => ({ type: 'field_dropdown', name: 'COLOR', options });

common.defineBlocksWithJsonArray([
  {
    type: 'matrixbit_oled_text',
    message0: blockMessage('oledText'),
    args0: [value('TEXT'), value('X'), value('Y')],
    message1: blockMessage('oledTextOptions'),
    args1: [colorField(white, black)],
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
    message0: blockMessage('oledFill'),
    args0: [colorField(black, white)],
    ...statement,
  },
  {
    type: 'matrixbit_oled_flush',
    message0: blockMessage('oledFlush'),
    tooltip: blockMessage('oledFlushHint'),
    ...statement,
  },
  {
    type: 'matrixbit_button_is_pressed',
    message0: blockMessage('buttonIsPressed'),
    args0: [{ type: 'field_dropdown', name: 'BUTTON', options: [['A', 'a'], ['B', 'b']] }],
    output: 'Boolean',
    colour: 260,
  },
  buttonEventBlock('matrixbit_on_button_pressed', 260),
]);

pythonGenerator.addReservedWords(
  '_matrixbit_i2c_type,_matrixbit_pin,_matrixbit_framebuf,_matrixbit_i2c,_matrixbit_pixels,' +
  '_matrixbit_screen,_matrixbit_flush,_matrixbit_button_a,_matrixbit_button_b',
);

const pinImport = 'from machine import Pin as _matrixbit_pin';

function prepareFrameBuffer(generator) {
  generator.definitions_.import_matrixbit_framebuf = 'import framebuf as _matrixbit_framebuf';
  generator.definitions_.matrixbit_framebuf = frameBufferSetup;
}

function draw(generator, command) {
  prepareFrameBuffer(generator);
  return command + '\n';
}

function coordinates(block, generator) {
  const x = generator.valueToCode(block, 'X', Order.NONE) || '0';
  const y = generator.valueToCode(block, 'Y', Order.NONE) || '0';
  return `int(${x}), int(${y})`;
}

function pressedExpression(block, generator) {
  const button = block.getFieldValue('BUTTON');
  const pin = button === 'a' ? 0 : 2;
  const name = `_matrixbit_button_${button}`;
  generator.definitions_.import_matrixbit_pin = pinImport;
  generator.definitions_[name] = `${name} = _matrixbit_pin(${pin}, _matrixbit_pin.IN, _matrixbit_pin.PULL_UP)`;
  return `${name}.value() == 0`;
}

Object.assign(pythonGenerator.forBlock, {
  matrixbit_button_is_pressed: (block, generator) => [pressedExpression(block, generator), Order.RELATIONAL],
  matrixbit_on_button_pressed: (block, generator) =>
    buttonEventCode(block, generator, `matrixbit_${block.getFieldValue('BUTTON')}`, pressedExpression(block, generator), 25),
  matrixbit_oled_text: (block, generator) => {
    const text = generator.valueToCode(block, 'TEXT', Order.NONE) || "''";
    const color = block.getFieldValue('COLOR');
    return draw(generator, `_matrixbit_screen.text(str(${text}), ${coordinates(block, generator)}, ${color})`);
  },
  matrixbit_oled_pixel: (block, generator) => {
    const state = block.getFieldValue('STATE');
    return draw(generator, `_matrixbit_screen.pixel(${coordinates(block, generator)}, ${state})`);
  },
  matrixbit_oled_clear: (block, generator) =>
    draw(generator, `_matrixbit_screen.fill(${block.getFieldValue('COLOR')})`),
  matrixbit_oled_flush: (_block, generator) => {
    prepareFrameBuffer(generator);
    generator.definitions_.import_matrixbit_pin = pinImport;
    generator.definitions_.import_matrixbit_i2c = 'from machine import I2C as _matrixbit_i2c_type';
    generator.definitions_.matrixbit_oled_output = oledOutput;
    return '_matrixbit_flush()\n';
  },
});
