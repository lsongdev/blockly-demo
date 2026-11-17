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

export async function downloadProgram(port, source, onOutput) {
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
      await readUntil('\x04');
      const error = await readUntil('\x04>');
      if (error.trim()) throw new Error(error.trim());
    }

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
    writer.releaseLock();
    return streamOutput(port, reader, decoder, onOutput, 'MPY: soft reboot' + pending);
  } catch (error) {
    writer?.releaseLock();
    reader?.releaseLock();
    await port.close().catch(() => {});
    throw error;
  }
}
