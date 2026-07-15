class UsbPrinterService {
    static async connectSerial() {
        if (typeof window === "undefined" || !navigator.serial) {
            throw new Error("Web Serial API is not supported in this browser. Please use Chrome or Edge.");
        }
        try {
            const port = await navigator.serial.requestPort();
            localStorage.setItem("printer_type", "serial");
            return port;
        } catch (error) {
            console.error("Error connecting to Serial Port:", error);
            throw error;
        }
    }

    static async getActivePort() {
        if (typeof window === "undefined" || !navigator.serial) return null;
        const ports = await navigator.serial.getPorts();
        return ports[0] || null;
    }

    static async printToSerial(data) {
        let port = await this.getActivePort();
        if (!port) {
            port = await this.connectSerial();
        }
        
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(data);
        writer.releaseLock();
        await port.close();
    }

    static async connectUsb() {
        if (typeof window === "undefined" || !navigator.usb) {
            throw new Error("WebUSB API is not supported in this browser. Please use Chrome or Edge.");
        }
        try {
            const device = await navigator.usb.requestDevice({ filters: [] });
            localStorage.setItem("printer_type", "usb");
            localStorage.setItem("printer_usb_vendor_id", device.vendorId);
            localStorage.setItem("printer_usb_product_id", device.productId);
            return device;
        } catch (error) {
            console.error("Error connecting to USB device:", error);
            throw error;
        }
    }

    static async printToUsb(data) {
        if (typeof window === "undefined" || !navigator.usb) return;
        const vendorId = Number(localStorage.getItem("printer_usb_vendor_id"));
        const productId = Number(localStorage.getItem("printer_usb_product_id"));
        
        if (!vendorId || !productId) {
            throw new Error("No USB printer paired. Please setup the printer first.");
        }

        const devices = await navigator.usb.getDevices();
        let device = devices.find(d => d.vendorId === vendorId && d.productId === productId);
        if (!device) {
            device = await this.connectUsb();
        }

        await device.open();
        await device.selectConfiguration(1);
        
        let endpointOut = null;
        let claimedInterface = null;
        
        for (const config of device.configurations) {
            for (const iface of config.interfaces) {
                for (const alt of iface.alternates) {
                    if (alt.interfaceClass === 7) { // Printer Class
                        for (const ep of alt.endpoints) {
                            if (ep.direction === 'out' && ep.type === 'bulk') {
                                endpointOut = ep;
                                claimedInterface = iface.interfaceNumber;
                                await device.claimInterface(claimedInterface);
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (!endpointOut) {
            throw new Error("Could not find printer bulk-out endpoint. Try Web Serial instead.");
        }

        await device.transferOut(endpointOut.endpointNumber, data);
        await device.close();
    }

    static async print(data) {
        if (typeof window === "undefined") return;
        const type = localStorage.getItem("printer_type");
        if (type === "serial") {
            await this.printToSerial(data);
        } else if (type === "usb") {
            await this.printToUsb(data);
        } else {
            await this.printToSerial(data);
        }
    }
}

export default UsbPrinterService;
