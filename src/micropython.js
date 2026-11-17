export class MicroPythonError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function downloadProgram(port, source) {
  await port.open({ baudRate: 115200 });
  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();
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
        pending += decoder.decode(value);
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
    await readUntil('\x04');
    const error = await readUntil('\x04>');
    if (error.trim()) throw new Error(error.trim());
  }

  try {
    await write('\r\x03\x03\x02');
    await readUntil('>>>');
    await write('\x01');
    await readUntil('raw REPL; CTRL-B to exit\r\n>');
    await execute("from binascii import unhexlify\nimport os\nf = open('.blockly-main.tmp', 'wb')");
    const bytes = encoder.encode(source);
    for (let offset = 0; offset < bytes.length; offset += 96) {
      const chunk = bytes.slice(offset, offset + 96);
      const hex = Array.from(chunk, byte => byte.toString(16).padStart(2, '0')).join('');
      await execute(`assert f.write(unhexlify('${hex}')) == ${chunk.length}`);
    }
    await execute("f.close()\nos.rename('.blockly-main.tmp', 'main.py')");
    await write('\x02');
    await readUntil('>>>');
    await write('\x04');
    await readUntil('MPY: soft reboot');
  } finally {
    reader.releaseLock();
    writer.releaseLock();
    await port.close();
  }
}
