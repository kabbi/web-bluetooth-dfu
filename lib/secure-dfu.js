"use strict";
/*
* Web Bluetooth DFU
* Copyright (c) 2018 Rob Moran
*
* The MIT License (MIT)
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var dispatcher_1 = require("./dispatcher");
var CONTROL_UUID = "8ec90001-f315-4f60-9fb8-838830daea50";
var PACKET_UUID = "8ec90002-f315-4f60-9fb8-838830daea50";
var BUTTON_UUID = "8ec90003-f315-4f60-9fb8-838830daea50";
var LITTLE_ENDIAN = true;
var PACKET_SIZE = 20;
var OPERATIONS = {
    BUTTON_COMMAND: [0x01],
    CREATE_COMMAND: [0x01, 0x01],
    CREATE_DATA: [0x01, 0x02],
    RECEIPT_NOTIFICATIONS: [0x02],
    CACULATE_CHECKSUM: [0x03],
    EXECUTE: [0x04],
    SELECT_COMMAND: [0x06, 0x01],
    SELECT_DATA: [0x06, 0x02],
    RESPONSE: [0x60, 0x20]
};
var RESPONSE = {
    0x00: "Invalid code",
    0x01: "Success",
    0x02: "Opcode not supported",
    0x03: "Invalid parameter",
    0x04: "Insufficient resources",
    0x05: "Invalid object",
    0x07: "Unsupported type",
    0x08: "Operation not permitted",
    0x0A: "Operation failed",
    0x0B: "Extended error" // Extended error.
};
var EXTENDED_ERROR = {
    0x00: "No error",
    0x01: "Invalid error code",
    0x02: "Wrong command format",
    0x03: "Unknown command",
    0x04: "Init command invalid",
    0x05: "Firmware version failure",
    0x06: "Hardware version failure",
    0x07: "Softdevice version failure",
    0x08: "Signature missing",
    0x09: "Wrong hash type",
    0x0A: "Hash failed",
    0x0B: "Wrong signature type",
    0x0C: "Verification failed",
    0x0D: "Insufficient space" // The available space on the device is insufficient to hold the firmware.
};
/**
 * Secure Device Firmware Update class
 */
var SecureDfu = /** @class */ (function (_super) {
    __extends(SecureDfu, _super);
    /**
     * Characteristic constructor
     * @param bluetooth A bluetooth instance
     * @param crc32 A CRC32 function
     */
    function SecureDfu(crc32, bluetooth) {
        var _this = _super.call(this) || this;
        _this.crc32 = crc32;
        _this.bluetooth = bluetooth;
        _this.notifyFns = {};
        _this.controlChar = null;
        _this.packetChar = null;
        if (!_this.bluetooth && window && window.navigator && window.navigator.bluetooth) {
            _this.bluetooth = navigator.bluetooth;
        }
        return _this;
    }
    SecureDfu.prototype.log = function (message) {
        this.dispatchEvent(SecureDfu.EVENT_LOG, {
            message: message
        });
    };
    SecureDfu.prototype.progress = function (bytes) {
        this.dispatchEvent(SecureDfu.EVENT_PROGRESS, {
            object: "unknown",
            totalBytes: 0,
            currentBytes: bytes
        });
    };
    SecureDfu.prototype.connect = function (device) {
        var _this = this;
        device.addEventListener("gattserverdisconnected", function () {
            _this.controlChar = null;
            _this.packetChar = null;
        });
        return this.gattConnect(device)
            .then(function (characteristics) {
            _this.log("found " + characteristics.length + " characteristic(s)");
            _this.packetChar = characteristics.find(function (characteristic) {
                return (characteristic.uuid === PACKET_UUID);
            });
            if (!_this.packetChar)
                throw new Error("Unable to find packet characteristic");
            _this.log("found packet characteristic");
            _this.controlChar = characteristics.find(function (characteristic) {
                return (characteristic.uuid === CONTROL_UUID);
            });
            if (!_this.controlChar)
                throw new Error("Unable to find control characteristic");
            _this.log("found control characteristic");
            if (!_this.controlChar.properties.notify && !_this.controlChar.properties.indicate) {
                throw new Error("Control characteristic does not allow notifications");
            }
            return _this.controlChar.startNotifications();
        })
            .then(function () {
            _this.controlChar.addEventListener("characteristicvaluechanged", _this.handleNotification.bind(_this));
            _this.log("enabled control notifications");
            return device;
        });
    };
    SecureDfu.prototype.gattConnect = function (device) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            if (device.gatt.connected)
                return device.gatt;
            return device.gatt.connect();
        })
            .then(function (server) {
            _this.log("connected to gatt server");
            return server.getPrimaryService(SecureDfu.SERVICE_UUID)
                .catch(function () {
                throw new Error("Unable to find DFU service");
            });
        })
            .then(function (service) {
            _this.log("found DFU service");
            return service.getCharacteristics();
        });
    };
    SecureDfu.prototype.handleNotification = function (event) {
        var view = event.target.value;
        if (OPERATIONS.RESPONSE.indexOf(view.getUint8(0)) < 0) {
            throw new Error("Unrecognised control characteristic response notification");
        }
        var operation = view.getUint8(1);
        if (this.notifyFns[operation]) {
            var result = view.getUint8(2);
            var error = null;
            if (result === 0x01) {
                var data = new DataView(view.buffer, 3);
                this.notifyFns[operation].resolve(data);
            }
            else if (result === 0x0B) {
                var code = view.getUint8(3);
                error = "Error: " + EXTENDED_ERROR[code];
            }
            else {
                error = "Error: " + RESPONSE[result];
            }
            if (error) {
                this.log("notify: " + error);
                this.notifyFns[operation].reject(error);
            }
            delete this.notifyFns[operation];
        }
    };
    SecureDfu.prototype.sendOperation = function (characteristic, operation, buffer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var size = operation.length;
            if (buffer)
                size += buffer.byteLength;
            var value = new Uint8Array(size);
            value.set(operation);
            if (buffer) {
                var data = new Uint8Array(buffer);
                value.set(data, operation.length);
            }
            _this.notifyFns[operation[0]] = {
                resolve: resolve,
                reject: reject
            };
            characteristic.writeValue(value);
        });
    };
    SecureDfu.prototype.sendControl = function (operation, buffer) {
        return this.sendOperation(this.controlChar, operation, buffer);
    };
    SecureDfu.prototype.transferInit = function (buffer) {
        return this.transfer(buffer, "init", OPERATIONS.SELECT_COMMAND, OPERATIONS.CREATE_COMMAND);
    };
    SecureDfu.prototype.transferFirmware = function (buffer) {
        return this.transfer(buffer, "firmware", OPERATIONS.SELECT_DATA, OPERATIONS.CREATE_DATA);
    };
    SecureDfu.prototype.transfer = function (buffer, type, selectType, createType) {
        var _this = this;
        return this.sendControl(selectType)
            .then(function (response) {
            var maxSize = response.getUint32(0, LITTLE_ENDIAN);
            var offset = response.getUint32(4, LITTLE_ENDIAN);
            var crc = response.getInt32(8, LITTLE_ENDIAN);
            if (type === "init" && offset === buffer.byteLength && _this.checkCrc(buffer, crc)) {
                _this.log("init packet already available, skipping transfer");
                return;
            }
            _this.progress = function (bytes) {
                _this.dispatchEvent(SecureDfu.EVENT_PROGRESS, {
                    object: type,
                    totalBytes: buffer.byteLength,
                    currentBytes: bytes
                });
            };
            _this.progress(0);
            return _this.transferObject(buffer, createType, maxSize, offset);
        });
    };
    SecureDfu.prototype.transferObject = function (buffer, createType, maxSize, offset) {
        var _this = this;
        var start = offset - offset % maxSize;
        var end = Math.min(start + maxSize, buffer.byteLength);
        var view = new DataView(new ArrayBuffer(4));
        view.setUint32(0, end - start, LITTLE_ENDIAN);
        return this.sendControl(createType, view.buffer)
            .then(function () {
            var data = buffer.slice(start, end);
            return _this.transferData(data, start);
        })
            .then(function () {
            return _this.sendControl(OPERATIONS.CACULATE_CHECKSUM);
        })
            .then(function (response) {
            var crc = response.getInt32(4, LITTLE_ENDIAN);
            var transferred = response.getUint32(0, LITTLE_ENDIAN);
            var data = buffer.slice(0, transferred);
            if (_this.checkCrc(data, crc)) {
                _this.log("written " + transferred + " bytes");
                offset = transferred;
                return _this.sendControl(OPERATIONS.EXECUTE);
            }
            else {
                _this.log("object failed to validate");
            }
        })
            .then(function () {
            if (end < buffer.byteLength) {
                return _this.transferObject(buffer, createType, maxSize, offset);
            }
            else {
                _this.log("transfer complete");
            }
        });
    };
    SecureDfu.prototype.transferData = function (data, offset, start) {
        var _this = this;
        start = start || 0;
        var end = Math.min(start + PACKET_SIZE, data.byteLength);
        var packet = data.slice(start, end);
        return this.packetChar.writeValue(packet)
            .then(function () {
            _this.progress(offset + end);
            if (end < data.byteLength) {
                return _this.transferData(data, offset, end);
            }
        });
    };
    SecureDfu.prototype.checkCrc = function (buffer, crc) {
        if (!this.crc32) {
            this.log("crc32 not found, skipping CRC check");
            return true;
        }
        return crc === this.crc32(new Uint8Array(buffer));
    };
    /**
     * Scans for a device to update
     * @param buttonLess Scans for all devices and will automatically call `setDfuMode`
     * @param filters Alternative filters to use when scanning
     * @returns Promise containing the device
     */
    SecureDfu.prototype.requestDevice = function (buttonLess, filters) {
        var _this = this;
        if (!buttonLess && !filters) {
            filters = [{ services: [SecureDfu.SERVICE_UUID] }];
        }
        var options = {
            optionalServices: [SecureDfu.SERVICE_UUID]
        };
        if (filters)
            options.filters = filters;
        else
            options.acceptAllDevices = true;
        return this.bluetooth.requestDevice(options)
            .then(function (device) {
            if (buttonLess) {
                return _this.setDfuMode(device);
            }
            return device;
        });
    };
    /**
     * Sets the DFU mode of a device, preparing it for update
     * @param device The device to switch mode
     * @returns Promise containing the device
     */
    SecureDfu.prototype.setDfuMode = function (device) {
        var _this = this;
        return this.gattConnect(device)
            .then(function (characteristics) {
            _this.log("found " + characteristics.length + " characteristic(s)");
            var controlChar = characteristics.find(function (characteristic) {
                return (characteristic.uuid === CONTROL_UUID);
            });
            var packetChar = characteristics.find(function (characteristic) {
                return (characteristic.uuid === PACKET_UUID);
            });
            if (controlChar && packetChar) {
                return device;
            }
            var buttonChar = characteristics.find(function (characteristic) {
                return (characteristic.uuid === BUTTON_UUID);
            });
            if (!buttonChar) {
                throw new Error("Unsupported device");
            }
            // Support buttonless devices
            _this.log("found buttonless characteristic");
            if (!buttonChar.properties.notify && !buttonChar.properties.indicate) {
                throw new Error("Buttonless characteristic does not allow notifications");
            }
            return buttonChar.startNotifications()
                .then(function () {
                _this.log("enabled buttonless notifications");
                buttonChar.addEventListener("characteristicvaluechanged", _this.handleNotification.bind(_this));
                return _this.sendOperation(buttonChar, OPERATIONS.BUTTON_COMMAND);
            })
                .then(function () {
                _this.log("sent dfu mode");
                return new Promise(function (resolve, _reject) {
                    device.addEventListener("gattserverdisconnected", function () {
                        resolve(device);
                    });
                });
            });
        });
    };
    /**
     * Updates a device
     * @param device The device to switch mode
     * @param init The initialisation packet to send
     * @param firmware The firmware to update
     * @returns Promise containing the device
     */
    SecureDfu.prototype.update = function (device, init, firmware) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (!device)
                return reject("Device not specified");
            if (!init)
                return reject("Init not specified");
            if (!firmware)
                return reject("Firmware not specified");
            _this.connect(device)
                .then(function () {
                _this.log("transferring init");
                return _this.transferInit(init);
            })
                .then(function () {
                _this.log("transferring firmware");
                return _this.transferFirmware(firmware);
            })
                .then(function () {
                _this.log("complete, disconnecting...");
                device.addEventListener("gattserverdisconnected", function () {
                    _this.log("disconnected");
                    resolve(device);
                });
            });
        });
    };
    /**
     * DFU Service unique identifier
     */
    SecureDfu.SERVICE_UUID = 0xFE59;
    /**
     * Log event
     * @event
     */
    SecureDfu.EVENT_LOG = "log";
    /**
     * Progress event
     * @event
     */
    SecureDfu.EVENT_PROGRESS = "progress";
    return SecureDfu;
}(dispatcher_1.EventDispatcher));
exports.SecureDfu = SecureDfu;

//# sourceMappingURL=secure-dfu.js.map