const fs = require('fs');
const path = require('path');
const http = require('http');
const checkParser = require('./check-data-parser');
const idParser = require('./id-data-parser');
const statusParser = require('./status-data-parser');

// Configuration from environment variables with defaults
const SCAN_URL = process.env.MAGTEK_SCAN_URL || '/Excella?DeviceScan';
const STATUS_URL = process.env.MAGTEK_STATUS_URL || '/Excella?DeviceInformation=DeviceStatus';
const DEFAULT_PORT = parseInt(process.env.MAGTEK_DEFAULT_PORT) || 80;
const REQUEST_TIMEOUT = parseInt(process.env.MAGTEK_REQUEST_TIMEOUT) || 30000;

const readCheckPayload = fs.readFileSync(path.join(__dirname,'readCheckPayload.xml'));
const readIDPayload = fs.readFileSync(path.join(__dirname,'readIDPayload.xml'));

class Scanner {
  constructor(server, port = DEFAULT_PORT){
    if (!server || typeof server !== 'string') {
      throw new Error('Server host is required and must be a string');
    }
    this.server = server;
    this.port = port;
  }

  async readStatus(){
    try {
      const rawData = await readFromScanner(this.server, this.port, STATUS_URL);
      const data = await statusParser(rawData);
      return data;
    } catch (error){
      throw new Error(`Failed to read status: ${error.message}`);
    }
  }

  async readID(includeImage = false){
    try {
      const rawData = await readScanner(this.server, this.port, SCAN_URL, readIDPayload);
      const data = await idParser(rawData);
      if (includeImage){
        data.imageRawData = await this.readImage(data.fronturl);
      } else {
        data.imageRawData = null;
      }
      return {
        frontimage: data.fronturl,
        imagedata:  data.imageRawData
      };
    } catch (error){
      throw new Error(`Failed to read ID: ${error.message}`);
    }
  }

  async readCheck(includeImages = false){
    try {
      const rawData = await readScanner(this.server, this.port, SCAN_URL, readCheckPayload);
      const data = await checkParser(rawData);
      if (includeImages){
        const images = await Promise.all([
          this.readImage(data.fronturl),
          this.readImage(data.backurl)
        ]);
        [data.frontImageRawData, data.backImageRawData] = images;
      } else {
        data.frontImageRawData = data.backImageRawData = null;
      }
      return {
        error:          !data.status || !data.decodestatus,
        routing:        data.routing,
        number:         data.number,
        account:        data.account,
        frontimage:     data.fronturl,
        backimage:      data.backurl,
        frontimagedata: data.frontImageRawData,
        backimagedata:  data.backImageRawData
      };
    } catch (error){
      throw new Error(`Failed to read check: ${error.message}`);
    }
  }

  async readImage(image){
    return readImage(this.server, this.port, image);
  }
}

function readImage(server, port, image){
  return new Promise((resolve, reject) => {
    const options = {
      hostname: server,
      port:     port,
      path:     image,
      method:   'GET',
      timeout:  REQUEST_TIMEOUT
    };
    let rawData = [];
    if (server.length > 0){
      const req = http.request(options, response => {
        response.on('data', chunk => {
          rawData.push(chunk);
        });
        response.on('end', () => {
          resolve(Buffer.concat(rawData));
        });
        response.on('error', error => {
          reject(error);
        });
      });

      req.on('error', e => {
        reject(e);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    } else {
      reject(new Error('Server not configured'));
    }
  });
}

// readFromScanner: to read using the GET method
function readFromScanner(server, port, url){
  return new Promise((resolve, reject) => {
    const options = {
      hostname: server,
      port:     port,
      path:     url,
      method:   'GET',
      timeout:  REQUEST_TIMEOUT,
      headers:  {
        'Accept': 'text/xml'
      }
    };
    let rawData = [];
    if (server.length > 0){
      const req = http.request(options, response => {
        response.on('data', chunk => {
          rawData.push(chunk);
        });
        response.on('end', () => {
          resolve(`${Buffer.concat(rawData)}`);
        });
        response.on('error', error => {
          reject(error);
        });
      });

      req.on('error', e => {
        console.log('Error:', e); // eslint-disable-line no-console
        reject(e);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    } else {
      reject(new Error('Server not configured'));
    }
  });
}

function readScanner(server, port, url, payload){
  return new Promise((resolve, reject) => {
    const options = {
      hostname: server,
      port:     port,
      path:     url,
      method:   'POST',
      headers:  {
        'Content-Type':   'text/xml',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: REQUEST_TIMEOUT
    };
    let returnData = '';
    if (server.length > 0){
      const req = http.request(options, response => {
        response.on('data', chunk => {
          returnData += chunk;
        });
        response.on('end', () => {
          resolve(returnData);
        });
        response.on('error', error => {
          reject(error);
        });
      });

      req.on('error', e => {
        reject(e);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(payload);
      req.end();
    } else {
      reject(new Error('Server not configured'));
    }
  });
}

module.exports = Scanner;