import * as Noble from "noble";
import EventEmitter from "events";
let noble: typeof import("noble");

try {
    noble = require("@abandonware/noble");
} catch (e) {
    console.log("ERROR: noble module is not exist.");
}

export class Mzir extends EventEmitter {
    private mac: string;
    private id: string = "";
    private uuid: string = "";
    private manufacturer: string = "";
    private model: string = "";
    private firmwareRevision: string = "";
    private softwareRevision: string = "";
    private connected: boolean = false;
    private scanning: boolean = false;
    private temp: number = 0;
    private hum: number = 0;
    private mzirPeripheral?: Noble.Peripheral;
    private newDataEvent: EventEmitter = new EventEmitter();

    public constructor(mac: string) {
        super();
        this.mac = mac;

        noble.on("scanStop", () => {
            this.scanning = false;
            if (this.id === "") {
                console.log(`Can not discover Meizu BLE IR gadget(${this.mac})`);
            }
        });
        noble.on("scanStart", () => {
            this.scanning = true;
        })
        noble.on("discover", (peripheral: Noble.Peripheral) => {
            if (peripheral.address && (peripheral.address === this.mac)) {
                this.id = peripheral.id;
                this.uuid = peripheral.uuid;
                this.mzirPeripheral = peripheral;
                noble.stopScanning();
                this.emit("ready");
            } if (peripheral.id && (peripheral.id === this.id)) {
                // Already discovered device.
                this.mzirPeripheral = peripheral;
                noble.stopScanning();
                this.emit("ready");
            }
        });
        noble.on('stateChange', (state) => {
            if (state === 'poweredOn') {
                noble.startScanning();
            } else {
                noble.stopScanning();
            }
        });
    }

    private recvData(buf: Buffer, callback: (err?: string, cmd?: string, data?: any) => void) {
        let header: number;
        let len: number;
        let commandID: number;
        let command: string;

        function recvHeader(b: Buffer) {
            if (!b || b.length < 1) {
                callback("NO Header.");
                return 0;
            }
            let data = b.slice(0, 1).readUInt8(0);
            if (data != 0x55) {
                callback("Invalid Header.");
                return 0;
            }
            return data;
        }

        function recvLen(b: Buffer) {
            if (!b || b.length < 1) {
                callback("NO Len.");
                return 0;
            }
            return b.slice(0, 1).readUInt8(0);
        }

        function recvCommandID(b: Buffer) {
            if (!b || b.length < 1) {
                callback("NO CommandID.");
                return 0;
            }
            return b.slice(0, 1).readUInt8(0);
        }

        function recvCommand(b: Buffer) {
            if (!b || b.length < 1) {
                callback("NO Command.");
                return "";
            }
            let data = b.slice(0, 1).readUInt8(0);
            if (data === 17)
                return "IR_TH_DATA";
            else
                return "";
        }

        if (!buf) {
            callback("Empty Buffer");
        }

        header = recvHeader(buf);
        buf = buf.slice(1, buf.length);

        len = recvLen(buf);
        buf = buf.slice(1, buf.length);

        commandID = recvCommandID(buf);
        buf = buf.slice(1, buf.length);

        command = recvCommand(buf);
        buf = buf.slice(1, buf.length);

        if (command === "IR_TH_DATA") {
            const data: Record<string, number> = {};
            data.temp = buf.slice(0, 2).readUInt16LE(0) / 100.0;
            buf = buf.slice(2, buf.length);
            data.hum = buf.slice(0, 2).readUInt16LE(0) / 100.0;
            callback(undefined, command, data);
            return;
        }

        callback(undefined, command, buf);
    }

/*
    private discoverDevice() {
        if (this.scanning) {
            return;
        }
        console.log("Start scanning.");
        noble.startScanning();
        setInterval(() => {
            noble.stopScanning();
        }, 10000);
    }
*/

    private readDeviceInfoHandler(peripheral: Noble.Peripheral) {
        if (!peripheral) {
            console.log(`ERROR: Cannot find Meizu BLE IR gadget(${this.mac})`);
        } else {
            peripheral.once("disconnect", () => {
                this.connected = false;
            })
            peripheral.once("connect", () => {
                this.connected = true;
            })
            peripheral.connect(() => {
                peripheral.discoverAllServicesAndCharacteristics((err, services) => {
                    if (err) {
                        console.log(`ERROR: ${err}`);
                        return;
                    }
                    for (let i = 0; i < services.length; i++) {
                        const service = services[i];
                        if (service.name === "Device Information") {
                            for (let j = 0; j < service.characteristics.length; j++) {
                                const char = service.characteristics[j];
                                if (char.name === "Manufacturer Name String") {
                                    char.read((err, data) => {
                                        if (err) {
                                            console.log(`Read ${char.name} error: ${err}`);
                                        } else {
                                            this.manufacturer = data.toString();
                                        }
                                    });
                                }
                                if (char.name === "Model Number String") {
                                    char.read((err, data) => {
                                        if (err) {
                                            console.log(`Read ${char.name} error: ${err}`);
                                        } else {
                                            this.model = data.toString();
                                        }
                                    });
                                }
                                if (char.name === "Firmware Revision String") {
                                    char.read((err, data) => {
                                        if (err) {
                                            console.log(`Read ${char.name} error: ${err}`);
                                        } else {
                                            this.firmwareRevision = data.toString();
                                        }
                                    });
                                }
                                if (char.name === "Software Revision String") {
                                    char.read((err, data) => {
                                        if (err) {
                                            console.log(`Read ${char.name} error: ${err}`);
                                        } else {
                                            this.softwareRevision = data.toString();
                                        }
                                    });
                                }
                            }
                        }
                    }
                })
            })
        }
    }

    private readDeviceInfo() {
        if (!this.mzirPeripheral) {
            console.log("ERROR: Device not discovered yet.")
            return;
        }
        this.readDeviceInfoHandler(this.mzirPeripheral);
    }

    private readTHDataHandler(peripheral: Noble.Peripheral) {
        if (!peripheral) {
            console.log(`ERROR: Cannot find Meizu BLE IR gadget(${this.mac})`);
        } else {
            peripheral.on("disconnect", () => {
                this.connected = false;
            })
            peripheral.on("connect", () => {
                this.connected = true;
            })
            peripheral.connect(() => {
                peripheral.discoverAllServicesAndCharacteristics((err, services) => {
                    if (err) {
                        console.log(`ERROR: ${err}`);
                        return;
                    }
                    for (let i = 0; i < services.length; i++) {
                        const service = services[i];
                        if (service.uuid === "16f0") {
                            for (let j = 0; j < service.characteristics.length; j++) {
                                const char = service.characteristics[j];
                                if (char.uuid === "16f2") {
                                    // VIP
                                    char.read((err, buff: Buffer) => {
                                        if (err) {
                                            console.log(`ERROR: Read ${char.name} error: ${err}`);
                                        } else {
                                            this.recvData(buff, (err, command, data) => {
                                                if (err) {
                                                    console.log(`ERROR: Read Invalid data: ${err}`);
                                                } else {
                                                    if ((command === "IR_TH_DATA") && data) {
                                                        this.temp = data.temp;
                                                        this.hum = data.hum;
                                                        this.newDataEvent.emit("data");
                                                    }
                                                }
                                            })
                                        }
                                    })
                                }
                            }
                        }
                    }
                })
            })
        }
    }

    private readData(type: "TH", callback: () => void) {
        if (!this.mzirPeripheral) {
            console.log("ERROR: Device not discovered yet.")
            return;
        }
        if (type === "TH") {
            this.newDataEvent.once("data", callback)
            this.readTHDataHandler(this.mzirPeripheral);
        }
    }

    private readDataAsync(type: "TH") {
        return new Promise((resolve, reject) => {
            this.readData(type, () => {
                resolve();
            });
        });
    }

    public async temperature() {
        await this.readDataAsync("TH");
        return this.temp;
    }

    public async humidity() {
        await this.readDataAsync("TH");
        return this.hum;
    }
}