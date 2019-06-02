import * as noble from "noble";

export class Mzir {
    private mac: string;
    private id: string = "";
    private uuid: string = "";
    private manufacturer: string = "";
    private model: string = "";
    private firmwareRevision: string = "";
    private softwareRevision: string = "";
    private connected: boolean = false;
    private temp: number = 0;
    private hum: number = 0;

    public constructor(mac: string) {
        this.mac = mac;
        setImmediate(this.discoverDevice);
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

        console.log(`len=${len}, commandID=${commandID}, command=${command}`);

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

    private canStopScan() {
        return ((this.manufacturer != "") && (this.model != "") &&
            (this.firmwareRevision != "") && (this.softwareRevision != ""));
    };

    private discoverDevice(callback?: (peripheral: noble.Peripheral|null) => void) {
        noble.on("scanStop", () => {
            if (this.id === "") {
                console.log(`Can not discover Meizu BLE IR gadget(${this.mac})`);
                callback && callback(null);
            } else {
                console.log(`Found Meizu BLE IR gadget(${this.mac}), ID=${this.id}`);
            }
        });
        noble.on("discover", (peripheral: noble.Peripheral) => {
            if (peripheral.address && (peripheral.address === this.mac)) {
                this.id = peripheral.id;
                this.uuid = peripheral.uuid;
                noble.stopScanning();
                callback && callback(peripheral);
            } if (peripheral.id && (peripheral.id === this.id)) {
                // Already discovered device.
                noble.stopScanning();
                callback && callback(peripheral);
            } else {
                // Mac address is not set or can not read Mac address.
                if (peripheral.connectable) {
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
                                                    if (data.toString() === "Meizu") {
                                                        this.manufacturer = data.toString();
                                                        if (this.model !== "") {
                                                            this.connected = true;
                                                            peripheral.on("disconnect", () => {
                                                                this.connected = false;
                                                            })
                                                            this.id = peripheral.id;
                                                            this.uuid = peripheral.uuid;
                                                        }
                                                        if (this.canStopScan()) {
                                                            noble.stopScanning();
                                                            callback && callback(peripheral);
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                        if (char.name === "Model Number String") {
                                            char.read((err, data) => {
                                                if (err) {
                                                    console.log(`Read ${char.name} error: ${err}`);
                                                } else {
                                                    if (data.toString() === "R16") {
                                                        this.model = data.toString();
                                                        if (this.manufacturer !== "") {
                                                            this.connected = true;
                                                            peripheral.on("disconnect", () => {
                                                                this.connected = false;
                                                            })
                                                            this.id = peripheral.id;
                                                            this.uuid = peripheral.uuid;
                                                        }
                                                        if (this.canStopScan()) {
                                                            noble.stopScanning();
                                                            callback && callback(peripheral);
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                        if (char.name === "Firmware Revision String") {
                                            char.read((err, data) => {
                                                if (err) {
                                                    console.log(`Read ${char.name} error: ${err}`);
                                                } else {
                                                    this.firmwareRevision = data.toString();
                                                    if (this.canStopScan()) {
                                                        noble.stopScanning();
                                                        callback && callback(peripheral);
                                                    }
                                                }
                                            });
                                        }
                                        if (char.name === "Software Revision String") {
                                            char.read((err, data) => {
                                                if (err) {
                                                    console.log(`Read ${char.name} error: ${err}`);
                                                } else {
                                                    this.softwareRevision = data.toString();
                                                    if (this.canStopScan()) {
                                                        noble.stopScanning();
                                                        callback && callback(peripheral);
                                                    }
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
        });
        noble.startScanning();
        setInterval(() => {
            noble.stopScanning();
        }, 10000);
    }

    private readData(type: "TH", callback: (err?: string)=>void) {
        if (type === "TH") {
            this.discoverDevice((peripheral: noble.Peripheral|null) => {
                if (!peripheral) {
                    callback(`ERROR: Cannot find Meizu BLE IR gadget(${this.mac})`);
                } else {
                    if (!this.connected) {
                        peripheral.on("disconnect", () => {
                            this.connected = false;
                        })
                        peripheral.on("connect", () => {
                            this.connected = true;
                        })
                        peripheral.connect(() => {
                            peripheral.discoverAllServicesAndCharacteristics((err, services) => {
                                if (err) {
                                    callback(`ERROR: ${err}`);
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
                                                        callback(`Read ${char.name} error: ${err}`);
                                                    } else {
                                                        this.recvData(buff, (err, command, data) => {
                                                            if (err) {
                                                                callback(`ERROR: Read Invalid data: ${err}`);
                                                            } else {
                                                                if ((command === "IR_TH_DATA") && data) {
                                                                    this.temp = data.temp;
                                                                    this.hum = data.hum;
                                                                    callback();
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
                    } else {
                        peripheral.discoverAllServicesAndCharacteristics((err, services) => {
                            if (err) {
                                callback(`ERROR: ${err}`);
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
                                                    callback(`Read ${char.name} error: ${err}`);
                                                } else {
                                                    this.recvData(buff, (err, command, data) => {
                                                        if (err) {
                                                            callback(`ERROR: Read Invalid data: ${err}`);
                                                        } else {
                                                            if ((command === "IR_TH_DATA") && data) {
                                                                this.temp = data.temp;
                                                                this.hum = data.hum;
                                                                callback();
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
                    }
                }
            })
        }
    }

    private readDataAsync(type: "TH") {
        return new Promise((resolve, reject) => {
            this.readData(type, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
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