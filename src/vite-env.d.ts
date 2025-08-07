/// <reference types="vite/client" />

declare global {
  interface Window {
    jQuery?: any;
    $?: any;
    GetMFS100Info?: any;
    CaptureFinger?: any;
  }

  interface Navigator {
    usb?: {
      requestDevice(options?: USBDeviceRequestOptions): Promise<USBDevice>;
      getDevices(): Promise<USBDevice[]>;
    };
  }

  interface USBDevice {
    productName?: string;
    manufacturerName?: string;
    serialNumber?: string;
    vendorId: number;
    productId: number;
    configuration?: USBConfiguration;
    opened: boolean;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
  }

  interface USBConfiguration {
    configurationValue: number;
    interfaces: USBInterface[];
  }

  interface USBInterface {
    interfaceNumber: number;
    alternates: USBAlternateInterface[];
  }

  interface USBAlternateInterface {
    alternateSetting: number;
    endpoints: USBEndpoint[];
  }

  interface USBEndpoint {
    endpointNumber: number;
    direction: string;
    type: string;
  }

  interface USBDeviceRequestOptions {
    filters: Array<{
      vendorId?: number;
      productId?: number;
    }>;
  }

  interface USBInTransferResult {
    data?: DataView;
    status: string;
  }

  interface USBOutTransferResult {
    status: string;
  }
}

export {};