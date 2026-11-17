import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { pythonGenerator } from 'blockly/python';
import { createToolbox } from './toolbox.js';
import { applyLanguage, getSavedLanguage, normalizeLanguage, saveLanguage, t } from './i18n.js';
import { PythonBlockError } from './python-blocks.js';
import './matrixbit.js';
import './matrixbit-wifi.js';
import './microbit.js';
import { example } from './example.js';
import { downloadProgram, MicroPythonError } from './micropython.js';
import './style.css';

let language = getSavedLanguage();
applyLanguage(language);

const workspace = Blockly.inject('workspace', {
  toolbox: createToolbox(),
  trashcan: true,
  scrollbars: true,
  grid: { spacing: 24, length: 2, colour: '#b8bcd2' },
});

Blockly.serialization.workspaces.load(example, workspace);

const code = document.querySelector('#python');
const codeError = document.querySelector('#code-error');
const codeSync = document.querySelector('#code-sync');
const useBlockCode = document.querySelector('#use-block-code');
const download = document.querySelector('#download');
const upload = document.querySelector('#upload');
const uploadStatus = document.querySelector('#upload-status');
let uploading = false;
let generatedCode = null;
let manuallyEdited = false;
let uploadMessage;

function renderUploadStatus() {
  if (!uploadMessage) return;
  const [key, error] = uploadMessage;
  const detail = error instanceof MicroPythonError ? t(error.code) : error?.message;
  uploadStatus.textContent = t(key, detail);
}

function setUploadStatus(key, error) {
  uploadMessage = [key, error];
  renderUploadStatus();
}

function renderLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.title = t(element.dataset.i18nTitle);
  });
  renderUploadStatus();
}

window.setLanguage = (requested, { persist = true } = {}) => {
  const nextLanguage = normalizeLanguage(requested);
  if (!nextLanguage) throw new RangeError('Supported languages: en, zh-CN.');
  if (nextLanguage !== language) {
    const state = Blockly.serialization.workspaces.save(workspace);
    language = nextLanguage;
    applyLanguage(language);
    workspace.updateToolbox(createToolbox());
    Blockly.serialization.workspaces.load(state, workspace);
    renderLanguage();
    updateCode();
  }
  if (persist) saveLanguage(language);
  return language;
};

function updateButtons() {
  download.disabled = !code.value.trim();
  upload.disabled = download.disabled || uploading || !navigator.serial;
  codeSync.hidden = !manuallyEdited;
  useBlockCode.disabled = generatedCode === null;
}

function updateCode() {
  try {
    generatedCode = pythonGenerator.workspaceToCode(workspace);
    codeError.textContent = '';
  } catch (error) {
    if (!(error instanceof PythonBlockError)) throw error;
    generatedCode = null;
    codeError.textContent = error.message;
  }
  if (!manuallyEdited) {
    const nextCode = generatedCode ?? '';
    if (code.value !== nextCode) code.value = nextCode;
  } else if (code.value === generatedCode) {
    manuallyEdited = false;
  }
  updateButtons();
}

code.addEventListener('input', () => {
  manuallyEdited = code.value !== (generatedCode ?? '');
  updateButtons();
});

useBlockCode.addEventListener('click', () => {
  if (generatedCode === null) return;
  code.value = generatedCode;
  manuallyEdited = false;
  updateButtons();
  code.focus();
});

workspace.addChangeListener(updateCode);
new ResizeObserver(() => Blockly.svgResize(workspace)).observe(document.querySelector('#workspace'));
renderLanguage();
updateCode();

download.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([code.value], { type: 'text/x-python' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'main.py';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

upload.addEventListener('click', async () => {
  const source = code.value;
  uploading = true;
  updateButtons();
  setUploadStatus('selectPort');
  try {
    const port = await navigator.serial.requestPort();
    setUploadStatus('writingCode');
    await downloadProgram(port, source);
    setUploadStatus('flashComplete');
  } catch (error) {
    if (error.name === 'NotFoundError') setUploadStatus('portCanceled');
    else setUploadStatus('flashFailed', error);
  } finally {
    uploading = false;
    updateButtons();
  }
});
