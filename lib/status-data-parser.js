const xml2js = require('xml2js');

function statusParser(xml){
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
        const [deviceStatus] = data.DeviceInformation.DeviceStatus;
        [rc.accessGuide] = deviceStatus.AccessGuide;
        [rc.autoFeeder] = deviceStatus.AutoFeeder;
        [rc.ink] = deviceStatus.Ink;
        [rc.lamp1] = deviceStatus.Lamp1;
        [rc.lamp2] = deviceStatus.Lamp2;
        [rc.manualFeeder] = deviceStatus.ManualFeeder;
        [rc.path] = deviceStatus.Path;
        [rc.printer] = deviceStatus.Printer;
        [rc.state] = deviceStatus.State;
        resolve(rc);
      } catch (parseError) {
        reject(new Error(`Failed to parse status response: ${parseError.message}`));
      }
    });
  });
}

module.exports = statusParser;