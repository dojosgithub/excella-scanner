const Scanner = require('../lib');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ServerMock = require('mock-http-server');
const cannedResponse = fs.readFileSync(path.join(__dirname,'xml.xml'),'utf-8');
const statusResponse = fs.readFileSync(path.join(__dirname,'status.xml'),'utf-8');

describe('test scanning a check', ()=>{
  let server = new ServerMock({host: 'localhost',port: 9000});
  beforeEach(done=>{
    server.start(done);
  });
  afterEach(done=>{
    server.stop(done);
  });
  it ('should scan a check',async function(){
    this.timeout(15000);
    server.on({
      method: 'POST',
      path:   '/Excella',
      reply:  {
        status:  200,
        headers: {'content-type': 'application/xml'},
        body:    cannedResponse
      },
      delay: 200
    });
    const scanner = new Scanner('localhost',9000);

    const data = await scanner.readCheck();
    assert.strictEqual(isNaN(data.routing),false);
    assert.strictEqual(data.account.length>1,true);
    assert.strictEqual(isNaN(data.number),false);
    assert.strictEqual(data.frontimage.length>10,true);
    assert.strictEqual(data.backimage.length>10,true);
  });

  it ('should scan a check and include the images',async function(){
    this.timeout(15000);
    server.on({
      method: 'POST',
      path:   '/Excella',
      reply:  {
        status:  200,
        headers: {'content-type': 'application/xml'},
        body:    cannedResponse
      },
      delay: 200
    });
    server.on({
      method: 'GET',
      path:   '*',
      reply:  {
        status: req=>{
          return fs.existsSync(path.join(__dirname,req.url))?200:404;
        },
        body: req=>{
          return fs.existsSync(path.join(__dirname,req.url))?fs.readFileSync(path.join(__dirname,req.url)):null;
        }
      }
    });
    const scanner = new Scanner('localhost',9000);

    const data = await scanner.readCheck(true);
    assert.strictEqual(isNaN(data.routing),false);
    assert.strictEqual(data.account.length>1,true);
    assert.strictEqual(isNaN(data.number),false);
    assert.strictEqual(data.frontimage.length>10,true);
    assert.strictEqual(data.backimage.length>10,true);
    assert.strictEqual(data.backimagedata.length>100,true);
  });

  it ('should scan a check and get the images independently',async function(){
    this.timeout(15000);
    server.on({
      method: 'POST',
      path:   '/Excella',
      reply:  {
        status:  200,
        headers: {'content-type': 'application/xml'},
        body:    cannedResponse
      },
      delay: 200
    });
    server.on({
      method: 'GET',
      path:   '*',
      reply:  {
        status: req=>{
          return fs.existsSync(path.join(__dirname,req.url))?200:404;
        },
        body: req=>{
          return fs.existsSync(path.join(__dirname,req.url))?fs.readFileSync(path.join(__dirname,req.url)):null;
        }
      }
    });
    const scanner = new Scanner('localhost',9000);

    const data = await scanner.readCheck();
    assert.strictEqual(isNaN(data.routing),false);
    assert.strictEqual(data.account.length>1,true);
    assert.strictEqual(isNaN(data.number),false);
    assert.strictEqual(data.frontimage.length>10,true);
    assert.strictEqual(data.backimage.length>10,true);

    const front = await scanner.readImage(data.frontimage);
    const back = await scanner.readImage(data.backimage);
    assert.strictEqual(front.length>10,true);
    assert.strictEqual(back.length>10,true);
  });


  it('should scan an id',function(done){
    this.timeout(15000);
    server.on({
      method: 'POST',
      path:   '/Excella',
      reply:  {
        status:  200,
        headers: {'content-type': 'application/xml'},
        body:    cannedResponse
      },
      delay: 200
    });
    const scanner = new Scanner('localhost',9000);
    scanner.readID().then(data=>{
      assert(data.frontimage.length>10);
      done();
    }).catch(err=>{
      //console.log('error:'+ err);
      done(err);
    });
  });
});

describe('test scanner status', ()=>{
  let server = new ServerMock({host: 'localhost',port: 9001});
  beforeEach(done=>{
    server.start(done);
  });
  afterEach(done=>{
    server.stop(done);
  });

  it('should read scanner status successfully', async function(){
    this.timeout(15000);
    server.on({
      method: 'GET',
      // path:   '/Excella?DeviceInformation=DeviceStatus',
      path:   '/Excella',
      reply:  {
        status:  200,
        headers: {'content-type': 'application/xml'},
        body:    statusResponse
      },
      delay: 200
    });
    const scanner = new Scanner('localhost',9001);

    const data = await scanner.readStatus();

    // Verify all expected status fields are present
    assert.strictEqual(typeof data.accessGuide, 'string');
    assert.strictEqual(typeof data.autoFeeder, 'string');
    assert.strictEqual(typeof data.ink, 'string');
    assert.strictEqual(typeof data.lamp1, 'string');
    assert.strictEqual(typeof data.lamp2, 'string');
    assert.strictEqual(typeof data.manualFeeder, 'string');
    assert.strictEqual(typeof data.path, 'string');
    assert.strictEqual(typeof data.printer, 'string');
    assert.strictEqual(typeof data.state, 'string');

    // Verify specific values from the test XML
    assert.strictEqual(data.accessGuide, 'LATCHED');
    assert.strictEqual(data.autoFeeder, 'EMPTY');
    assert.strictEqual(data.ink, 'OK');
    assert.strictEqual(data.lamp1, 'OK');
    assert.strictEqual(data.lamp2, 'OK');
    assert.strictEqual(data.manualFeeder, 'EMPTY');
    assert.strictEqual(data.path, 'OK');
    assert.strictEqual(data.printer, 'NONE');
    assert.strictEqual(data.state, 'ONLINE');
  });

  it('should handle server error responses', async function(){
    this.timeout(15000);
    server.on({
      method: 'GET',
      path:   '/Excella',
      reply:  {
        status:  500,
        headers: {'content-type': 'text/plain'},
        body:    'Internal Server Error'
      },
      delay: 200
    });
    const scanner = new Scanner('localhost',9001);

    try {
      await scanner.readStatus();
      assert.fail('Expected error to be thrown');
    } catch (error) {
      assert.strictEqual(error.message.includes('Failed to read status'), true);
    }
  });

  it('should handle invalid XML responses', async function(){
    this.timeout(15000);
    server.on({
      method: 'GET',
      path:   '/Excella',
      reply:  {
        status:  200,
        headers: {'content-type': 'application/xml'},
        body:    '<Invalid>XML</Invalid>'
      },
      delay: 200
    });
    const scanner = new Scanner('localhost',9001);

    try {
      await scanner.readStatus();
      assert.fail('Expected XML parsing error to be thrown');
    } catch (error) {
      assert.strictEqual(error.message.includes('Failed to read status'), true);
    }
  });

  it('should handle empty responses', async function(){
    this.timeout(15000);
    server.on({
      method: 'GET',
      path:   '/Excella',
      reply:  {
        status:  200,
        headers: {'content-type': 'application/xml'},
        body:    ''
      },
      delay: 200
    });
    const scanner = new Scanner('localhost',9001);

    try {
      await scanner.readStatus();
      assert.fail('Expected error for empty response');
    } catch (error) {
      assert.strictEqual(error.message.includes('Failed to read status'), true);
    }
  });

  it('should handle missing DeviceStatus in XML', async function(){
    this.timeout(15000);
    const incompleteXML = `<?xml version="1.0" encoding="utf-8"?>
<DeviceInformation>
  <CommandStatus>
    <ReturnMsg>OK</ReturnMsg>
  </CommandStatus>
</DeviceInformation>`;

    server.on({
      method: 'GET',
      path:   '/Excella',
      reply:  {
        status:  200,
        headers: {'content-type': 'application/xml'},
        body:    incompleteXML
      },
      delay: 200
    });
    const scanner = new Scanner('localhost',9001);

    try {
      await scanner.readStatus();
      assert.fail('Expected error for missing DeviceStatus');
    } catch (error) {
      assert.strictEqual(error.message.includes('Failed to read status'), true);
    }
  });
});