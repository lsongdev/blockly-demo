import { registry, ToolboxCategory } from 'blockly/core';
import {
  faCalculator, faCodeBranch, faCube, faEquals, faFont, faGrip, faListUl, faRotateRight,
} from '@fortawesome/free-solid-svg-icons';

class IconCategory extends ToolboxCategory {
  createIconDom_() {
    const icon = super.createIconDom_();
    const [width, height, , , pathData] = this.toolboxItemDef_.icon.icon;
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    const path = document.createElementNS(namespace, 'path');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-hidden', 'true');
    path.setAttribute('d', pathData);
    svg.append(path);
    icon.append(svg);
    icon.style.color = this.colour_;
    return icon;
  }
}

registry.register(registry.Type.TOOLBOX_ITEM, 'iconCategory', IconCategory);

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

export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    category('显示', '#745ba5', faGrip, ['display_image', 'display_clear']),
    category('逻辑', '%{BKY_LOGIC_HUE}', faCodeBranch, [
      'controls_if', 'logic_compare', 'logic_operation', 'logic_negate',
      'logic_boolean', 'logic_null', 'logic_ternary',
    ]),
    category('循环', '%{BKY_LOOPS_HUE}', faRotateRight, [
      { type: 'controls_repeat_ext', inputs: { TIMES: numberInput(10) } },
      'controls_whileUntil',
      { type: 'controls_for', inputs: { FROM: numberInput(1), TO: numberInput(10), BY: numberInput(1) } },
      'controls_forEach', 'controls_flow_statements',
    ]),
    category('数学', '%{BKY_MATH_HUE}', faCalculator, [
      'math_number',
      { type: 'math_arithmetic', inputs: { A: numberInput(1), B: numberInput(1) } },
      'math_single', 'math_round', 'math_modulo', 'math_random_int',
    ]),
    category('文本', '%{BKY_TEXTS_HUE}', faFont, [
      'text', 'text_join', 'text_length', 'text_isEmpty', 'text_changeCase',
    ]),
    category('列表', '%{BKY_LISTS_HUE}', faListUl, [
      'lists_create_with', 'lists_length', 'lists_isEmpty',
    ]),
    { kind: 'iconCategory', name: '变量', icon: faEquals, colour: '%{BKY_VARIABLES_HUE}', custom: 'VARIABLE' },
    { kind: 'iconCategory', name: '函数', icon: faCube, colour: '%{BKY_PROCEDURES_HUE}', custom: 'PROCEDURE' },
  ],
};
