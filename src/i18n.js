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
  modules: ["Modules", "模块"],
  functions: ["Functions", "函数"],
  projectOpen: ["Open Project", "打开项目"],
  projectSave: ["Save Project", "保存项目"],
  projectOpened: ["Project opened.", "项目已打开。"],
  projectInvalid: ["Could not open this Blockly project.", "无法打开此积木项目。"],
  projectUnsupported: ["This project uses an unsupported file version.", "此项目的文件版本不受支持。"],
  projectRestoreFailed: ["Could not restore the local project. Showing the example.", "无法恢复本地项目，已显示示例。"],
  projectAutosaveFailed: ["Automatic saving is unavailable. Use Save Project to keep a copy.", "无法自动保存。请使用「保存项目」保留副本。"],
  serialOutput: ["Serial output", "串口输出"],
  serialConnect: ["Connect", "连接"],
  serialDisconnect: ["Disconnect", "断开"],
  serialClear: ["Clear", "清空"],
  serialConnected: ["Connected · 115200 baud", "已连接 · 115200 波特"],
  serialConnecting: ["Opening serial port…", "正在打开串口…"],
  serialDisconnected: ["Disconnected", "未连接"],
  serialFailed: ["Serial connection ended: %1", "串口连接已结束：%1"],
  timing: ["Timing", "计时"],
  waitMs: ["Wait %1 ms", "等待 %1 毫秒"],
  ticksMs: ["Current tick (ms)", "当前计时值（毫秒）"],
  ticksMsHint: ["Reads the millisecond counter. Use elapsed time to compare two readings.", "读取毫秒计数器。比较两个计时值时使用经过时间积木。"],
  elapsedMs: ["Elapsed time from %1 to %2 (ms)", "从 %1 到 %2 经过的时间（毫秒）"],
  elapsedMsHint: ["Computes the difference between two ticks, accounting for counter wraparound.", "计算两个计时值的差，并处理计数器回绕。"],
  adcRead: ["Read ADC on pin %1", "读取引脚 %1 的 ADC 值"],
  adcReadHint: ["Read an analog-capable pin. Returns a scaled reading from 0 to 65535.", "读取支持模拟输入的引脚，返回 0 到 65535 的归一化读数。"],
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
  oledTextOptions: ["color %1", "颜色 %1"],
  oledWhite: ["white (1)", "白色（1）"],
  oledBlack: ["black (0)", "黑色（0）"],
  oledFlush: ["Apply display changes", "显示生效"],
  oledFlushHint: ["Send all buffered changes to the display.", "将缓冲区中的所有改动发送到屏幕。"],
  oledTextHint: ["Draw with the built-in font. The top-left corner is (0, 0).", "使用内置字体绘制文字。左上角为 (0, 0)。"],
  oledPixel: ["Turn pixel %1 at x %2 y %3", "%1 像素 x %2 y %3"],
  pixelOn: ["on", "点亮"],
  pixelOff: ["off", "熄灭"],
  oledFill: ["Fill display with %1", "用 %1 填充屏幕"],
  matrixSetPixel: ["Set LED at x %1 y %2 to brightness %3", "设置像素 x %1 y %2 的亮度为 %3"],
  matrixSetPixelHint: ["Coordinates are 0–4. Brightness is 0–9, where 0 turns the LED off.", "坐标为 0–4，亮度为 0–9。亮度为 0 时熄灭。"],
  matrixGetPixel: ["LED brightness at x %1 y %2", "像素 x %1 y %2 的亮度"],
  matrixGetPixelHint: ["Read the current LED brightness (0–9).", "读取像素当前的亮度（0–9）。"],
  matrixClear: ["Clear LED display", "点阵清屏"],
  buttons: ["Buttons", "按键"],
  whenButtonPressed: ["When button %1 is pressed", "当按键 %1 按下时"],
  buttonEventBody: ["do %1", "执行 %1"],
  buttonEventHint: ["Listens after top-level setup. Runs once per press. Keep handlers short.", "顶层代码执行完毕后开始监听。每次按下一次触发，处理代码应尽快返回。"],
  buttonIsPressed: ["Button %1 is pressed?", "按键 %1 当前按下？"],
  buttonWasPressed: ["Button %1 was pressed?", "按键 %1 是否按过？"],
  buttonWasPressedHint: ["Checks whether the button was pressed since startup or the last check, then clears the flag.", "检查自启动或上次查询以来是否按过，读取后清除标记。"],
  buttonPressCount: ["Button %1 press count", "按键 %1 的按压次数"],
  buttonPressCountHint: ["Returns the accumulated press count and resets it to zero.", "返回累计按压次数，读取后将计数归零。"],
  display: ["Display", "显示"],
  pins: ["Pins", "引脚"],
  gpio: ["GPIO", "引脚"],
  microbitPinReadAnalog: ["Read analog pin %1", "读取模拟引脚 %1"],
  microbitPinReadAnalogHint: ["Uses Micro:bit read_analog() to return 0–1023. P3, P4, and P10 share pins with the display and may require display.off().", "使用 Micro:bit 的 read_analog()，返回 0–1023。P3、P4、P10 与点阵共用，可能需要先调用 display.off()。"],
  microbitPinReadHint: ["Select a P pin to read 0 (low) or 1 (high). Uses the Micro:bit firmware’s built-in pin objects.", "选择一个 P 引脚，读取 0（低电平）或 1（高电平）。使用 Micro:bit 固件内置的引脚对象。"],
  microbitPinWriteHint: ["Select a P pin and set it low (0) or high (1). General GPIO blocks instead use machine.Pin.", "选择一个 P 引脚并设为低电平（0）或高电平（1）。通用引脚积木使用 machine.Pin。"],
  pinRead: ["Read digital pin %1", "读取数字引脚 %1"],
  pinWrite: ["Write digital pin %1 to %2", "将数字引脚 %1 设为 %2"],
  pinLow: ["LOW", "低电平"],
  pinHigh: ["HIGH", "高电平"],
  gpioOnEdge: ["When GPIO %1 detects %2", "当 GPIO %1 检测到 %2 时"],
  gpioRising: ["a rising edge", "上升沿"],
  gpioFalling: ["a falling edge", "下降沿"],
  gpioBoth: ["either edge", "任一边沿"],
  gpioOnEdgeHint: ["Registers an interrupt at this point in the program. Use one handler per pin and keep it short. Edges are not debounced.", "程序执行到此处时注册中断。每个引脚使用一个处理函数，并尽快返回。该事件不含消抖。"],
  gpioReadHint: ["Configure the pin as an input and read 0 or 1. Use the pin ID for your board.", "将引脚配置为输入并读取 0 或 1。请使用板卡对应的引脚编号或名称。"],
  gpioWriteHint: ["Configure the pin as an output and set its initial level.", "将引脚配置为输出并设置初始电平。"],
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
