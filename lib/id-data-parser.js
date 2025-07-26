const xml2js = require('xml2js');

function idParser(xml){
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
        [rc.fronturl] = data.DeviceInformation.ImageInfo[0].ImageURL1;
        resolve(rc);
      } catch (parseError) {
        reject(new Error(`Failed to parse ID scanner response: ${parseError.message}`));
      }
    });
  });
}

module.exports = idParser;