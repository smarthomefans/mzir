"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var noble = __importStar(require("noble"));
var Mzir = /** @class */ (function () {
    function Mzir(mac) {
        this.id = "";
        this.uuid = "";
        this.manufacturer = "";
        this.model = "";
        this.firmwareRevision = "";
        this.softwareRevision = "";
        this.connected = false;
        this.temp = 0;
        this.hum = 0;
        this.mac = mac;
        setImmediate(this.discoverDevice);
    }
    Mzir.prototype.recvData = function (buf, callback) {
        var header;
        var len;
        var commandID;
        var command;
        function recvHeader(b) {
            if (!b || b.length < 1) {
                callback("NO Header.");
                return 0;
            }
            var data = b.slice(0, 1).readUInt8(0);
            if (data != 0x55) {
                callback("Invalid Header.");
                return 0;
            }
            return data;
        }
        function recvLen(b) {
            if (!b || b.length < 1) {
                callback("NO Len.");
                return 0;
            }
            return b.slice(0, 1).readUInt8(0);
        }
        function recvCommandID(b) {
            if (!b || b.length < 1) {
                callback("NO CommandID.");
                return 0;
            }
            return b.slice(0, 1).readUInt8(0);
        }
        function recvCommand(b) {
            if (!b || b.length < 1) {
                callback("NO Command.");
                return "";
            }
            var data = b.slice(0, 1).readUInt8(0);
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
        console.log("len=" + len + ", commandID=" + commandID + ", command=" + command);
        if (command === "IR_TH_DATA") {
            var data = {};
            data.temp = buf.slice(0, 2).readUInt16LE(0) / 100.0;
            buf = buf.slice(2, buf.length);
            data.hum = buf.slice(0, 2).readUInt16LE(0) / 100.0;
            callback(undefined, command, data);
            return;
        }
        callback(undefined, command, buf);
    };
    Mzir.prototype.canStopScan = function () {
        return ((this.manufacturer != "") && (this.model != "") &&
            (this.firmwareRevision != "") && (this.softwareRevision != ""));
    };
    ;
    Mzir.prototype.discoverDevice = function (callback) {
        var _this = this;
        noble.on("scanStop", function () {
            if (_this.id === "") {
                console.log("Can not discover Meizu BLE IR gadget(" + _this.mac + ")");
                callback && callback(null);
            }
            else {
                console.log("Found Meizu BLE IR gadget(" + _this.mac + "), ID=" + _this.id);
            }
        });
        noble.on("discover", function (peripheral) {
            if (peripheral.address && (peripheral.address === _this.mac)) {
                _this.id = peripheral.id;
                _this.uuid = peripheral.uuid;
                noble.stopScanning();
                callback && callback(peripheral);
            }
            if (peripheral.id && (peripheral.id === _this.id)) {
                // Already discovered device.
                noble.stopScanning();
                callback && callback(peripheral);
            }
            else {
                // Mac address is not set or can not read Mac address.
                if (peripheral.connectable) {
                    peripheral.connect(function () {
                        peripheral.discoverAllServicesAndCharacteristics(function (err, services) {
                            if (err) {
                                console.log("ERROR: " + err);
                                return;
                            }
                            for (var i = 0; i < services.length; i++) {
                                var service = services[i];
                                if (service.name === "Device Information") {
                                    var _loop_1 = function (j) {
                                        var char = service.characteristics[j];
                                        if (char.name === "Manufacturer Name String") {
                                            char.read(function (err, data) {
                                                if (err) {
                                                    console.log("Read " + char.name + " error: " + err);
                                                }
                                                else {
                                                    if (data.toString() === "Meizu") {
                                                        _this.manufacturer = data.toString();
                                                        if (_this.model !== "") {
                                                            _this.connected = true;
                                                            peripheral.on("disconnect", function () {
                                                                _this.connected = false;
                                                            });
                                                            _this.id = peripheral.id;
                                                            _this.uuid = peripheral.uuid;
                                                        }
                                                        if (_this.canStopScan()) {
                                                            noble.stopScanning();
                                                            callback && callback(peripheral);
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                        if (char.name === "Model Number String") {
                                            char.read(function (err, data) {
                                                if (err) {
                                                    console.log("Read " + char.name + " error: " + err);
                                                }
                                                else {
                                                    if (data.toString() === "R16") {
                                                        _this.model = data.toString();
                                                        if (_this.manufacturer !== "") {
                                                            _this.connected = true;
                                                            peripheral.on("disconnect", function () {
                                                                _this.connected = false;
                                                            });
                                                            _this.id = peripheral.id;
                                                            _this.uuid = peripheral.uuid;
                                                        }
                                                        if (_this.canStopScan()) {
                                                            noble.stopScanning();
                                                            callback && callback(peripheral);
                                                        }
                                                    }
                                                }
                                            });
                                        }
                                        if (char.name === "Firmware Revision String") {
                                            char.read(function (err, data) {
                                                if (err) {
                                                    console.log("Read " + char.name + " error: " + err);
                                                }
                                                else {
                                                    _this.firmwareRevision = data.toString();
                                                    if (_this.canStopScan()) {
                                                        noble.stopScanning();
                                                        callback && callback(peripheral);
                                                    }
                                                }
                                            });
                                        }
                                        if (char.name === "Software Revision String") {
                                            char.read(function (err, data) {
                                                if (err) {
                                                    console.log("Read " + char.name + " error: " + err);
                                                }
                                                else {
                                                    _this.softwareRevision = data.toString();
                                                    if (_this.canStopScan()) {
                                                        noble.stopScanning();
                                                        callback && callback(peripheral);
                                                    }
                                                }
                                            });
                                        }
                                    };
                                    for (var j = 0; j < service.characteristics.length; j++) {
                                        _loop_1(j);
                                    }
                                }
                            }
                        });
                    });
                }
            }
        });
        noble.startScanning();
        setInterval(function () {
            noble.stopScanning();
        }, 10000);
    };
    Mzir.prototype.readData = function (type, callback) {
        var _this = this;
        if (type === "TH") {
            this.discoverDevice(function (peripheral) {
                if (!peripheral) {
                    callback("ERROR: Cannot find Meizu BLE IR gadget(" + _this.mac + ")");
                }
                else {
                    if (!_this.connected) {
                        peripheral.on("disconnect", function () {
                            _this.connected = false;
                        });
                        peripheral.on("connect", function () {
                            _this.connected = true;
                        });
                        peripheral.connect(function () {
                            peripheral.discoverAllServicesAndCharacteristics(function (err, services) {
                                if (err) {
                                    callback("ERROR: " + err);
                                    return;
                                }
                                for (var i = 0; i < services.length; i++) {
                                    var service = services[i];
                                    if (service.uuid === "16f0") {
                                        var _loop_2 = function (j) {
                                            var char = service.characteristics[j];
                                            if (char.uuid === "16f2") {
                                                // VIP
                                                char.read(function (err, buff) {
                                                    if (err) {
                                                        callback("Read " + char.name + " error: " + err);
                                                    }
                                                    else {
                                                        _this.recvData(buff, function (err, command, data) {
                                                            if (err) {
                                                                callback("ERROR: Read Invalid data: " + err);
                                                            }
                                                            else {
                                                                if ((command === "IR_TH_DATA") && data) {
                                                                    _this.temp = data.temp;
                                                                    _this.hum = data.hum;
                                                                    callback();
                                                                }
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        };
                                        for (var j = 0; j < service.characteristics.length; j++) {
                                            _loop_2(j);
                                        }
                                    }
                                }
                            });
                        });
                    }
                    else {
                        peripheral.discoverAllServicesAndCharacteristics(function (err, services) {
                            if (err) {
                                callback("ERROR: " + err);
                                return;
                            }
                            for (var i = 0; i < services.length; i++) {
                                var service = services[i];
                                if (service.uuid === "16f0") {
                                    var _loop_3 = function (j) {
                                        var char = service.characteristics[j];
                                        if (char.uuid === "16f2") {
                                            // VIP
                                            char.read(function (err, buff) {
                                                if (err) {
                                                    callback("Read " + char.name + " error: " + err);
                                                }
                                                else {
                                                    _this.recvData(buff, function (err, command, data) {
                                                        if (err) {
                                                            callback("ERROR: Read Invalid data: " + err);
                                                        }
                                                        else {
                                                            if ((command === "IR_TH_DATA") && data) {
                                                                _this.temp = data.temp;
                                                                _this.hum = data.hum;
                                                                callback();
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    };
                                    for (var j = 0; j < service.characteristics.length; j++) {
                                        _loop_3(j);
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
    };
    Mzir.prototype.readDataAsync = function (type) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.readData(type, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    };
    Mzir.prototype.temperature = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.readDataAsync("TH")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.temp];
                }
            });
        });
    };
    Mzir.prototype.humidity = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.readDataAsync("TH")];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.hum];
                }
            });
        });
    };
    return Mzir;
}());
exports.Mzir = Mzir;
