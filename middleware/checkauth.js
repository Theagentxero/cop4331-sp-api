// Libraries
const log = require('../libraries/logging.js');
const _ = require('underscore');
const jwt = require('jsonwebtoken');
const config = require('../config/auth-config.js');
const { Pool } = require('pg');

const db = require('../libraries/dbqueries.js');

const pool = new Pool( config.dbconfig.authentication );
// pool Setup
// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});


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
                    id: payload.user_id
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
    if(_.has(req.query, 'apikey')){
        var apikey = req.query.apikey;
        console.log("Got API Key")
        console.log(apikey);
        db.auth.getAPIKey(pool, apikey, success, failure);
        function success(apiRes){
            console.log(apiRes);
            if(apiRes.rowCount > 0){
                req.user = {id: apiRes.rows[0].id};
                next();
            }else{
                res.status(401).send("Invalid API Key");  
            }
        }
        function failure(err){
            console.log(err);
            res.status(500).send("Could Not Authenticate With API Key");
        }
    }else if(req.get("X-ApiToken")){
        console.log("Found API Key In Header X-ApToken")
        jwt.verify(req.get("X-ApiToken"), config.jwtpublic, { algorithms: ['RS256'], audience: 'localhost', issuer: 'COP4331API'}, function(err, payload){
            if(err){
                console.log(err);
                res.status(401).send("Invalid Header X-ApiToken - Expired or Invalid"); 
            }else{
                req.user = {id: payload.user_id};
                next();
            }
        });
    }else if(_.has(req.cookies,"jwt")){
        console.log("Found JWT Cookie")
        jwt.verify(req.cookies.jwt, config.jwtpublic, { algorithms: ['RS256'], audience: 'localhost', issuer: 'COP4331API'}, function(err, payload){
            if(err){
                console.log(err);
                res.status(401).send("Invalid Authentication Cookie"); 
            }else{
                req.user = {id: payload.user_id};
                next();
            }
        });
    }else{
        console.log("No JWT Cookie Found And No API Key Found")
        res.status(401).send("Missing Authentication Cookie"); 
    }
};

module.exports = checkCookieAuth;