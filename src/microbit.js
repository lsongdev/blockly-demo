import { common } from 'blockly/core';
import { Order, pythonGenerator } from 'blockly/python';
import { blockMessage } from './i18n.js';
import { buttonEventBlock, buttonEventCode } from './button-events.js';

const colour = 20;
const statement = { previousStatement: null, nextStatement: null };
const value = name => ({ type: 'input_value', name, check: 'Number' });

const pin = {
  type: 'field_dropdown',
  name: 'PIN',
  options: Array.from({ length: 21 }, (_, index) => index)
    .filter(index => index !== 17 && index !== 18)
    .map(index => [`P${index}`, String(index)]),
};

const analogPin = {
  ...pin,
  options: [0, 1, 2, 3, 4, 10].map(index => [`P${index}`, String(index)]),
};

const button = { type: 'field_dropdown', name: 'BUTTON', options: [['A', 'a'], ['B', 'b']] };

common.defineBlocksWithJsonArray([
  {
    type: 'microbit_set_pixel',
    message0: blockMessage('matrixSetPixel'),
    args0: [value('X'), value('Y'), value('BRIGHTNESS')],
    tooltip: blockMessage('matrixSetPixelHint'),
    inputsInline: true,
    ...statement,
    colour,
  },
  {
    type: 'microbit_get_pixel',
    message0: blockMessage('matrixGetPixel'),
    args0: [value('X'), value('Y')],
    tooltip: blockMessage('matrixGetPixelHint'),
    inputsInline: true,
    output: 'Number',
    colour,
  },
  {
    type: 'microbit_clear_display',
    message0: blockMessage('matrixClear'),
    ...statement,
    colour,
  },
  {
    type: 'microbit_read_digital',
    message0: blockMessage('pinRead'),
    args0: [pin],
    tooltip: blockMessage('microbitPinReadHint'),
    output: 'Number',
    colour,
  },
  {
    type: 'microbit_read_analog',
    message0: blockMessage('microbitPinReadAnalog'),
    args0: [analogPin],
    tooltip: blockMessage('microbitPinReadAnalogHint'),
    output: 'Number',
    colour,
  },
  {
    type: 'microbit_write_digital',
    message0: blockMessage('pinWrite'),
    args0: [
      pin,
      {
        type: 'field_dropdown',
        name: 'LEVEL',
        options: [[blockMessage('pinLow'), '0'], [blockMessage('pinHigh'), '1']],
      },
    ],
    tooltip: blockMessage('microbitPinWriteHint'),
    ...statement,
    colour,
  },
  {
    type: 'microbit_button_is_pressed',
    message0: blockMessage('buttonIsPressed'),
    args0: [button],
    output: 'Boolean',
    colour,
  },
  {
    type: 'microbit_button_was_pressed',
    message0: blockMessage('buttonWasPressed'),
    args0: [button],
    tooltip: blockMessage('buttonWasPressedHint'),
    output: 'Boolean',
    colour,
  },
  {
    type: 'microbit_button_press_count',
    message0: blockMessage('buttonPressCount'),
    args0: [button],
    tooltip: blockMessage('buttonPressCountHint'),
    output: 'Number',
    colour,
  },
  buttonEventBlock('microbit_on_button_pressed', colour),
]);

pythonGenerator.addReservedWords('_microbit_display,_microbit');

function displayCall(generator, method, args = []) {
  generator.definitions_.import_microbit_display = 'from microbit import display as _microbit_display';
  return `_microbit_display.${method}(${args.join(', ')})`;
}

function microbitModule(generator) {
  generator.definitions_.import_microbit = 'import microbit as _microbit';
  return '_microbit';
}

function edgePin(block, generator) {
  return `${microbitModule(generator)}.pin${block.getFieldValue('PIN')}`;
}

function buttonCall(block, generator, method) {
  return [`${microbitModule(generator)}.button_${block.getFieldValue('BUTTON')}.${method}()`, Order.FUNCTION_CALL];
}

function integers(block, generator, inputs) {
  return inputs.map(name => `int(${generator.valueToCode(block, name, Order.NONE) || '0'})`);
}

Object.assign(pythonGenerator.forBlock, {
  microbit_on_button_pressed: (block, generator) => {
    const [pressed] = buttonCall(block, generator, 'is_pressed');
    return buttonEventCode(block, generator, `microbit_${block.getFieldValue('BUTTON')}`, pressed, 0);
  },
  microbit_button_is_pressed: (block, generator) => buttonCall(block, generator, 'is_pressed'),
  microbit_button_was_pressed: (block, generator) => buttonCall(block, generator, 'was_pressed'),
  microbit_button_press_count: (block, generator) => buttonCall(block, generator, 'get_presses'),
  microbit_set_pixel: (block, generator) => {
    const args = integers(block, generator, ['X', 'Y', 'BRIGHTNESS']);
    return `${displayCall(generator, 'set_pixel', args)}\n`;
  },
  microbit_get_pixel: (block, generator) => {
    const args = integers(block, generator, ['X', 'Y']);
    return [displayCall(generator, 'get_pixel', args), Order.FUNCTION_CALL];
  },
  microbit_read_digital: (block, generator) => [
    `${edgePin(block, generator)}.read_digital()`, Order.FUNCTION_CALL,
  ],
  microbit_read_analog: (block, generator) => [
    `${edgePin(block, generator)}.read_analog()`, Order.FUNCTION_CALL,
  ],
  microbit_write_digital: (block, generator) =>
    `${edgePin(block, generator)}.write_digital(${block.getFieldValue('LEVEL')})\n`,
  microbit_clear_display: (_block, generator) => `${displayCall(generator, 'clear')}\n`,
});
