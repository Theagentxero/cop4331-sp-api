// Libraries
const log = require('../libraries/logging.js');
const _ = require('underscore');
const jwt = require('jsonwebtoken');
const config = require('../config/auth-config.js');


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
    if(_.has(req.cookies,"jwt")){
        console.log("Found JWT Cookie")
        jwt.verify(req.cookies.jwt, config.jwtpublic, { algorithms: ['RS256'], audience: 'localhost', issuer: 'COP4331API'}, function(err, payload){
            if(err){
                console.log(err);
                res.status(401).send("Invalid Authentication Cookie"); 
            }else{
                req.user_id = payload.user_id;
                next();
            }
        });
    }else{
        console.log("No JWT Cookie Found")
        res.status(401).send("Missing Authentication Cookie"); 
    }
};

module.exports = checkCookieAuth;