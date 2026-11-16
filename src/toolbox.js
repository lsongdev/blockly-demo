function category(name, colour, blocks) {
  return {
    kind: 'category',
    name,
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
    category('显示', '#745ba5', ['display_image', 'display_clear']),
    category('逻辑', '%{BKY_LOGIC_HUE}', [
      'controls_if', 'logic_compare', 'logic_operation', 'logic_negate',
      'logic_boolean', 'logic_null', 'logic_ternary',
    ]),
    category('循环', '%{BKY_LOOPS_HUE}', [
      { type: 'controls_repeat_ext', inputs: { TIMES: numberInput(10) } },
      'controls_whileUntil',
      { type: 'controls_for', inputs: { FROM: numberInput(1), TO: numberInput(10), BY: numberInput(1) } },
      'controls_forEach', 'controls_flow_statements',
    ]),
    category('数学', '%{BKY_MATH_HUE}', [
      'math_number',
      { type: 'math_arithmetic', inputs: { A: numberInput(1), B: numberInput(1) } },
      'math_single', 'math_round', 'math_modulo', 'math_random_int',
    ]),
    category('文本', '%{BKY_TEXTS_HUE}', [
      'text', 'text_join', 'text_length', 'text_isEmpty', 'text_changeCase',
    ]),
    category('列表', '%{BKY_LISTS_HUE}', [
      'lists_create_with', 'lists_length', 'lists_isEmpty',
    ]),
    { kind: 'category', name: '变量', colour: '%{BKY_VARIABLES_HUE}', custom: 'VARIABLE' },
    { kind: 'category', name: '函数', colour: '%{BKY_PROCEDURES_HUE}', custom: 'PROCEDURE' },
  ],
};
