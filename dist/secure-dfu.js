!function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).SecureDfu=t()}}(function(){return function t(e,n,r){function i(s,c){if(!n[s]){if(!e[s]){var a="function"==typeof require&&require;if(!c&&a)return a(s,!0);if(o)return o(s,!0);var u=new Error("Cannot find module '"+s+"'");throw u.code="MODULE_NOT_FOUND",u}var f=n[s]={exports:{}};e[s][0].call(f.exports,function(t){var n=e[s][1][t];return i(n||t)},f,f.exports,t,e,n,r)}return n[s].exports}for(var o="function"==typeof require&&require,s=0;s<r.length;s++)i(r[s]);return i}({1:[function(t,e,n){"use strict";var r=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n])};return function(e,n){t(e,n);function r(){this.constructor=e}e.prototype=null===n?Object.create(n):(r.prototype=n.prototype,new r)}}();Object.defineProperty(n,"__esModule",{value:!0});var i=function(t){r(e,t);function e(){return null!==t&&t.apply(this,arguments)||this}return e.prototype.addEventListener=function(e,n){return t.prototype.addListener.call(this,e,n)},e.prototype.removeEventListener=function(e,n){return t.prototype.removeListener.call(this,e,n)},e.prototype.dispatchEvent=function(e,n){return t.prototype.emit.call(this,e,n)},e}(t("events").EventEmitter);n.EventDispatcher=i},{events:4}],2:[function(t,e,n){"use strict";var r=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n])};return function(e,n){t(e,n);function r(){this.constructor=e}e.prototype=null===n?Object.create(n):(r.prototype=n.prototype,new r)}}();Object.defineProperty(n,"__esModule",{value:!0});var i="8ec90001-f315-4f60-9fb8-838830daea50",o="8ec90002-f315-4f60-9fb8-838830daea50",s={BUTTON_COMMAND:[1],CREATE_COMMAND:[1,1],CREATE_DATA:[1,2],RECEIPT_NOTIFICATIONS:[2],CACULATE_CHECKSUM:[3],EXECUTE:[4],SELECT_COMMAND:[6,1],SELECT_DATA:[6,2],RESPONSE:[96,32]},c={0:"Invalid code",1:"Success",2:"Opcode not supported",3:"Invalid parameter",4:"Insufficient resources",5:"Invalid object",7:"Unsupported type",8:"Operation not permitted",10:"Operation failed",11:"Extended error"},a={0:"No error",1:"Invalid error code",2:"Wrong command format",3:"Unknown command",4:"Init command invalid",5:"Firmware version failure",6:"Hardware version failure",7:"Softdevice version failure",8:"Signature missing",9:"Wrong hash type",10:"Hash failed",11:"Wrong signature type",12:"Verification failed",13:"Insufficient space"},u=function(t){r(e,t);function e(e,n){var r=t.call(this)||this;return r.crc32=e,r.bluetooth=n,r.notifyFns={},r.controlChar=null,r.packetChar=null,!r.bluetooth&&window&&window.navigator&&window.navigator.bluetooth&&(r.bluetooth=navigator.bluetooth),r}return e.prototype.log=function(t){this.dispatchEvent(e.EVENT_LOG,{message:t})},e.prototype.progress=function(t){this.dispatchEvent(e.EVENT_PROGRESS,{object:"unknown",totalBytes:0,currentBytes:t})},e.prototype.connect=function(t){var e=this;return t.addEventListener("gattserverdisconnected",function(){e.notifyFns={},e.controlChar=null,e.packetChar=null}),this.gattConnect(t).then(function(t){if(e.log("found "+t.length+" characteristic(s)"),e.packetChar=t.find(function(t){return t.uuid===o}),!e.packetChar)throw new Error("Unable to find packet characteristic");if(e.log("found packet characteristic"),e.controlChar=t.find(function(t){return t.uuid===i}),!e.controlChar)throw new Error("Unable to find control characteristic");if(e.log("found control characteristic"),!e.controlChar.properties.notify&&!e.controlChar.properties.indicate)throw new Error("Control characteristic does not allow notifications");return e.controlChar.startNotifications()}).then(function(){return e.controlChar.addEventListener("characteristicvaluechanged",e.handleNotification.bind(e)),e.log("enabled control notifications"),t})},e.prototype.gattConnect=function(t){var n=this;return Promise.resolve().then(function(){return t.gatt.connected?t.gatt:t.gatt.connect()}).then(function(t){return n.log("connected to gatt server"),t.getPrimaryService(e.SERVICE_UUID).catch(function(){throw new Error("Unable to find DFU service")})}).then(function(t){return n.log("found DFU service"),t.getCharacteristics()})},e.prototype.handleNotification=function(t){var e=t.target.value;if(s.RESPONSE.indexOf(e.getUint8(0))<0)throw new Error("Unrecognised control characteristic response notification");var n=e.getUint8(1);if(this.notifyFns[n]){var r=e.getUint8(2),i=null;if(1===r){var o=new DataView(e.buffer,3);this.notifyFns[n].resolve(o)}else if(11===r){var u=e.getUint8(3);i="Error: "+a[u]}else i="Error: "+c[r];i&&(this.log("notify: "+i),this.notifyFns[n].reject(i)),delete this.notifyFns[n]}},e.prototype.sendOperation=function(t,e,n){var r=this;return new Promise(function(i,o){var s=e.length;n&&(s+=n.byteLength);var c=new Uint8Array(s);if(c.set(e),n){var a=new Uint8Array(n);c.set(a,e.length)}r.notifyFns[e[0]]={resolve:i,reject:o},t.writeValue(c)})},e.prototype.sendControl=function(t,e){return this.sendOperation(this.controlChar,t,e)},e.prototype.transferInit=function(t){return this.transfer(t,"init",s.SELECT_COMMAND,s.CREATE_COMMAND)},e.prototype.transferFirmware=function(t){return this.transfer(t,"firmware",s.SELECT_DATA,s.CREATE_DATA)},e.prototype.transfer=function(t,n,r,i){var o=this;return this.sendControl(r).then(function(r){var s=r.getUint32(0,!0),c=r.getUint32(4,!0),a=r.getInt32(8,!0);if("init"!==n||c!==t.byteLength||!o.checkCrc(t,a))return o.progress=function(r){o.dispatchEvent(e.EVENT_PROGRESS,{object:n,totalBytes:t.byteLength,currentBytes:r})},o.progress(0),o.transferObject(t,i,s,c);o.log("init packet already available, skipping transfer")})},e.prototype.transferObject=function(t,e,n,r){var i=this,o=r-r%n,c=Math.min(o+n,t.byteLength),a=new DataView(new ArrayBuffer(4));return a.setUint32(0,c-o,!0),this.sendControl(e,a.buffer).then(function(){var e=t.slice(o,c);return i.transferData(e,o)}).then(function(){return i.sendControl(s.CACULATE_CHECKSUM)}).then(function(e){var n=e.getInt32(4,!0),o=e.getUint32(0,!0),c=t.slice(0,o);if(i.checkCrc(c,n))return i.log("written "+o+" bytes"),r=o,i.sendControl(s.EXECUTE);i.log("object failed to validate")}).then(function(){if(c<t.byteLength)return i.transferObject(t,e,n,r);i.log("transfer complete")})},e.prototype.transferData=function(t,e,n){var r=this;n=n||0;var i=Math.min(n+20,t.byteLength),o=t.slice(n,i);return this.packetChar.writeValue(o).then(function(){if(r.progress(e+i),i<t.byteLength)return r.transferData(t,e,i)})},e.prototype.checkCrc=function(t,e){return this.crc32?e===this.crc32(new Uint8Array(t)):(this.log("crc32 not found, skipping CRC check"),!0)},e.prototype.requestDevice=function(t,n){var r=this;t||n||(n=[{services:[e.SERVICE_UUID]}]);var i={optionalServices:[e.SERVICE_UUID]};return n?i.filters=n:i.acceptAllDevices=!0,this.bluetooth.requestDevice(i).then(function(e){return t?r.setDfuMode(e):e})},e.prototype.setDfuMode=function(t){var e=this;return this.gattConnect(t).then(function(n){e.log("found "+n.length+" characteristic(s)");var r=n.find(function(t){return t.uuid===i}),c=n.find(function(t){return t.uuid===o});if(r&&c)return t;var a=n.find(function(t){return"8ec90003-f315-4f60-9fb8-838830daea50"===t.uuid});if(!a)throw new Error("Unsupported device");if(e.log("found buttonless characteristic"),!a.properties.notify&&!a.properties.indicate)throw new Error("Buttonless characteristic does not allow notifications");return new Promise(function(n,r){function i(){this.notifyFns={},n(null)}a.startNotifications().then(function(){return e.log("enabled buttonless notifications"),t.addEventListener("gattserverdisconnected",i.bind(e)),a.addEventListener("characteristicvaluechanged",e.handleNotification.bind(e)),e.sendOperation(a,s.BUTTON_COMMAND)}).then(function(){e.log("sent DFU mode"),i()})})})},e.prototype.update=function(t,e,n){var r=this;return new Promise(function(i,o){return t?e?n?void r.connect(t).then(function(){return r.log("transferring init"),r.transferInit(e)}).then(function(){return r.log("transferring firmware"),r.transferFirmware(n)}).then(function(){r.log("complete, disconnecting..."),t.addEventListener("gattserverdisconnected",function(){r.log("disconnected"),i(t)})}):o("Firmware not specified"):o("Init not specified"):o("Device not specified")})},e.SERVICE_UUID=65113,e.EVENT_LOG="log",e.EVENT_PROGRESS="progress",e}(t("./dispatcher").EventDispatcher);n.SecureDfu=u},{"./dispatcher":1}],3:[function(t,e,n){"use strict";var r=t("./secure-dfu");e.exports=r.SecureDfu},{"./secure-dfu":2}],4:[function(t,e,n){function r(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}e.exports=r,r.EventEmitter=r,r.prototype._events=void 0,r.prototype._maxListeners=void 0,r.defaultMaxListeners=10,r.prototype.setMaxListeners=function(t){if("number"!=typeof t||t<0||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},r.prototype.emit=function(t){var e,n,r,c,a,u;if(this._events||(this._events={}),"error"===t&&(!this._events.error||o(this._events.error)&&!this._events.error.length)){if((e=arguments[1])instanceof Error)throw e;var f=new Error('Uncaught, unspecified "error" event. ('+e+")");throw f.context=e,f}if(s(n=this._events[t]))return!1;if(i(n))switch(arguments.length){case 1:n.call(this);break;case 2:n.call(this,arguments[1]);break;case 3:n.call(this,arguments[1],arguments[2]);break;default:c=Array.prototype.slice.call(arguments,1),n.apply(this,c)}else if(o(n))for(c=Array.prototype.slice.call(arguments,1),r=(u=n.slice()).length,a=0;a<r;a++)u[a].apply(this,c);return!0},r.prototype.addListener=function(t,e){var n;if(!i(e))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,i(e.listener)?e.listener:e),this._events[t]?o(this._events[t])?this._events[t].push(e):this._events[t]=[this._events[t],e]:this._events[t]=e,o(this._events[t])&&!this._events[t].warned&&(n=s(this._maxListeners)?r.defaultMaxListeners:this._maxListeners)&&n>0&&this._events[t].length>n&&(this._events[t].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[t].length),"function"==typeof console.trace&&console.trace()),this},r.prototype.on=r.prototype.addListener,r.prototype.once=function(t,e){if(!i(e))throw TypeError("listener must be a function");var n=!1;function r(){this.removeListener(t,r),n||(n=!0,e.apply(this,arguments))}return r.listener=e,this.on(t,r),this},r.prototype.removeListener=function(t,e){var n,r,s,c;if(!i(e))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(s=(n=this._events[t]).length,r=-1,n===e||i(n.listener)&&n.listener===e)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,e);else if(o(n)){for(c=s;c-- >0;)if(n[c]===e||n[c].listener&&n[c].listener===e){r=c;break}if(r<0)return this;1===n.length?(n.length=0,delete this._events[t]):n.splice(r,1),this._events.removeListener&&this.emit("removeListener",t,e)}return this},r.prototype.removeAllListeners=function(t){var e,n;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(e in this._events)"removeListener"!==e&&this.removeAllListeners(e);return this.removeAllListeners("removeListener"),this._events={},this}if(i(n=this._events[t]))this.removeListener(t,n);else if(n)for(;n.length;)this.removeListener(t,n[n.length-1]);return delete this._events[t],this},r.prototype.listeners=function(t){return this._events&&this._events[t]?i(this._events[t])?[this._events[t]]:this._events[t].slice():[]},r.prototype.listenerCount=function(t){if(this._events){var e=this._events[t];if(i(e))return 1;if(e)return e.length}return 0},r.listenerCount=function(t,e){return t.listenerCount(e)};function i(t){return"function"==typeof t}function o(t){return"object"==typeof t&&null!==t}function s(t){return void 0===t}},{}]},{},[3])(3)});
//# sourceMappingURL=secure-dfu.js.map
