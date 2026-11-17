import { common } from 'blockly/core';
import { Order, pythonGenerator } from 'blockly/python';
import { blockMessage } from './i18n.js';

const colour = 200;
const statement = { previousStatement: null, nextStatement: null };
const text = name => ({ type: 'input_value', name, check: 'String' });

common.defineBlocksWithJsonArray([
  {
    type: 'matrixbit_wifi_connect',
    message0: blockMessage('wifiConnect'),
    args0: [text('SSID'), text('PASSWORD')],
    tooltip: blockMessage('wifiConnectHint'),
    inputsInline: true,
    ...statement,
    colour,
  },
  {
    type: 'matrixbit_wifi_connected',
    message0: blockMessage('wifiConnected'),
    tooltip: blockMessage('wifiConnectedHint'),
    output: 'Boolean',
    colour,
  },
  {
    type: 'matrixbit_wifi_ipv4',
    message0: blockMessage('wifiIpv4'),
    tooltip: blockMessage('wifiIpv4Hint'),
    output: 'String',
    colour,
  },
  {
    type: 'matrixbit_wifi_disconnect',
    message0: blockMessage('wifiDisconnect'),
    ...statement,
    colour,
  },
]);

pythonGenerator.addReservedWords('_matrixbit_network,_matrixbit_wifi');

function wifi(generator) {
  generator.definitions_.import_matrixbit_network = 'import network as _matrixbit_network';
  generator.definitions_.matrixbit_wifi =
    '_matrixbit_wifi = _matrixbit_network.WLAN(_matrixbit_network.WLAN.IF_STA)';
  return '_matrixbit_wifi';
}

Object.assign(pythonGenerator.forBlock, {
  matrixbit_wifi_connect: (block, generator) => {
    const adapter = wifi(generator);
    const ssid = generator.valueToCode(block, 'SSID', Order.NONE) || "''";
    const password = generator.valueToCode(block, 'PASSWORD', Order.LOGICAL_OR) || "''";
    return `${adapter}.active(True)\n${adapter}.connect(${ssid}, ${password} or None)\n`;
  },
  matrixbit_wifi_connected: (_block, generator) => [
    `${wifi(generator)}.isconnected()`, Order.FUNCTION_CALL,
  ],
  matrixbit_wifi_ipv4: (_block, generator) => {
    const adapter = wifi(generator);
    return [`${adapter}.ifconfig()[0] if ${adapter}.isconnected() else ''`, Order.CONDITIONAL];
  },
  matrixbit_wifi_disconnect: (_block, generator) => {
    const adapter = wifi(generator);
    return `if ${adapter}.active():\n${generator.INDENT}${adapter}.disconnect()\n`;
  },
});
