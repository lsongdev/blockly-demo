import { CollapsibleToolboxCategory, registry, Toolbox, ToolboxCategory } from 'blockly/core';
import {
  faCode, faCalculator, faCodeBranch, faCube, faEquals, faFont, faListUl, faMicrochip, faRotateRight, faDisplay, faWifi, faPlug, faHandPointer, faClock, faFolderOpen, faBook, faWaveSquare, faLightbulb, faVolumeHigh, faRightLeft,
} from '@fortawesome/free-solid-svg-icons';
import { t } from './i18n.js';

function addIcon(icon, definition, colour) {
  const [width, height, , , pathData] = definition.icon;
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  const path = document.createElementNS(namespace, 'path');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('aria-hidden', 'true');
  path.setAttribute('d', pathData);
  svg.append(path);
  icon.append(svg);
  icon.style.color = colour;
  return icon;
}

class IconCategory extends ToolboxCategory {
  createIconDom_() {
    return addIcon(super.createIconDom_(), this.toolboxItemDef_.icon, this.colour_);
  }
}

class IconCategoryGroup extends CollapsibleToolboxCategory {
  createIconDom_() {
    const icon = super.createIconDom_();
    icon.style.removeProperty('display');
    return addIcon(icon, this.toolboxItemDef_.icon, this.colour_);
  }
}

export class EditorToolbox extends Toolbox {
  onTreeBlur(nextTree) {
    const selected = this.getSelectedItem()?.getId();
    // The HTML controls and native file picker take focus outside Blockly.
    if (selected === 'files' || selected === 'libraries') return;
    super.onTreeBlur(nextTree);
  }
}

registry.register(registry.Type.TOOLBOX_ITEM, 'iconCategory', IconCategory);
registry.register(registry.Type.TOOLBOX_ITEM, 'iconCategoryGroup', IconCategoryGroup);

function category(name, colour, icon, blocks) {
  return {
    kind: 'iconCategory',
    name,
    icon,
    colour,
    contents: blocks.map((block) =>
      typeof block === 'string' ? { kind: 'block', type: block } : { kind: 'block', ...block },
    ),
  };
}

function numberInput(value) {
  return { shadow: { type: 'math_number', fields: { NUM: value } } };
}

function textInput(value) {
  return { shadow: { type: 'text', fields: { TEXT: value } } };
}

export function createToolbox() {
  return {
    kind: 'categoryToolbox',
    contents: [
      category(t('logic'), '%{BKY_LOGIC_HUE}', faCodeBranch, [
        'controls_if', 'logic_compare', 'logic_operation', 'logic_negate',
        'logic_boolean', 'logic_null', 'logic_ternary',
      ]),
      category(t('loops'), '%{BKY_LOOPS_HUE}', faRotateRight, [
        { type: 'controls_repeat_ext', inputs: { TIMES: numberInput(10) } },
        'controls_whileUntil',
        { type: 'controls_for', inputs: { FROM: numberInput(1), TO: numberInput(10), BY: numberInput(1) } },
        'controls_forEach', 'controls_flow_statements',
      ]),
      category(t('math'), '%{BKY_MATH_HUE}', faCalculator, [
        'math_number',
        { type: 'math_arithmetic', inputs: { A: numberInput(1), B: numberInput(1) } },
        'math_single', 'math_round', 'math_modulo', 'math_random_int',
      ]),
      category(t('text'), '%{BKY_TEXTS_HUE}', faFont, [
        'text', 'text_join', 'text_length', 'text_isEmpty', 'text_changeCase',
        { type: 'text_print', inputs: { TEXT: textInput('Hello') } },
      ]),
      category(t('lists'), '%{BKY_LISTS_HUE}', faListUl, [
        'lists_create_with', 'lists_length', 'lists_isEmpty',
      ]),
      { kind: 'iconCategory', name: t('variables'), icon: faEquals, colour: '%{BKY_VARIABLES_HUE}', custom: 'VARIABLE' },
      { kind: 'iconCategory', name: t('functions'), icon: faCube, colour: '%{BKY_PROCEDURES_HUE}', custom: 'PROCEDURE' },
      category(t('modules'), '#3575a6', faCode, [
        'python_import', 'python_from_import', 'python_name', 'python_member',
        'python_call', 'python_call_statement', 'python_argument', 'python_keyword_argument',
      ]),
      category(t('timing'), '#94722a', faClock, [
        { type: 'timing_wait_ms', inputs: { MS: numberInput(100) } },
        'timing_ticks_ms',
        {
          type: 'timing_elapsed_ms',
          inputs: { START: numberInput(0), END: { shadow: { type: 'timing_ticks_ms' } } },
        },
      ]),
      category(t('gpio'), '#29806c', faPlug, [
        { type: 'gpio_read_digital', inputs: { PIN: numberInput(0) } },
        { type: 'gpio_write_digital', inputs: { PIN: numberInput(0) } },
        { type: 'gpio_read_adc', inputs: { PIN: numberInput(0) } },
        { type: 'gpio_on_edge', inputs: { PIN: numberInput(0) } },
      ]),
      category('PWM', '#29806c', faWaveSquare, [
        { type: 'pwm_create', inputs: { PIN: numberInput(0), FREQ: numberInput(440), DUTY: numberInput(0) } },
        { type: 'pwm_frequency', inputs: { FREQ: numberInput(440) } },
        { type: 'pwm_duty', inputs: { DUTY: numberInput(32768) } },
        'pwm_stop',
      ]),
      category(t('neopixelCategory'), '#864ba0', faLightbulb, [
        { type: 'neopixel_create', inputs: { PIN: numberInput(0), COUNT: numberInput(1) } },
        { type: 'neopixel_set', inputs: { INDEX: numberInput(0), RED: numberInput(32), GREEN: numberInput(0), BLUE: numberInput(0) } },
        { type: 'neopixel_fill', inputs: { RED: numberInput(0), GREEN: numberInput(0), BLUE: numberInput(0) } },
        'neopixel_write',
      ]),
      category('I2C', '#298477', faCodeBranch, [
        { type: 'i2c_create', inputs: { ID: numberInput(0), SCL: numberInput(22), SDA: numberInput(23), FREQ: numberInput(100000) } },
        'i2c_scan',
        { type: 'i2c_read', inputs: { ADDRESS: numberInput(60), COUNT: numberInput(1) } },
        { type: 'i2c_write', inputs: { ADDRESS: numberInput(60) } },
        { type: 'i2c_read_register', inputs: { ADDRESS: numberInput(60), REGISTER: numberInput(0), COUNT: numberInput(1) } },
        { type: 'i2c_write_register', inputs: { ADDRESS: numberInput(60), REGISTER: numberInput(0) } },
      ]),
      category('UART', '#3575a6', faRightLeft, [
        { type: 'uart_create', inputs: {
          ID: numberInput(1), TX: numberInput(25), RX: numberInput(26), BAUD: numberInput(9600), TIMEOUT: numberInput(100),
        } },
        'uart_any',
        { type: 'uart_read', inputs: { COUNT: numberInput(1) } },
        'uart_read_line',
        { type: 'uart_write', inputs: { DATA: textInput('Hello') } },
        'uart_close',
      ]),
      category(t('wifiCategory'), '#357d82', faWifi, [
        {
          type: 'matrixbit_wifi_connect',
          inputs: { SSID: textInput('SSID'), PASSWORD: textInput('') },
        },
        'matrixbit_wifi_connected', 'matrixbit_wifi_ipv4', 'matrixbit_wifi_disconnect',
      ]),
      {
        kind: 'iconCategory',
        toolboxitemid: 'files',
        name: t('files'),
        icon: faFolderOpen,
        colour: '#65528e',
        contents: [],
      },
      {
        kind: 'iconCategory',
        toolboxitemid: 'libraries',
        name: t('libraries'),
        icon: faBook,
        colour: '#65528e',
        contents: [],
      },
      {
        kind: 'iconCategoryGroup',
        icon: faMicrochip,
        name: 'Micro:bit',
        colour: '#b05039',
        contents: [
          category(t('display'), '#b05039', faDisplay, [
            {
              type: 'microbit_set_pixel',
              inputs: { X: numberInput(0), Y: numberInput(0), BRIGHTNESS: numberInput(9) },
            },
            { type: 'microbit_get_pixel', inputs: { X: numberInput(0), Y: numberInput(0) } },
            'microbit_clear_display',
          ]),
          category(t('pins'), '#b05039', faPlug, [
            'microbit_read_digital', 'microbit_write_digital', 'microbit_read_analog',
          ]),
          category(t('buttons'), '#b05039', faHandPointer, [
            'microbit_on_button_pressed', 'microbit_button_is_pressed', 'microbit_button_was_pressed', 'microbit_button_press_count',
          ]),
        ],
      },
      {
        kind: 'iconCategoryGroup',
        icon: faMicrochip,
        name: 'Matrix:bit',
        colour: '#745ba5',
        contents: [
          category(t('display'), '#745ba5', faDisplay, [
            {
              type: 'matrixbit_oled_text',
              inputs: { TEXT: textInput('Hello'), X: numberInput(0), Y: numberInput(0) },
            },
            { type: 'matrixbit_oled_pixel', inputs: { X: numberInput(0), Y: numberInput(0) } },
            'matrixbit_oled_clear', 'matrixbit_oled_flush',
          ]),
          category('RGB', '#864ba0', faLightbulb, [
            { type: 'matrixbit_rgb_set', inputs: { RED: numberInput(32), GREEN: numberInput(0), BLUE: numberInput(0) } },
          ]),
          category(t('buzzer'), '#745ba5', faVolumeHigh, [
            { type: 'matrixbit_buzzer_tone', inputs: { FREQ: numberInput(440), DURATION: numberInput(200) } },
          ]),
          category(t('buttons'), '#745ba5', faHandPointer, ['matrixbit_on_button_pressed', 'matrixbit_button_is_pressed']),
        ],
      },
    ],
  };
}
