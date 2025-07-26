const xml2js = require('xml2js');

function scannerParser(xml){
  return new Promise((resolve, reject) => {
    if (!xml || typeof xml !== 'string') {
      reject(new Error('Invalid XML input'));
      return;
    }

    const parser = new xml2js.Parser();
    parser.parseString(xml, (err, data) => {
      if (err) {
        reject(new Error(`XML parsing error: ${err.message}`));
        return;
      }

      try {
        const rc = {};
        rc.status = data.DeviceInformation.CommandStatus[0].ReturnMsg[0] === 'OK';
        [rc.statustext] = data.DeviceInformation.CommandStatus[0].ReturnMsg;
        [rc.fronturl] = data.DeviceInformation.ImageInfo[0].ImageURL1;
        [rc.backurl] = data.DeviceInformation.ImageInfo[0].ImageURL2;
        rc.decodestatus = data.DeviceInformation.DocInfo[0].MICRDecode[0] === 'OK';
        [rc.decodetext] = data.DeviceInformation.DocInfo[0].MICRDecode;
        [rc.routing] = data.DeviceInformation.DocInfo[0].MICRTransit;
        [rc.account] = data.DeviceInformation.DocInfo[0].MICRAcct;
        [rc.number] = data.DeviceInformation.DocInfo[0].MICRSerNum;
        resolve(rc);
      } catch (parseError) {
        reject(new Error(`Failed to parse scanner response: ${parseError.message}`));
      }
    });
  });
}

module.exports = scannerParser;