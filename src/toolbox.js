import { CollapsibleToolboxCategory, registry, ToolboxCategory } from 'blockly/core';
import {
  faCode, faCalculator, faCodeBranch, faCube, faEquals, faFont, faListUl, faMicrochip, faRotateRight, faDisplay, faWifi,
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
      ]),
      category(t('lists'), '%{BKY_LISTS_HUE}', faListUl, [
        'lists_create_with', 'lists_length', 'lists_isEmpty',
      ]),
      { kind: 'iconCategory', name: t('variables'), icon: faEquals, colour: '%{BKY_VARIABLES_HUE}', custom: 'VARIABLE' },
      { kind: 'iconCategory', name: t('functions'), icon: faCube, colour: '%{BKY_PROCEDURES_HUE}', custom: 'PROCEDURE' },
      category('Python', '#3575a6', faCode, [
        'python_import', 'python_from_import', 'python_name', 'python_member',
        'python_call', 'python_call_statement', 'python_argument', 'python_keyword_argument',
      ]),
      category('Micro:bit', '#b05039', faMicrochip, [
        {
          type: 'microbit_set_pixel',
          inputs: { X: numberInput(0), Y: numberInput(0), BRIGHTNESS: numberInput(9) },
        },
        { type: 'microbit_get_pixel', inputs: { X: numberInput(0), Y: numberInput(0) } },
        'microbit_clear_display',
      ]),
      {
        kind: 'iconCategoryGroup',
        icon: faMicrochip,
        name: 'Matrix:bit',
        colour: '#745ba5',
        contents: [
          category('OLED', '#745ba5', faDisplay, [
            {
              type: 'matrixbit_oled_text',
              inputs: { TEXT: textInput('Hello'), X: numberInput(0), Y: numberInput(0) },
            },
            { type: 'matrixbit_oled_pixel', inputs: { X: numberInput(0), Y: numberInput(0) } },
            'matrixbit_oled_clear',
          ]),
          category('Wi-Fi', '#357d82', faWifi, [
            {
              type: 'matrixbit_wifi_connect',
              inputs: { SSID: textInput('SSID'), PASSWORD: textInput('') },
            },
            'matrixbit_wifi_connected', 'matrixbit_wifi_ipv4', 'matrixbit_wifi_disconnect',
          ]),
        ],
      },
    ],
  };
}
