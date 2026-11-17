import * as Blockly from 'blockly/core';
import 'blockly/blocks';
import { pythonGenerator } from 'blockly/python';
import { createToolbox, EditorToolbox } from './toolbox.js';
import { applyLanguage, getSavedLanguage, normalizeLanguage, saveLanguage, t } from './i18n.js';
import { PythonBlockError } from './python-blocks.js';
import './matrixbit.js';
import './matrixbit-wifi.js';
import './microbit.js';
import './gpio.js';
import './output-blocks.js';
import './bus-blocks.js';
import './timing.js';
import { example } from './example.js';
import { createProject, isLibraryFilename, parseProject, ProjectError, readAutosave, writeAutosave } from './project.js';
import { downloadProgram, manageDeviceFiles, MicroPythonError, monitorPort } from './micropython.js';
import './style.css';

let language = getSavedLanguage();
applyLanguage(language);

const workspace = Blockly.inject('workspace', {
  toolbox: createToolbox(),
  plugins: { toolbox: EditorToolbox },
  trashcan: true,
  scrollbars: true,
  grid: { spacing: 24, length: 2, colour: '#b8bcd2' },
});

const filesPanel = document.querySelector('#files-panel');
const librariesPanel = document.querySelector('#libraries-panel');
const libraryInput = document.querySelector('#library-file');
const libraryList = document.querySelector('#library-list');
const librariesStatus = document.querySelector('#libraries-status');
let libraries = [];
let librariesMessage;
const localDeviceFile = document.querySelector('#local-device-file');
const refreshFiles = document.querySelector('#refresh-files');
const addFile = document.querySelector('#add-file');
const filesParent = document.querySelector('#files-parent');
const filesPath = document.querySelector('#files-path');
const fileList = document.querySelector('#device-file-list');
const filesStatus = document.querySelector('#device-files-status');
let deviceListing;
let filesMessage;
let filesBusy = false;

function syncToolboxPanels() {
  const toolbox = workspace.getToolbox();
  const selected = toolbox.getSelectedItem()?.getId();
  filesPanel.hidden = selected !== 'files';
  librariesPanel.hidden = selected !== 'libraries';
  const container = filesPanel.parentElement;
  container.style.setProperty('--toolbox-width', `${toolbox.getWidth()}px`);
  const flyoutBackground = workspace.getInjectionDiv().querySelector('.blocklyFlyoutBackground');
  if (flyoutBackground) {
    const { fill, fillOpacity } = getComputedStyle(flyoutBackground);
    container.style.setProperty('--flyout-fill', fill);
    container.style.setProperty('--flyout-opacity', fillOpacity);
  }
  filesPanel.setAttribute('aria-label', t('files'));
}

workspace.addChangeListener(event => {
  if (event.type === Blockly.Events.TOOLBOX_ITEM_SELECT) syncToolboxPanels();
});
function renderLibraries() {
  librariesStatus.textContent = librariesMessage ? t(librariesMessage)
    : libraries.length === 0 ? t('librariesEmpty') : '';
  libraryList.replaceChildren();
  for (const library of libraries) {
    const row = document.createElement('li');
    const filename = document.createElement('code');
    filename.textContent = library.name;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = t('libraryRemove');
    remove.addEventListener('click', () => {
      libraries = libraries.filter(file => file !== library);
      librariesMessage = undefined;
      renderLibraries();
      saveLocally();
    });
    row.append(filename, remove);
    libraryList.append(row);
  }
}

document.querySelector('#add-library').addEventListener('click', () => libraryInput.click());
libraryInput.addEventListener('change', async () => {
  const file = libraryInput.files[0];
  libraryInput.value = '';
  if (!file) return;
  librariesMessage = undefined;
  if (!isLibraryFilename(file.name)) {
    librariesMessage = 'libraryInvalidName';
    renderLibraries();
    return;
  }
  const currentLibraries = libraries;
  try {
    const source = await file.text();
    if (currentLibraries !== libraries) return;
    const existing = libraries.find(library => library.name.toLowerCase() === file.name.toLowerCase());
    if (existing && !window.confirm(t('libraryReplace', existing.name))) return;
    const library = { name: existing?.name ?? file.name, source };
    libraries = existing ? libraries.map(item => item === existing ? library : item) : [...libraries, library];
    saveLocally();
  } catch {
    if (currentLibraries !== libraries) return;
    librariesMessage = 'libraryReadFailed';
  }
  renderLibraries();
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
    libraries,
  );
}

function applyProject(project, validate = true) {
  const previous = captureProject();
  const load = (candidate) => {
    Blockly.serialization.workspaces.load(candidate.workspace, workspace);
    manuallyEdited = candidate.manualCode !== null;
    code.value = candidate.manualCode ?? '';
    libraries = candidate.libraries;
    librariesMessage = undefined;
    renderLibraries();
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

function renderDeviceFiles() {
  const listing = deviceListing?.port === serialSession?.port ? deviceListing : undefined;
  refreshFiles.disabled = serialBusy || !navigator.serial;
  refreshFiles.textContent = t(serialSession ? 'filesRefresh' : 'filesConnect');
  addFile.disabled = serialBusy || !listing;
  filesParent.hidden = !listing || listing.path === '/';
  filesParent.disabled = serialBusy;
  filesPath.textContent = listing?.path ?? '';
  filesStatus.textContent = filesBusy ? t('filesBusy')
    : filesMessage ? t(...filesMessage)
    : !navigator.serial ? t('filesUnsupported')
    : listing?.entries.length === 0 ? t('filesEmpty') : '';
  fileList.replaceChildren();

  for (const entry of listing?.entries ?? []) {
    const row = document.createElement('li');
    const path = `${listing.path.replace(/\/$/, '')}/${entry.name}`;
    const name = document.createElement(entry.directory ? 'button' : 'span');
    name.textContent = entry.directory ? `${entry.name}/` : entry.name;
    row.append(name);
    if (entry.directory) {
      name.type = 'button';
      name.disabled = serialBusy;
      name.addEventListener('click', () => accessDeviceFiles(path));
    } else {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.disabled = serialBusy;
      remove.textContent = t('filesDelete');
      remove.setAttribute('aria-label', t('filesDeleteConfirm', path));
      remove.addEventListener('click', () => {
        if (window.confirm(t('filesDeleteConfirm', path))) {
          void accessDeviceFiles(listing.path, { type: 'delete', path });
        }
      });
      row.append(remove);
    }
    fileList.append(row);
  }
}

async function accessDeviceFiles(path, action) {
  if (serialBusy || !navigator.serial) return;
  filesBusy = serialBusy = true;
  filesMessage = undefined;
  updateButtons();
  try {
    const port = serialSession?.port ?? await navigator.serial.requestPort();
    const command = action?.type === 'upload'
      ? { type: 'upload', name: action.file.name, bytes: new Uint8Array(await action.file.arrayBuffer()) }
      : action;
    await detachSerial();
    setSerialStatus('serialConnecting');
    const { session, result } = await manageDeviceFiles(port, path, command, appendSerialOutput);
    attachSerial(session);
    if (result.error) throw result.error;
    deviceListing = {
      port, path,
      entries: result.entries.sort((a, b) => Number(b.directory) - Number(a.directory) || a.name.localeCompare(b.name)),
    };
  } catch (error) {
    if (!serialSession) {
      deviceListing = undefined;
      setSerialStatus('serialDisconnected');
    }
    if (error.name === 'NotFoundError') filesMessage = ['portCanceled'];
    else filesMessage = ['filesFailed', error instanceof MicroPythonError ? t(error.code) : error.message];
  } finally {
    filesBusy = serialBusy = false;
    updateButtons();
  }
}

refreshFiles.addEventListener('click', () => {
  const path = deviceListing?.port === serialSession?.port ? deviceListing?.path : undefined;
  void accessDeviceFiles(path ?? '/');
});
filesParent.addEventListener('click', () => {
  if (!deviceListing) return;
  const parent = deviceListing.path.slice(0, deviceListing.path.lastIndexOf('/')) || '/';
  void accessDeviceFiles(parent);
});
addFile.addEventListener('click', () => localDeviceFile.click());
localDeviceFile.addEventListener('change', () => {
  const file = localDeviceFile.files[0];
  localDeviceFile.value = '';
  if (file && deviceListing && deviceListing.port === serialSession?.port) {
    void accessDeviceFiles(deviceListing.path, { type: 'upload', file });
  }
});

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
  renderLibraries();
  renderDeviceFiles();
}

window.setLanguage = (requested, { persist = true } = {}) => {
  const nextLanguage = normalizeLanguage(requested);
  if (!nextLanguage) throw new RangeError('Supported languages: en, zh-CN.');
  if (nextLanguage !== language) {
    const state = Blockly.serialization.workspaces.save(workspace);
    language = nextLanguage;
    applyLanguage(language);
    workspace.updateToolbox(createToolbox());
    syncToolboxPanels();
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
  renderDeviceFiles();
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
new ResizeObserver(() => {
  Blockly.svgResize(workspace);
  syncToolboxPanels();
}).observe(document.querySelector('#workspace'));
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
  const projectLibraries = libraries;
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
    attachSerial(await downloadProgram(port, source, appendSerialOutput, projectLibraries));
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
