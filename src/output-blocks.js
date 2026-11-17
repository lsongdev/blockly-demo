import { common } from 'blockly/core';
import { Order, pythonGenerator } from 'blockly/python';
import { blockMessage, t } from './i18n.js';
import { PythonBlockError } from './python-blocks.js';

const input = (name, check = 'Number') => ({ type: 'input_value', name, check });
const pin = input('PIN', ['Number', 'String']);
const pwm = input('PWM', 'PWM');
const pixels = input('PIXELS', 'NeoPixel');
const rgb = [input('RED'), input('GREEN'), input('BLUE')];
const statement = { previousStatement: null, nextStatement: null };

common.defineBlocksWithJsonArray([
  { type: 'pwm_create', message0: blockMessage('pwmCreate'), args0: [pin, input('FREQ'), input('DUTY')], output: 'PWM', colour: 155 },
  { type: 'pwm_frequency', message0: blockMessage('pwmFrequency'), args0: [pwm, input('FREQ')], ...statement, colour: 155 },
  { type: 'pwm_duty', message0: blockMessage('pwmDuty'), args0: [pwm, input('DUTY')], ...statement, colour: 155 },
  { type: 'pwm_stop', message0: blockMessage('pwmStop'), args0: [pwm], ...statement, colour: 155 },
  { type: 'neopixel_create', message0: blockMessage('neoCreate'), args0: [pin, input('COUNT')], output: 'NeoPixel', colour: 290 },
  { type: 'neopixel_set', message0: blockMessage('neoSet'), args0: [pixels, input('INDEX'), ...rgb], ...statement, colour: 290 },
  { type: 'neopixel_fill', message0: blockMessage('neoFill'), args0: [pixels, ...rgb], ...statement, colour: 290 },
  { type: 'neopixel_write', message0: blockMessage('neoWrite'), args0: [pixels], ...statement, colour: 290 },
]);

pythonGenerator.addReservedWords('_output_pin,_output_pwm,_output_neopixel');

const value = (block, generator, name, fallback = '0') =>
  generator.valueToCode(block, name, Order.NONE) || fallback;
function receiver(block, generator, name) {
  const code = generator.valueToCode(block, name, Order.MEMBER);
  if (!code) throw new PythonBlockError(t('requiredExpression', name === 'PWM' ? 'PWM' : 'NeoPixel'));
  return code;
}
const color = (block, generator) =>
  '(' + ['RED', 'GREEN', 'BLUE'].map(name => value(block, generator, name)).join(', ') + ')';

Object.assign(pythonGenerator.forBlock, {
  pwm_create(block, generator) {
    generator.definitions_.import_output_pin = 'from machine import Pin as _output_pin';
    generator.definitions_.import_output_pwm = 'from machine import PWM as _output_pwm';
    const gpio = value(block, generator, 'PIN');
    const freq = value(block, generator, 'FREQ', '440');
    const duty = value(block, generator, 'DUTY');
    return [`_output_pwm(_output_pin(${gpio}), freq=${freq}, duty_u16=${duty})`, Order.FUNCTION_CALL];
  },
  pwm_frequency(block, generator) {
    const channel = receiver(block, generator, 'PWM');
    return `${channel}.freq(${value(block, generator, 'FREQ', '440')})\n`;
  },
  pwm_duty(block, generator) {
    const channel = receiver(block, generator, 'PWM');
    return `${channel}.duty_u16(${value(block, generator, 'DUTY')})\n`;
  },
  pwm_stop(block, generator) {
    const channel = receiver(block, generator, 'PWM');
    return `${channel}.deinit()\n`;
  },
  neopixel_create(block, generator) {
    generator.definitions_.import_output_pin = 'from machine import Pin as _output_pin';
    generator.definitions_.import_output_neopixel = 'from neopixel import NeoPixel as _output_neopixel';
    const gpio = value(block, generator, 'PIN');
    const count = value(block, generator, 'COUNT', '1');
    return [`_output_neopixel(_output_pin(${gpio}), ${count})`, Order.FUNCTION_CALL];
  },
  neopixel_set(block, generator) {
    const strip = receiver(block, generator, 'PIXELS');
    return `${strip}[${value(block, generator, 'INDEX')}] = ${color(block, generator)}\n`;
  },
  neopixel_fill(block, generator) {
    const strip = receiver(block, generator, 'PIXELS');
    return `${strip}.fill(${color(block, generator)})\n`;
  },
  neopixel_write(block, generator) {
    const strip = receiver(block, generator, 'PIXELS');
    return `${strip}.write()\n`;
  },
});
