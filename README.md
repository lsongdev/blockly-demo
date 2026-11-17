# MicroPython Blocks

[打开积木编辑器](https://lsong.org/blockly-demo/)

## 首次安装 MicroPython

编辑器的 `flash` 按钮通过串口把当前代码写成 `main.py`，需要板卡已经运行支持串口 raw REPL 的 MicroPython。首次安装请打开独立的 [MicroPython 安装页](https://lsong.org/blockly-demo/firmware.html)。本地开发时可以访问 `/firmware.html`。

安装页支持经典 ESP32、8 MB Flash 的 Matrix:bit，以及 BBC Micro:bit V1 / V2。它连接板卡、校验所选固件并在用户确认后刷写。BBC Micro:bit 也可以从安装页下载对应版本的 HEX，拖到 `MICROBIT` 盘。固件来源和许可证见 [固件说明](public/firmware/NOTICE.txt)。

下面的外部工具可作为备用。

### Matrix:bit

以下步骤适用于本项目实测的经典 ESP32、8 MB Flash 版本。

1. 从 [MicroPython 官方下载页](https://micropython.org/download/ESP32_GENERIC/) 下载 `ESP32_GENERIC` 的完整 `.bin`。本项目验证过 v1.29.0。
2. 关闭正在占用板卡串口的监视器。在 Chrome 或 Edge 打开 [Espressif ESP Tool](https://espressif.github.io/esptool-js/)，通过 USB 连接板卡并选择对应串口。
3. 首次安装时，先备份需要保留的数据，再擦除 Flash。把下载的 `.bin` 写到 `0x1000`。擦除会清空原有固件和文件。
4. 安装后重启板卡，断开刷写工具，再回到积木编辑器点 `flash` 写入 `main.py`。

### BBC Micro:bit V1 / V2

1. 在积木编辑器里点 `download`，导出 `main.py`。
2. 打开 [Micro:bit 官方 Python Editor](https://python.microbit.org/)，导入 `main.py`，点击 **Send to micro:bit**。也可以在官方编辑器中保存 `.hex`，再把它拖到 `MICROBIT` 盘。
3. 官方编辑器会把基金会版 MicroPython 和程序一起写入板卡。后续也可以用同样的步骤更新程序。

参见 [Micro:bit Python Editor 使用指南](https://microbit.org/get-started/user-guide/python-editor/)。
