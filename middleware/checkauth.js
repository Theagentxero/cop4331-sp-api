// Libraries
const log = require('../libraries/logging.js');

function checkHeaderAuth (req, res, next) {
    //console.log("Router Got Something")
    // Check if user has bearer authentication
    if(req.headers['x-apitoken']){
        // Verify The JWT Given
        jwt.verify(req.headers['x-apitoken'], config.public, { algorithms: ['RS256'], audience: 'localhost', issuer: 'PORTALAUTH'}, function(err, payload){
            if(err){
                console.log(err);
                res.status(401).send("Valid API Token Must Be Included As Header X-ApiToken");
            }else{
                //Do Authorization Stuff Here, Create A Some Permissions Object and Pass it Though Via The Req object.
                //console.log(payload);
                req.user = {
                    id: payload.id,
                    account: payload.account
                };
                //console.log('User Appears Authorized')
                //console.log(req.user);
                next();
            }
        });   
    }else{
        // Request Does Not Have JWT On Correct Header
        res.status(401).send("Valid API Token Must Be Included As Header X-ApiToken");
    }  
};

function checkCookieAuth (req, res, next) {
    // Check if request has cookies at all
    if(req.cookies){
        log.info("Cookies Found")
        //console.log(req.cookies);
        next();
    }else{
        // Request Does Not Have JWT On Correct Header
        next();
    }  
};

module.exports = checkCookieAuth;