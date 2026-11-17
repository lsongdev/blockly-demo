import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { pythonGenerator } from 'blockly/python';
import { createToolbox } from './toolbox.js';
import { applyLanguage, getSavedLanguage, normalizeLanguage, saveLanguage, t } from './i18n.js';
import { PythonBlockError } from './python-blocks.js';
import './matrixbit.js';
import './matrixbit-wifi.js';
import './microbit.js';
import './gpio.js';
import './timing.js';
import { example } from './example.js';
import { downloadProgram, MicroPythonError, monitorPort } from './micropython.js';
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
const serialConnect = document.querySelector('#serial-connect');
const serialClear = document.querySelector('#serial-clear');
const serialStatus = document.querySelector('#serial-status');
const serialOutput = document.querySelector('#serial-output');
const serialOutputLimit = 32_768;
let serialBusy = false;
let serialSession;
let serialMessage = ['serialDisconnected'];
let generatedCode = null;
let manuallyEdited = false;
let uploadMessage;

function renderStatus(element, message) {
  if (!message) return;
  const [key, error] = message;
  const detail = error instanceof MicroPythonError ? t(error.code) : error?.message;
  element.textContent = t(key, detail);
}

function setUploadStatus(key, error) {
  uploadMessage = [key, error];
  renderStatus(uploadStatus, uploadMessage);
}

function setSerialStatus(key, error) {
  serialMessage = [key, error];
  renderStatus(serialStatus, serialMessage);
}

function appendSerialOutput(text) {
  const atBottom = serialOutput.scrollHeight - serialOutput.clientHeight - serialOutput.scrollTop <= 2;
  serialOutput.textContent = (serialOutput.textContent + text).slice(-serialOutputLimit);
  if (atBottom) serialOutput.scrollTop = serialOutput.scrollHeight;
  serialClear.disabled = false;
}

function attachSerial(session) {
  serialSession = session;
  setSerialStatus('serialConnected');
  const ended = (error) => {
    if (serialSession !== session) return;
    serialSession = undefined;
    setSerialStatus(error ? 'serialFailed' : 'serialDisconnected', error);
    updateButtons();
  };
  session.done.then(() => ended(), ended);
}

async function detachSerial() {
  const session = serialSession;
  serialSession = undefined;
  await session?.close();
}

function renderLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.title = t(element.dataset.i18nTitle);
  });
  renderStatus(uploadStatus, uploadMessage);
  renderStatus(serialStatus, serialMessage);
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
  upload.disabled = download.disabled || serialBusy || !navigator.serial;
  serialConnect.disabled = serialBusy || !navigator.serial;
  serialConnect.textContent = t(serialSession ? 'serialDisconnect' : 'serialConnect');
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

serialClear.addEventListener('click', () => {
  serialOutput.textContent = '';
  serialClear.disabled = true;
});

serialConnect.addEventListener('click', async () => {
  serialBusy = true;
  updateButtons();
  try {
    if (serialSession) {
      await detachSerial();
      setSerialStatus('serialDisconnected');
    } else {
      setSerialStatus('selectPort');
      const port = await navigator.serial.requestPort();
      attachSerial(await monitorPort(port, appendSerialOutput));
    }
  } catch (error) {
    setSerialStatus(error.name === 'NotFoundError' ? 'portCanceled' : 'serialFailed', error);
  } finally {
    serialBusy = false;
    updateButtons();
  }
});

upload.addEventListener('click', async () => {
  const source = code.value;
  serialBusy = true;
  updateButtons();
  try {
    let port = serialSession?.port;
    if (port) {
      await detachSerial();
    } else {
      setUploadStatus('selectPort');
      port = await navigator.serial.requestPort();
    }
    setSerialStatus('serialConnecting');
    setUploadStatus('writingCode');
    attachSerial(await downloadProgram(port, source, appendSerialOutput));
    setUploadStatus('flashComplete');
  } catch (error) {
    setSerialStatus('serialDisconnected');
    if (error.name === 'NotFoundError') setUploadStatus('portCanceled');
    else setUploadStatus('flashFailed', error);
  } finally {
    serialBusy = false;
    updateButtons();
  }
});
