import { common } from 'blockly/core';
import { Order, pythonGenerator } from 'blockly/python';
import { blockMessage } from './i18n.js';

const colour = 20;
const statement = { previousStatement: null, nextStatement: null };
const value = name => ({ type: 'input_value', name, check: 'Number' });

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
]);

pythonGenerator.addReservedWords('_microbit_display');

function displayCall(generator, method, args = []) {
  generator.definitions_.import_microbit_display = 'from microbit import display as _microbit_display';
  return `_microbit_display.${method}(${args.join(', ')})`;
}

function integers(block, generator, inputs) {
  return inputs.map(name => `int(${generator.valueToCode(block, name, Order.NONE) || '0'})`);
}

Object.assign(pythonGenerator.forBlock, {
  microbit_set_pixel: (block, generator) => {
    const args = integers(block, generator, ['X', 'Y', 'BRIGHTNESS']);
    return `${displayCall(generator, 'set_pixel', args)}\n`;
  },
  microbit_get_pixel: (block, generator) => {
    const args = integers(block, generator, ['X', 'Y']);
    return [displayCall(generator, 'get_pixel', args), Order.FUNCTION_CALL];
  },
  microbit_clear_display: (_block, generator) => `${displayCall(generator, 'clear')}\n`,
});
