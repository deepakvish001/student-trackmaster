
/// <reference types="vite/client" />

// MFS100 SDK Global Functions
declare global {
  interface Window {
    GetMFS100Info: () => any;
    CaptureFinger: (quality: number, timeout: number) => any;
    VerifyFinger: (template1: string, template2: string) => any;
    GetMFS100List: () => any;
    DemoCapture: () => any;
    uninit: () => any;
    init: () => any;
  }
}

// jQuery type declarations
interface JQueryStatic {
  (selector: string): any;
  (element: Element): any;
  (callback: () => void): any;
}

// MFS100 SDK Response Types
interface MFS100Response {
  httpStaus: boolean;
  err?: string;
  data?: {
    ErrorCode: string;
    ErrorDescription: string;
    DeviceInfo?: {
      SerialNo: string;
      Make: string;
      Model: string;
      Certificate: string;
      Width: number;
      Height: number;
      LocalMac: string;
      LocalIP: string;
      SystemID: string;
      PublicIP: string;
    };
    Quality?: number;
    Nfiq?: number;
    InWidth?: number;
    InHeight?: number;
    BitmapData?: string;
    IsoTemplate?: string;
    AnsiTemplate?: string;
  };
}

// WebUSB API TypeScript declarations
declare global {
  interface Navigator {
    usb: USB;
  }

  interface USB {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
  }

  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
  }

  interface USBDevice {
    vendorId: number;
    productId: number;
    deviceClass: number;
    deviceSubclass: number;
    deviceProtocol: number;
    deviceVersionMajor: number;
    deviceVersionMinor: number;
    deviceVersionSubminor: number;
    manufacturerName?: string;
    productName?: string;
    serialNumber?: string;
    configuration?: USBConfiguration;
    configurations: USBConfiguration[];
    opened: boolean;
    
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
    controlTransferIn(setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult>;
    controlTransferOut(setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    clearHalt(direction: USBDirection, endpointNumber: number): Promise<void>;
    reset(): Promise<void>;
  }

  interface USBConfiguration {
    configurationValue: number;
    configurationName?: string;
    interfaces: USBInterface[];
  }

  interface USBInterface {
    interfaceNumber: number;
    alternate: USBAlternateInterface;
    alternates: USBAlternateInterface[];
    claimed: boolean;
  }

  interface USBAlternateInterface {
    alternateSetting: number;
    interfaceClass: number;
    interfaceSubclass: number;
    interfaceProtocol: number;
    interfaceName?: string;
    endpoints: USBEndpoint[];
  }

  interface USBEndpoint {
    endpointNumber: number;
    direction: USBDirection;
    type: USBEndpointType;
    packetSize: number;
  }

  type USBDirection = "in" | "out";
  type USBEndpointType = "bulk" | "interrupt" | "isochronous";

  interface USBControlTransferParameters {
    requestType: USBRequestType;
    recipient: USBRecipient;
    request: number;
    value: number;
    index: number;
  }

  type USBRequestType = "standard" | "class" | "vendor";
  type USBRecipient = "device" | "interface" | "endpoint" | "other";

  interface USBInTransferResult {
    data?: DataView;
    status: USBTransferStatus;
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: USBTransferStatus;
  }

  type USBTransferStatus = "ok" | "stall" | "babble";

  // Extended Window interface with MFS100 SDK and jQuery
  interface Window {
    jQuery?: JQueryStatic;
    $?: JQueryStatic;
    GetMFS100Info?: () => MFS100Response;
    CaptureFinger?: (quality: number, timeout: number) => MFS100Response;
  }
}

export {};
