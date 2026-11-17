const format = 'blockly-demo';
const version = 1;
const storageKey = 'blockly-demo.project';

export class ProjectError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function createProject(workspace, manualCode = null) {
  return { format, version, workspace, manualCode };
}

export function parseProject(text) {
  let project;
  try {
    project = JSON.parse(text);
  } catch {
    throw new ProjectError('projectInvalid');
  }
  if (project?.format !== format) throw new ProjectError('projectInvalid');
  if (project.version !== version) throw new ProjectError('projectUnsupported');
  const { workspace, manualCode } = project;
  if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace) ||
      (manualCode !== null && typeof manualCode !== 'string')) {
    throw new ProjectError('projectInvalid');
  }
  if ('blocks' in workspace && (!workspace.blocks || !Array.isArray(workspace.blocks.blocks))) {
    throw new ProjectError('projectInvalid');
  }
  return createProject(workspace, manualCode);
}

export function readAutosave() {
  const text = localStorage.getItem(storageKey);
  return text === null ? null : parseProject(text);
}

export function writeAutosave(project) {
  localStorage.setItem(storageKey, JSON.stringify(project));
}
