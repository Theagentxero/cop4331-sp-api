// Modules
const fs = require('fs');
const express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
const _ = require('underscore');
var cors = require('cors');
var cookieParser = require('cookie-parser');
const validator = require('validator');
// Libraries
const log = require('../libraries/logging.js');
const resbuilder = require('../libraries/resultbuilder.js');
const db = require('../libraries/dbqueries.js');
// Congifiguration
const config = require('../config/auth-config.js');
// Middleware
const authVerification = require('../middleware/checkauth.js');

// Route Setup
// Express Middleware Setup
// var whitelist = ['http://crabrr.com', 'https://crabrr.com']
// var corsOptions = {
//   origin: function (origin, callback) {
//     if (whitelist.indexOf(origin) !== -1) {
//       callback(null, true)
//     } else {
//         console.log(origin);
//       callback(new Error('Not allowed by CORS'))
//     }
//   },
//   optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
// }
// router.use(cors(corsOptions));

// TEST USING cors with options object {origin: true}
var corsOptions = {
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    credentials: true,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
router.use(cors(corsOptions));
// router.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "https://crabrr.com"); // update to match the domain you will make the request from
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     res.header("Access-Control-Allow-Credentials", "true");
//     res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
//     if (req.method === "OPTIONS") {
//         return res.status(200).end();
//     }
//     next();
// });
router.use(cookieParser());

// DB Setup
const pool = new Pool( config.dbconfig.authentication );

// pool Setup
// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Utility Functions
function initializeRoute(req){
    var timer = new log.callTimer(req);
    var result = new resbuilder.RestResult();
    return {
        timer: timer,
        result: result
    }
}

// Actual Endpoints - START
router.post('/create.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);
    // Basic Validation
    if( !('username' in req.body) ){ 
        result.addError("MALFORMED REQUEST: Request Must Contain username");
        result.setStatus(400);
    }else{
        if( !validator.isEmail(req.body.username) ){
            result.addError("MALFORMED REQUEST: Username Must Be A Valid Email");
            result.setStatus(400);
        }
    }
    if( !('password' in req.body) ){ 
        result.addError("MALFORMED REQUEST: Request Must Contain password");
        result.setStatus(400); 
    }
    if( !('first_name' in req.body) ){ 
        result.addError("MALFORMED REQUEST: Request Must Contain first_name");
        result.setStatus(400);
    }
    if( !('last_name' in req.body) ){ 
        result.addError("MALFORMED REQUEST: Request Must Contain last_name");
        result.setStatus(400);
    }

    if( !result.hasErrors() ){
        bcrypt.hash( req.body.password, 10 ).then( async (hash) => {
            arguments.callee.displayName = "post-create-user";
            //Create Param
            var values = [req.body.first_name, req.body.last_name, req.body.username, req.body.username, hash];
            
            db.auth.createAccount(pool, values, successCallback, failureCallback);

            function successCallback(qres){
                // Create JWT
        
                // Create Cookie
        
                // Respond With OK And 200
                console.log(qres);
                var packed = {
                    info: "Create User Successfull"
                };
            
                result.setStatus(200);
                result.setPayload(packed);
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
            }
        
            function failureCallback(failure){
                console.log("DB Query Failed")
                if(failure.error){
                    console.log(failure.error.name);
                    //console.log(failure.error.message);
                    if(failure.error.constraint == 'unq_users_email_and_username')
                        console.log("User Already Exists");
                    result.setStatus(500);
                    result.addError("An Error Has Occured E100");
                    res.status(result.getStatus()).type('application/json').send(result.getPayload());
                    timer.endTimer(result);
                }else{
                    console.log(failure.result)
                    if(failure.result == "USERNAME ALREADY EXISTS"){
                        result.setStatus(403);
                        result.addError("Username Already Exists");
                        res.status(result.getStatus()).type('application/json').send(result.getPayload());
                        timer.endTimer(result);
                    }else{
                        result.setStatus(500);
                        result.addError("An Error Has Occured E100");
                        res.status(result.getStatus()).type('application/json').send(result.getPayload());
                        timer.endTimer(result);
                    }
                }
            }
        });
    }else{
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
    }

    
});

router.post('/login.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);
    // Basic Validation
    if( !('username' in req.body) ){ 
        result.addError("MALFORMED REQUEST: Request Must Contain username");
        result.setStatus(400);
    }else{
        if( !validator.isEmail(req.body.username) ){
            result.addError("MALFORMED REQUEST: Username Must Be A Valid Email");
            result.setStatus(400);
        }
    }
    if( !('password' in req.body) ){ 
        result.addError("MALFORMED REQUEST: Request Must Contain password");
        result.setStatus(400); 
    }

    if( !result.hasErrors() ){
        var values = [req.body.username];
            
        db.auth.getLogin(pool, values, successCallback, failureCallback);

        function successCallback(qres){
            //console.log(qres);
            //log.debug("Fetch User Returns: " + qres.rowCount);
            if(qres.rowCount == 0){
                // No Match Found For User ID
                result.setStatus(403);
                result.addError("User Not Found")
                result.addError("User Not Found - Detail: User may not exist, or may be disabled")
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
            }else if(qres.rowCount == 1){
                var userRow = qres.rows[0];
                
                bcrypt.compare(req.body.password, userRow.hash, (err, bres) => {
                    arguments.callee.displayName = "post-login-user";
                    if(err){
                        //Error
                        console.log(err);
                    }else if(bres){
                        //Matches, create JWT, Set Cookies, and Return
                        // JWT is Good For One Day, Cookie Is Good For One Day
                        var jwtOpts = {
                            expiresIn: 86400,
                            issuer: "COP4331API",
                            audience: ["localhost"],
                            algorithm: 'RS256'
                        };
                        var jwtPayload = {
                            user_id: userRow.id,
                            first_name: userRow.first_name, 
                            last_name: userRow.last_name
                        };
                        //TODO: Placeholder To Be Replaced With Actual Config Information
                        var userAcctConfig = {

                        };
                        var insecureSessionMgmtToken = (1000 * 60 * 60 * 24) + Date.now();
                        jwt.sign(jwtPayload, config.jwtprivate, jwtOpts, function(err, token){
                            if(err){
                                console.log(err);
                                result.setStatus(500);
                                result.addError("Error Durring JWT Creation")
                                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                                timer.endTimer(result);
                            }else{
                                result.setStatus(200);
                                // Set Some Cookies - Good For 24 Hrs
                                // Contains Info We Can Pull and Use With Javascript, Effectively Exactly The Contents of the JWT
                                res.cookie('userinfo', JSON.stringify(jwtPayload), { domain: 'crabrr.com', maxAge: 86400000, sameSite: false });
                                res.cookie('userinfo', JSON.stringify(jwtPayload), { domain: '.crabrr.com', maxAge: 86400000, sameSite: false });
                                res.cookie('userinfo', JSON.stringify(jwtPayload), { maxAge: 86400000, sameSite: false });
                                // Contains The Signed JWT - Cannot Be Pulled By Javascript
                                res.cookie('jwt', token, { domain: 'crabrr.com', maxAge: 86400000, httpOnly: true, sameSite: false });
                                res.cookie('jwt', token, { domain: '.crabrr.com', maxAge: 86400000, httpOnly: true, sameSite: false });
                                res.cookie('jwt', token, { domain: 'img.crabrr.com', maxAge: 86400000, httpOnly: true, sameSite: false });
                                res.cookie('jwt', token, { maxAge: 86400000, httpOnly: true, sameSite: false });
                                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                                timer.endTimer(result);
                            }
                            
                        });
                    }else{
                        //Does Not Match
                        result.setStatus(401);
                        result.addError("Authentication Failed")
                        res.status(result.getStatus()).type('application/json').send(result.getPayload());
                        timer.endTimer(result);
                    }
                });
            }else{ 
                // More Than One User Matches The User Name Entered
                result.setStatus(403);
                result.addError("User Invalid")
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
            }
        }
    
        function failureCallback(failure){
            console.log("DB Query Failed")
            if(failure.error){
                console.log(failure.error.name);
                //console.log(failure.error.message);
                if(failure.error.constraint == 'unq_users_email_and_username')
                    console.log("User Already Exists");
                result.setStatus(500);
                result.addError("An Error Has Occured E100");
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
            }else{
                console.log(failure.result)
                if(failure.result == "USERNAME ALREADY EXISTS"){
                    result.setStatus(403);
                    result.addError("Username Already Exists");
                    res.status(result.getStatus()).type('application/json').send(result.getPayload());
                    timer.endTimer(result);
                }else{
                    result.setStatus(500);
                    result.addError("An Error Has Occured E100");
                    res.status(result.getStatus()).type('application/json').send(result.getPayload());
                    timer.endTimer(result);
                }
            }
        }

    }else{
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
    }
});

router.get('/checkAuth.json', authVerification, function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);
    // Basic Validation
    result.setStatus(200);
    res.status(result.getStatus()).type('application/json').send(result.getPayload());
    timer.endTimer(result);

    
});

router.post('/apikey.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);
    // Basic Validation
    if( !('username' in req.body) ){ 
        result.addError("MALFORMED REQUEST: Request Must Contain username");
        result.setStatus(400);
    }else{
        if( !validator.isEmail(req.body.username) ){
            result.addError("MALFORMED REQUEST: Username Must Be A Valid Email");
            result.setStatus(400);
        }
    }
    if( !('password' in req.body) ){ 
        result.addError("MALFORMED REQUEST: Request Must Contain password");
        result.setStatus(400); 
    }

    if( !result.hasErrors() ){
        var values = [req.body.username];
            
        db.auth.getLogin(pool, values, successCallback, failureCallback);

        function successCallback(qres){
            //console.log(qres);
            //log.debug("Fetch User Returns: " + qres.rowCount);
            if(qres.rowCount == 0){
                // No Match Found For User ID
                result.setStatus(403);
                result.addError("User Not Found")
                result.addError("User Not Found - Detail: User may not exist, or may be disabled")
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
            }else if(qres.rowCount == 1){
                var userRow = qres.rows[0];
                
                bcrypt.compare(req.body.password, userRow.hash, (err, bres) => {
                    arguments.callee.displayName = "post-login-user";
                    if(err){
                        //Error
                        console.log(err);
                    }else if(bres){
                        //Matches, create JWT, Set Cookies, and Return
                        // JWT is Good For One Day, Cookie Is Good For One Day
                        var jwtOpts = {
                            expiresIn: 86400,
                            issuer: "COP4331API",
                            audience: ["localhost"],
                            algorithm: 'RS256'
                        };
                        var jwtPayload = {
                            user_id: userRow.id,
                            first_name: userRow.first_name, 
                            last_name: userRow.last_name
                        };
                        //TODO: Placeholder To Be Replaced With Actual Config Information
                        var userAcctConfig = {

                        };
                        var insecureSessionMgmtToken = (1000 * 60 * 60 * 24) + Date.now();
                        jwt.sign(jwtPayload, config.jwtprivate, jwtOpts, function(err, token){
                            if(err){
                                console.log(err);
                                result.setStatus(500);
                                result.addError("Error Durring JWT Creation")
                                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                                timer.endTimer(result);
                            }else{
                                result.setStatus(200);
                                result.setPayload({apikey: token});
                                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                                timer.endTimer(result);
                            }
                            
                        });
                    }else{
                        //Does Not Match
                        result.setStatus(401);
                        result.addError("Authentication Failed")
                        res.status(result.getStatus()).type('application/json').send(result.getPayload());
                        timer.endTimer(result);
                    }
                });
            }else{ 
                // More Than One User Matches The User Name Entered
                result.setStatus(403);
                result.addError("User Invalid")
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
            }
        }
    
        function failureCallback(failure){
            console.log("DB Query Failed")
            if(failure.error){
                console.log(failure.error.name);
                //console.log(failure.error.message);
                if(failure.error.constraint == 'unq_users_email_and_username')
                    console.log("User Already Exists");
                result.setStatus(500);
                result.addError("An Error Has Occured E100");
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
            }else{
                console.log(failure.result)
                if(failure.result == "USERNAME ALREADY EXISTS"){
                    result.setStatus(403);
                    result.addError("Username Already Exists");
                    res.status(result.getStatus()).type('application/json').send(result.getPayload());
                    timer.endTimer(result);
                }else{
                    result.setStatus(500);
                    result.addError("An Error Has Occured E100");
                    res.status(result.getStatus()).type('application/json').send(result.getPayload());
                    timer.endTimer(result);
                }
            }
        }

    }else{
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
    }
});

router.get('/logout.json', function(req, res){
    var {timer, result} = initializeRoute(req);

    result.setStatus(200);
    console.log(req.cookies);
    res.clearCookie('jwt', {domain: 'crabrr.com', path: '/'});
    res.clearCookie('jwt', {domain: '.crabrr.com', path: '/'});
    res.clearCookie('jwt', {domain: 'img.crabrr.com', path: '/'});
    res.clearCookie('userinfo', {domain: 'crabrr.com', path: '/'});
    res.clearCookie('userinfo', {domain: '.crabrr.com', path: '/'});
    res.clearCookie('userinfo', {path: '/'});
    //res.clearCookie('jwt', { path: '/' });
    //res.clearCookie('userinfo', { path: '/' });
    res.status(result.getStatus()).type('application/json').send(result.getPayload());
    timer.endTimer(result);

})
// Actual Endpoints - END




module.exports = router;