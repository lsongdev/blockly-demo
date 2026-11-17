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
import { createProject, parseProject, ProjectError, readAutosave, writeAutosave } from './project.js';
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

const openProject = document.querySelector('#open-project');
const saveProject = document.querySelector('#save-project');
const projectFile = document.querySelector('#project-file');
const projectStatus = document.querySelector('#project-status');
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
let projectMessage;
let autosaveTimer;

function renderStatus(element, message) {
  if (!message) return;
  const [key, error] = message;
  const detail = error instanceof MicroPythonError ? t(error.code) : error?.message;
  element.textContent = t(key, detail);
}

function setProjectStatus(key) {
  projectMessage = key;
  projectStatus.textContent = key ? t(key) : '';
}

function captureProject() {
  return createProject(
    Blockly.serialization.workspaces.save(workspace),
    manuallyEdited ? code.value : null,
  );
}

function applyProject(project, validate = true) {
  const previous = captureProject();
  const load = (candidate) => {
    Blockly.serialization.workspaces.load(candidate.workspace, workspace);
    manuallyEdited = candidate.manualCode !== null;
    code.value = candidate.manualCode ?? '';
    updateCode();
  };

  Blockly.Events.disable();
  try {
    if (validate) {
      const serializers = Blockly.registry.getAllItems(Blockly.registry.Type.SERIALIZER);
      if (Object.keys(project.workspace).some(key => !Object.hasOwn(serializers, key))) {
        throw new ProjectError('projectInvalid');
      }
      const testWorkspace = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(project.workspace, testWorkspace);
      } finally {
        testWorkspace.dispose();
      }
    }
    try {
      load(project);
    } catch (error) {
      load(previous);
      throw error;
    }
    workspace.clearUndo();
  } finally {
    Blockly.Events.enable();
  }
}

function saveLocally() {
  clearTimeout(autosaveTimer);
  autosaveTimer = undefined;
  try {
    writeAutosave(captureProject());
    if (projectMessage === 'projectAutosaveFailed') setProjectStatus();
  } catch {
    setProjectStatus('projectAutosaveFailed');
  }
}

function queueAutosave() {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(saveLocally, 200);
}

function restoreProject() {
  try {
    const saved = readAutosave();
    if (saved) {
      applyProject(saved);
      return;
    }
  } catch (error) {
    setProjectStatus(error.name === 'SecurityError' ? 'projectAutosaveFailed' : 'projectRestoreFailed');
  }
  applyProject(createProject(example), false);
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
  setProjectStatus(projectMessage);
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
  queueAutosave();
});

useBlockCode.addEventListener('click', () => {
  if (generatedCode === null) return;
  code.value = generatedCode;
  manuallyEdited = false;
  updateButtons();
  queueAutosave();
  code.focus();
});

restoreProject();
workspace.addChangeListener(event => {
  if (event.isUiEvent) return;
  updateCode();
  queueAutosave();
});
window.addEventListener('pagehide', () => {
  if (autosaveTimer !== undefined) saveLocally();
});
new ResizeObserver(() => Blockly.svgResize(workspace)).observe(document.querySelector('#workspace'));
renderLanguage();

function downloadFile(content, type, filename) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

download.addEventListener('click', () => downloadFile(code.value, 'text/x-python', 'main.py'));

saveProject.addEventListener('click', () => {
  downloadFile(JSON.stringify(captureProject(), null, 2), 'application/json', 'project.blockly.json');
});

openProject.addEventListener('click', () => projectFile.click());
projectFile.addEventListener('change', async () => {
  const file = projectFile.files[0];
  projectFile.value = '';
  if (!file) return;
  openProject.disabled = true;
  try {
    const project = parseProject(await file.text());
    applyProject(project);
    setProjectStatus('projectOpened');
    saveLocally();
  } catch (error) {
    setProjectStatus(error instanceof ProjectError ? error.code : 'projectInvalid');
  } finally {
    openProject.disabled = false;
  }
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
