import { Bluetooth, BluetoothDevice } from "webbluetooth";
import { EventDispatcher } from "./dispatcher";
declare global  {
    interface Navigator {
        bluetooth: any;
    }
}
/**
 * BluetoothLE Scan Filter Init interface
 */
export interface BluetoothLEScanFilterInit {
    /**
     * An array of service UUIDs to filter on
     */
    services?: Array<string | number>;
    /**
     * The device name to filter on
     */
    name?: string;
    /**
     * The device name prefix to filter on
     */
    namePrefix?: string;
}
/**
 * Secure Device Firmware Update class
 */
export declare class SecureDfu extends EventDispatcher {
    private crc32;
    private bluetooth;
    /**
     * DFU Service unique identifier
     */
    static SERVICE_UUID: number;
    /**
     * Log event
     * @event
     */
    static EVENT_LOG: string;
    /**
     * Progress event
     * @event
     */
    static EVENT_PROGRESS: string;
    private notifyFns;
    private controlChar;
    private packetChar;
    /**
     * Characteristic constructor
     * @param bluetooth A bluetooth instance
     * @param crc32 A CRC32 function
     */
    constructor(crc32: (data: Array<number> | Uint8Array, seed?: number) => number, bluetooth?: Bluetooth);
    private log(message);
    private progress(bytes);
    private connect(device);
    private gattConnect(device);
    private handleNotification(event);
    private sendOperation(characteristic, operation, buffer?);
    private sendControl(operation, buffer?);
    private transferInit(buffer);
    private transferFirmware(buffer);
    private transfer(buffer, type, selectType, createType);
    private transferObject(buffer, createType, maxSize, offset);
    private transferData(data, offset, start?);
    private checkCrc(buffer, crc);
    /**
     * Scans for a device to update
     * @param buttonLess Scans for all devices and will automatically call `setDfuMode`
     * @param filters Alternative filters to use when scanning
     * @returns Promise containing the device
     */
    requestDevice(buttonLess: boolean, filters: Array<BluetoothLEScanFilterInit>): Promise<BluetoothDevice>;
    /**
     * Sets the DFU mode of a device, preparing it for update
     * @param device The device to switch mode
     * @returns Promise containing the device if it is still on a valid state
     */
    setDfuMode(device: BluetoothDevice): Promise<BluetoothDevice>;
    /**
     * Updates a device
     * @param device The device to switch mode
     * @param init The initialisation packet to send
     * @param firmware The firmware to update
     * @returns Promise containing the device
     */
    update(device: BluetoothDevice, init: ArrayBuffer, firmware: ArrayBuffer): Promise<BluetoothDevice>;
}
