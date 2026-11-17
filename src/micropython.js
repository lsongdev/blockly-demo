export class MicroPythonError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const encoder = new TextEncoder();

function streamOutput(port, reader, decoder, onOutput, pending = '') {
  const done = (async () => {
    try {
      if (pending) onOutput(pending);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        if (text) onOutput(text);
      }
      const tail = decoder.decode();
      if (tail) onOutput(tail);
    } finally {
      reader.releaseLock();
      await port.close();
    }
  })();

  return {
    port,
    done,
    async close() {
      await reader.cancel().catch(() => {});
      await done.catch(() => {});
    },
  };
}

export async function monitorPort(port, onOutput) {
  await port.open({ baudRate: 115200 });
  try {
    return streamOutput(port, port.readable.getReader(), new TextDecoder(), onOutput);
  } catch (error) {
    await port.close().catch(() => {});
    throw error;
  }
}

async function runOnBoard(port, onOutput, operation) {
  await port.open({ baudRate: 115200 });
  const decoder = new TextDecoder();
  let reader;
  let writer;
  try {
    reader = port.readable.getReader();
    writer = port.writable.getWriter();
    let pending = '';

    async function write(text) {
      await writer.write(encoder.encode(text));
    }

    async function readUntil(marker) {
      const timeout = setTimeout(() => void reader.cancel().catch(() => {}), 4000);
      try {
        while (!pending.includes(marker)) {
          const { value, done } = await reader.read();
          if (done) throw new MicroPythonError('serialTimeout', 'Board response timed out or the serial port disconnected');
          pending += decoder.decode(value, { stream: true });
        }
        const end = pending.indexOf(marker);
        const result = pending.slice(0, end);
        pending = pending.slice(end + marker.length);
        return result;
      } finally {
        clearTimeout(timeout);
      }
    }

    async function execute(command) {
      await write(command + '\x04');
      const prefix = await readUntil('OK');
      if (prefix) throw new MicroPythonError('unexpectedResponse', 'Unexpected response from MicroPython');
      const output = await readUntil('\x04');
      const error = await readUntil('\x04>');
      if (error.trim()) throw new BoardCommandError(error.trim());
      return output;
    }

    await write('\r\x03\x03\x02');
    await readUntil('>>>');
    await write('\x01');
    await readUntil('raw REPL; CTRL-B to exit\r\n>');
    const result = await operation(execute);
    await write('\x02');
    await readUntil('>>>');
    await write('\x04');
    await readUntil('MPY: soft reboot');
    writer.releaseLock();
    const session = streamOutput(port, reader, decoder, onOutput, 'MPY: soft reboot' + pending);
    return { session, result };
  } catch (error) {
    writer?.releaseLock();
    reader?.releaseLock();
    await port.close().catch(() => {});
    throw error;
  }
}

class BoardCommandError extends Error {}

function toHex(bytes) {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

function boardPath(path) {
  return `unhexlify('${toHex(encoder.encode(path))}').decode()`;
}

async function writeBoardFile(execute, path, bytes, { replace = false } = {}) {
  const separator = path.lastIndexOf('/') + 1;
  const prefix = path.slice(0, separator);
  const directory = prefix || '.';
  const name = path.slice(separator);
  const temporary = `${prefix}.blockly-${crypto.randomUUID()}.tmp`;
  if (!replace) {
    await execute(`assert ${boardPath(name)} not in os.listdir(${boardPath(directory)}), 'File already exists'`);
  }
  let stage = 'open temporary file';
  let opened = false;
  try {
    await execute(`f = open(${boardPath(temporary)}, 'wb')`);
    opened = true;
    stage = 'write temporary file';
    for (let offset = 0; offset < bytes.length; offset += 96) {
      const chunk = bytes.subarray(offset, offset + 96);
      await execute(`assert f.write(unhexlify('${toHex(chunk)}')) == ${chunk.length}`);
    }
    stage = 'rename temporary file';
    await execute(`f.close()\nos.rename(${boardPath(temporary)}, ${boardPath(path)})`);
  } catch (error) {
    if (error instanceof BoardCommandError) {
      if (opened) {
        await execute(`f.close()\nos.remove(${boardPath(temporary)})`).catch(() => {});
      }
      throw new BoardCommandError(`${path} (${stage}): ${error.message}`);
    }
    throw error;
  }
}

export async function downloadProgram(port, source, onOutput, libraries = []) {
  const { session } = await runOnBoard(port, onOutput, async execute => {
    await execute('from binascii import unhexlify\nimport os');
    if (libraries.length) {
      const output = await execute(`import sys, json
paths = [p for p in sys.path if p.endswith('/lib') and not p.startswith('/rom')]
assert paths, 'No writable library directory in sys.path'
library_dir = paths[0]
try:
    os.stat(library_dir)
except OSError:
    os.mkdir(library_dir)
print(json.dumps(library_dir))`);
      const directory = JSON.parse(output);
      for (const { name, source } of libraries) {
        await writeBoardFile(execute, `${directory}/${name}`, encoder.encode(source), { replace: true });
      }
    }
    await writeBoardFile(execute, 'main.py', encoder.encode(source), { replace: true });
  });
  return session;
}

export function manageDeviceFiles(port, directory, action, onOutput) {
  return runOnBoard(port, onOutput, async execute => {
    try {
      await execute('from binascii import unhexlify\nimport os, json');
      if (action?.type === 'upload') {
        if (!action.name || /[/\\\x00-\x1f]/.test(action.name) || ['.', '..'].includes(action.name)) {
          throw new BoardCommandError('Invalid file name');
        }
        const path = `${directory.replace(/\/$/, '')}/${action.name}`;
        await writeBoardFile(execute, path, action.bytes);
      } else if (action?.type === 'delete') {
        await execute(`os.remove(${boardPath(action.path)})`);
      }
      const output = await execute(`print(json.dumps([(entry[0], entry[1]) for entry in os.ilistdir(${boardPath(directory)})]))`);
      return { entries: JSON.parse(output).map(([name, mode]) => ({ name, directory: (mode & 0xf000) === 0x4000 })) };
    } catch (error) {
      if (!(error instanceof BoardCommandError)) throw error;
      return { error };
    }
  });
}
