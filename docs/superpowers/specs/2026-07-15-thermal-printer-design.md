# Design Specification: USB Thermal printing & Auto-Cut

This specification outlines the integration of `react-thermal-printer` using the browser's WebUSB and WebSerial APIs to send raw ESC/POS commands directly to a USB-connected thermal printer, ensuring dynamic receipt heights and automatic paper cutting.

## Goal
Replace standard browser print dialog rendering with raw ESC/POS receipt commands via WebUSB/WebSerial, enabling automatic cutting and variable-height receipt rolls on POS-80C printers.

---

## 1. Components & Architecture

### UsbPrinterService.js
A helper service providing wrappers for connection management:
- `connectSerial()`: Requests virtual COM port permissions and stores port details.
- `connectUsb()`: Requests raw USB device permissions and stores vendor/product IDs.
- `sendToPrinter(data: Uint8Array)`: Writes the binary print data to the active Serial port or USB device endpoint.

### ReceiptModal Custom Printing Flow
- **"Setup Printer" Dropdown**: Integrated into the modal footer, allowing users to pair a Serial COM Port or a raw USB Device.
- **Persisted State**: Paired device metadata is stored in `localStorage` for persistent automatic connection.
- **ESC/POS Compilation**: Uses `react-thermal-printer` to generate a formatted receipt containing store details, order attributes, items list, totals, and a `<Cut />` instruction.

---

## 2. Dependencies
We will install the following packages:
- `react-thermal-printer`

---

## 3. Data Flow
1. User clicks **"Print"**.
2. React compiles receipt template to ESC/POS binary using `render()` from `react-thermal-printer`.
3. The binary payload is transmitted to the printer via the active WebSerial/WebUSB interface.
4. The hardware prints the characters, feeds the paper, and executes a clean cut.
