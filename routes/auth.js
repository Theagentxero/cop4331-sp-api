// Modules
const fs = require('fs');
const express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
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
// Route Setup
// Express Middleware Setup
router.use(cors());
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
            var pass = {
                username: req.body.username,
                passhash: hash,
                first_name: req.body.first_name,
                last_name: req.body.last_name, 
            };
            db.insert.createAccount(pool, values, successCallback, failureCallback);

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
// Actual Endpoints - END




module.exports = router;