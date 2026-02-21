import { InstrumentServiceImpl } from './InstrumentService';
import { InstrumentConfig, InstrumentDataType } from '../types';
import * as net from 'net';

// Mock serialport
jest.mock('serialport', () => {
  const EventEmitter = require('events');
  
  class MockSerialPort extends EventEmitter {
    public isOpen = false;
    private path: string;
    private baudRate: number;

    constructor(options: any) {
      super();
      this.path = options.path;
      this.baudRate = options.baudRate;
    }

    open(callback: (err?: Error) => void) {
      setTimeout(() => {
        this.isOpen = true;
        callback();
        this.emit('open');
      }, 10);
    }

    close(callback: (err?: Error) => void) {
      setTimeout(() => {
        this.isOpen = false;
        callback();
        this.emit('close');
      }, 10);
    }

    pipe(parser: any) {
      return parser;
    }

    write(data: any) {
      return true;
    }
  }

  return {
    SerialPort: MockSerialPort
  };
});

// Mock @serialport/parser-readline
jest.mock('@serialport/parser-readline', () => {
  const EventEmitter = require('events');
  
  class MockReadlineParser extends EventEmitter {
    constructor(options: any) {
      super();
    }
  }

  return {
    ReadlineParser: MockReadlineParser
  };
});

describe('InstrumentService - Physical Hardware Connections', () => {
  let service: InstrumentServiceImpl;

  beforeEach(() => {
    service = new InstrumentServiceImpl();
  });

  afterEach(async () => {
    await service.disconnect();
  });

  describe('Serial Port Connection', () => {
    it('should connect to serial port with NMEA0183', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should connect to serial port with NMEA2000', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea2000',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 250000,
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should connect to serial port with SeaTalk', async () => {
      const config: InstrumentConfig = {
        protocol: 'seatalk',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should disconnect from serial port', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);

      await service.disconnect();
      expect(service.getConnectionStatus()).toBe(false);
    });

    it('should use default baud rate if not specified', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });
  });

  describe('Network Socket Connection', () => {
    let mockServer: net.Server;
    let serverPort: number;

    beforeEach(done => {
      mockServer = net.createServer(socket => {
        // Echo server for testing
        socket.on('data', data => {
          socket.write(data);
        });
      });

      mockServer.listen(0, () => {
        const address = mockServer.address();
        serverPort = typeof address === 'object' && address ? address.port : 0;
        done();
      });
    });

    afterEach(done => {
      mockServer.close(() => done());
    });

    it('should connect to network socket with NMEA0183', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'network',
          host: 'localhost',
          port: serverPort
        },
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should connect to network socket with NMEA2000', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea2000',
        connection: {
          type: 'network',
          host: 'localhost',
          port: serverPort
        },
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should connect to network socket with SeaTalk', async () => {
      const config: InstrumentConfig = {
        protocol: 'seatalk',
        connection: {
          type: 'network',
          host: 'localhost',
          port: serverPort
        },
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should disconnect from network socket', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'network',
          host: 'localhost',
          port: serverPort
        },
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);

      await service.disconnect();
      expect(service.getConnectionStatus()).toBe(false);
    });

    it('should process NMEA0183 data from network', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'network',
          host: 'localhost',
          port: serverPort
        },
        useStub: false
      };

      const dataReceived: any[] = [];
      service.subscribe(null, data => {
        dataReceived.push(data);
      });

      await service.connect(config);

      // Simulate receiving NMEA0183 data
      const sentence = '$GPGGA,123519,4807.038,N,01131.000,E,1,08,0.9,545.4,M,46.9,M,,*47\r\n';
      service.processData(sentence, 'nmea0183');

      // Wait a bit for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(dataReceived.length).toBeGreaterThan(0);
    });
  });

  describe('Connection Error Handling', () => {
    it('should handle serial port connection failure', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: '/dev/nonexistent'
        },
        baudRate: 4800,
        useStub: false
      };

      // Mock the SerialPort to throw an error
      const originalSerialPort = require('serialport').SerialPort;
      require('serialport').SerialPort = class extends originalSerialPort {
        open(callback: (err?: Error) => void) {
          callback(new Error('Port not found'));
        }
      };

      await expect(service.connect(config)).rejects.toThrow();
      expect(service.getConnectionStatus()).toBe(false);
    });

    it('should handle network connection failure', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'network',
          host: 'localhost',
          port: 99999 // Invalid port
        },
        useStub: false
      };

      await expect(service.connect(config)).rejects.toThrow();
    });
  });

  describe('Connection State Management', () => {
    it('should disconnect before reconnecting', async () => {
      const config1: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      await service.connect(config1);
      expect(service.getConnectionStatus()).toBe(true);

      const config2: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM4'
        },
        baudRate: 4800,
        useStub: false
      };

      await service.connect(config2);
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should report connection status correctly', async () => {
      expect(service.getConnectionStatus()).toBe(false);

      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);

      await service.disconnect();
      expect(service.getConnectionStatus()).toBe(false);
    });
  });

  describe('Stub Mode vs Physical Mode', () => {
    it('should use stub mode when useStub is true', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: true
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
      expect(service.isStubEnabled()).toBe(true);
    });

    it('should use physical connection when useStub is false', async () => {
      const config: InstrumentConfig = {
        protocol: 'nmea0183',
        connection: {
          type: 'serial',
          port: 'COM3'
        },
        baudRate: 4800,
        useStub: false
      };

      await service.connect(config);
      expect(service.getConnectionStatus()).toBe(true);
      expect(service.isStubEnabled()).toBe(false);
    });
  });
});
