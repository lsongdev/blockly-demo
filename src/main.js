import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { javascriptGenerator } from 'blockly/javascript';
import { pythonGenerator } from 'blockly/python';
import * as ZhHans from 'blockly/msg/zh-hans';
import { toolbox } from './toolbox.js';
import './style.css';

Blockly.setLocale(ZhHans);

const images = {
  HAPPY: { label: '笑脸', pixels: ['00000', '09090', '00000', '90009', '09990'] },
  HEART: { label: '爱心', pixels: ['09090', '99999', '99999', '09990', '00900'] },
};

Blockly.common.defineBlocksWithJsonArray([
  {
    type: 'display_image',
    message0: '显示 %1',
    args0: [{
      type: 'field_dropdown',
      name: 'IMAGE',
      options: Object.entries(images).map(([id, image]) => [image.label, id]),
    }],
    previousStatement: null,
    nextStatement: null,
    colour: 260,
  },
  {
    type: 'display_clear',
    message0: '清空点阵',
    previousStatement: null,
    nextStatement: null,
    colour: 260,
  },
]);

pythonGenerator.forBlock.display_image = (block, generator) => {
  generator.definitions_.import_microbit = 'from microbit import display, Image';
  return `display.show(Image.${block.getFieldValue('IMAGE')})\n`;
};

pythonGenerator.forBlock.display_clear = (_block, generator) => {
  generator.definitions_.import_microbit = 'from microbit import display, Image';
  return 'display.clear()\n';
};

javascriptGenerator.addReservedWords('previewDisplay');
javascriptGenerator.forBlock.display_image = (block) =>
  `previewDisplay(${JSON.stringify(block.getFieldValue('IMAGE'))});\n`;
javascriptGenerator.forBlock.display_clear = () => 'previewDisplay(null);\n';

const workspace = Blockly.inject('workspace', {
  toolbox,
  trashcan: true,
  scrollbars: true,
  grid: { spacing: 24, length: 2, colour: '#b8bcd2' },
});

Blockly.serialization.workspaces.load({
  blocks: { languageVersion: 0, blocks: [{ type: 'display_image', x: 42, y: 42 }] },
}, workspace);

const code = document.querySelector('#python');
const matrix = document.querySelector('#matrix');
const status = document.querySelector('#status');
const download = document.querySelector('#download');
const cells = Array.from({ length: 25 }, () => document.createElement('span'));
matrix.append(...cells);

function updateCode() {
  code.textContent = pythonGenerator.workspaceToCode(workspace);
  download.disabled = !code.textContent.trim();
}

workspace.addChangeListener(updateCode);
new ResizeObserver(() => Blockly.svgResize(workspace)).observe(document.querySelector('#workspace'));
updateCode();

function renderDisplay(image) {
  const pixels = image?.pixels.join('') ?? '';
  cells.forEach((cell, index) => cell.classList.toggle('lit', pixels[index] === '9'));
  matrix.setAttribute('aria-label', image ? `点阵显示${image.label}` : '点阵已熄灭');
  status.textContent = image ? `正在显示${image.label}` : '点阵已熄灭';
}

const run = document.querySelector('#run');
run.addEventListener('click', () => {
  const worker = new Worker(new URL('./preview-worker.js', import.meta.url), { type: 'module' });
  run.disabled = true;
  status.textContent = '正在运行…';

  function finish() {
    clearTimeout(timeout);
    worker.terminate();
    run.disabled = false;
  }

  const timeout = setTimeout(() => {
    finish();
    status.textContent = '运行超时，请检查循环或递归。';
  }, 2000);

  worker.onmessage = ({ data }) => {
    finish();
    if (data.error) {
      status.textContent = `运行出错：${data.error}`;
    } else {
      renderDisplay(images[data.imageId]);
    }
  };

  worker.onerror = () => {
    finish();
    status.textContent = '预览启动失败，请重试。';
  };

  worker.postMessage(javascriptGenerator.workspaceToCode(workspace));
});

download.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([code.textContent], { type: 'text/x-python' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'main.py';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
