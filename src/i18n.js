import { setLocale } from 'blockly/core';
import * as English from 'blockly/msg/en';
import * as SimplifiedChinese from 'blockly/msg/zh-hans';

const languages = {
  en: { index: 0, blockly: English },
  'zh-CN': { index: 1, blockly: SimplifiedChinese },
};
const storageKey = 'blockly-demo.language';

const messages = {
  title: ["MicroPython Blocks", "MicroPython 积木编程"],
  blockHeading: ["Block", "程序积木"],
  codeHeading: ["Code", "代码"],
  flashButton: ["flash", "刷写"],
  downloadButton: ["download", "下载"],
  flashHint: ["Write to the board and run", "写入板卡并运行"],
  downloadHint: ["Save main.py", "保存 main.py"],
  useGeneratedCode: ["Use generated code", "使用积木代码"],
  logic: ["Logic", "逻辑"],
  loops: ["Loops", "循环"],
  math: ["Math", "数学"],
  text: ["Text", "文本"],
  lists: ["Lists", "列表"],
  variables: ["Variables", "变量"],
  functions: ["Functions", "函数"],
  selectPort: ["Select the serial port for your MicroPython board.", "请选择 MicroPython 板卡的串口。"],
  writingCode: ["Writing main.py…", "正在写入 main.py…"],
  flashComplete: ["main.py saved. The board restarted.", "main.py 已写入，板卡已重启。"],
  portCanceled: ["Port selection canceled.", "已取消选择串口。"],
  flashFailed: ["Flash failed: %1", "刷写失败：%1"],
  serialTimeout: ["Board response timed out or the serial port disconnected", "板卡响应超时或串口已断开"],
  unexpectedResponse: ["Unexpected response from MicroPython", "MicroPython 返回了意外响应"],
  invalidIdentifier: ["%1 must be a valid Python identifier: \"%2\".", "%1「%2」需要使用有效的 Python 标识符。"],
  requiredExpression: ["Connect an expression for %1.", "请为%1接入一个表达式。"],
  duplicateKeyword: ["Duplicate keyword argument \"%1\".", "命名参数「%1」重复。"],
  argumentOrder: ["Positional arguments must come before keyword arguments.", "位置参数需要放在命名参数前面。"],
  moduleName: ["Module name", "模块名"],
  aliasName: ["Alias", "别名"],
  callable: ["the callable", "调用目标"],
  keywordName: ["Keyword name", "参数名"],
  keywordValue: ["the keyword argument", "命名参数"],
  positionValue: ["the positional argument", "位置参数"],
  importedName: ["Imported name", "导入成员名"],
  pythonNameLabel: ["Name", "名称"],
  objectValue: ["the object", "成员所属对象"],
  memberName: ["Member name", "成员名"],
  importModule: ["import %1 as %2", "导入模块 %1 别名 %2"],
  importMember: ["from %1 import %2 as %3", "从 %1 导入 %2 别名 %3"],
  optionalAlias: ["The alias is optional.", "别名可以留空。"],
  pythonName: ["name %1", "名称 %1"],
  nameHint: ["Reference an imported name or a built-in function. Use a Variables block to reference a Blockly variable.", "引用导入的名称或内置函数。使用变量积木引用 Blockly 变量。"],
  pythonMember: ["%1 . %2", "%1 的成员 %2"],
  callResult: ["call %1 and return result", "调用 %1 并取返回值"],
  callStatement: ["call %1", "调用 %1"],
  arguments: ["arguments %1", "参数 %1"],
  positionalArgument: ["positional argument %1", "位置参数 %1"],
  keywordArgument: ["keyword argument %1 = %2", "命名参数 %1 = %2"],
  oledText: ["Draw text %1 at x %2 y %3", "在 x %2 y %3 绘制文字 %1"],
  oledTextHint: ["Draw with the built-in font. The top-left corner is (0, 0).", "使用内置字体绘制文字。左上角为 (0, 0)。"],
  oledPixel: ["Turn pixel %1 at x %2 y %3", "%1 像素 x %2 y %3"],
  pixelOn: ["on", "点亮"],
  pixelOff: ["off", "熄灭"],
  oledClear: ["Clear OLED", "OLED 清屏"],
  matrixSetPixel: ["Set LED at x %1 y %2 to brightness %3", "设置像素 x %1 y %2 的亮度为 %3"],
  matrixSetPixelHint: ["Coordinates are 0–4. Brightness is 0–9, where 0 turns the LED off.", "坐标为 0–4，亮度为 0–9。亮度为 0 时熄灭。"],
  matrixGetPixel: ["LED brightness at x %1 y %2", "像素 x %1 y %2 的亮度"],
  matrixGetPixelHint: ["Read the current LED brightness (0–9).", "读取像素当前的亮度（0–9）。"],
  matrixClear: ["Clear LED display", "点阵清屏"],
  wifiConnect: ["Connect to Wi-Fi %1 password %2", "连接 Wi-Fi %1 密码 %2"],
  wifiConnectHint: ["Starts connecting in the background. Leave the password empty for an open network.", "在后台开始连接。开放网络的密码留空。"],
  wifiConnected: ["Wi-Fi connected?", "Wi-Fi 已连接？"],
  wifiConnectedHint: ["True when connected to Wi-Fi with a valid IP address.", "已连接 Wi-Fi 并获得有效 IP 地址时返回真。"],
  wifiIpv4: ["Wi-Fi IPv4 address", "Wi-Fi IPv4 地址"],
  wifiIpv4Hint: ["An empty string until Wi-Fi is connected.", "Wi-Fi 未连接时返回空字符串。"],
  wifiDisconnect: ["Disconnect Wi-Fi", "断开 Wi-Fi"],
};

let current = 'en';

export function normalizeLanguage(language) {
  return Object.keys(languages).find(key => key.toLowerCase() === String(language).toLowerCase());
}

export function getSavedLanguage() {
  try {
    return normalizeLanguage(localStorage.getItem(storageKey)) ?? 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguage(language) {
  try {
    localStorage.setItem(storageKey, language);
  } catch {
    // Language switching also works when browser storage is unavailable.
  }
}

export function applyLanguage(language) {
  current = language;
  const customBlocks = Object.fromEntries(
    Object.keys(messages).map(key => [`APP_${key.toUpperCase()}`, t(key)]),
  );
  setLocale({ ...languages[language].blockly, ...customBlocks });
}

export function t(key, ...values) {
  const message = messages[key][languages[current].index];
  if (!values.length) return message;
  return message.replace(/%(\d+)/g, (token, index) => values[index - 1] ?? token);
}

export function blockMessage(key) {
  return `%{BKY_APP_${key.toUpperCase()}}`;
}
