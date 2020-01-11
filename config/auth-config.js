var assert = require('assert');
const fs = require('fs');
const log = require('../libraries/logging.js');

log.procedure("Loading Configuration Files");

var configs = [
    {
        human_name: "Database",
        key_name: 'dbconfig',
        type: "Config File",
        isJSON: true,
        assertHas: ['authentication', 'data'],
        file: "./config/db-connection.json"
    }

];

var exp = {};
// Fetch All Listed Configs
configs.forEach((cfg)=>{
    exp[cfg.key_name] = getConfigItem(cfg);
    if(cfg.isJSON){
        // Check Assertions
        cfg.assertHas.forEach((asrt)=>{
        assert( asrt in exp[cfg.key_name], "Config Item: " + cfg.human_name + " " + cfg.type + " Lacks " + asrt + " key");
        })
    }
});

function getConfigItem(configObj){
    log.info("Load Config: " + configObj.human_name);
    if( fs.existsSync(configObj.file) ){
        // File Exists
        try {
        var res = null;
        if(configObj.isJSON){
            res = JSON.parse(fs.readFileSync(configObj.file));
        }else{
            res = fs.readFileSync(configObj.file);
        }
        // Load Success
        return res;
        } catch (error) {
        // Load Failed
        log.critical("Unable To Load " + configObj.human_name + " " + configObj.type);
        console.log(error);
        throw new Error("FAILED TO LOAD " + configObj.human_name + " " + configObj.type + ": FILE EXISTS - ERROR DURRING READ");
        }
    }else{
        // File Does Not Exist
        log.critical("Unable To Find " + configObj.human_name + " " + configObj.type);
        throw new Error("FAILED TO LOAD " + configObj.human_name + " " + configObj.type + ": EXPECTING JSON FILE " + configObj.file);
    }
}
  
  module.exports = exp;