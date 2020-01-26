// Modules
const fs = require('fs');
const express = require('express');
var router = express.Router();
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
const _ = require('underscore');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var mongoose = require('mongoose');
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
router.use(cors());
router.use(cookieParser());
// Check For User Auth - If The request makes it past this point, it contains a valid authorization
router.use((req, res, next) => { return authVerification(req, res, next)});

// DB Setup
// Postgres Setup
const pool = new Pool( config.dbconfig.data );

// MongoDB Setup
mongoose.connect(config.dbconfig.mongoTest.connectionString, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
var mongo = mongoose.connection;

// Mongo DB Advanced Setup
// Listen For Errors And Alert
mongo.on('error', console.error.bind(console, 'connection error:'));
// Alert On Connection Success
mongo.once('open', function() {
  // we're connected!
  log.procedure("MongoDB Database Connected");
});

// Define A Schema
var Schema = mongoose.Schema;
var contactSchema = new Schema({
    userID: Object,
    favorite: Boolean,
    firstName: String,
    middleName: String,
    lastName: String,
    phoneNumbers: [{ type: String, value: String }],
    emails: [{ type: String, value: String }]
});

var Contact = mongoose.model('contact', contactSchema);

// var testContact = {
//     user_id: "27dfc525-f241-40d4-86ec-f982c43e89f0",
//     first_name: "Test",
//     last_name: "Test",
//     comments: [
//         {body: "I Made A Comment"}
//     ]
// }

// Contact.create(testContact, function(err, results){
//     if(err)
//     {
//         console.log(err)
//         log.critical("An Error Occured When Creating Stuff")
//     }

//     console.log(results);
//     var newID = results._id;

//     Contact.findById(newID).exec((err, res)=>{
//         if(err)
//             console.log(err);

//         console.log(res);
//     })
// })


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
router.get('/contacts.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.user.id;

    // Make Request to Mongo, Fetching Contacts for 'userID'
    // TODO: Fix this mongo lookup

    Contact.find({userID: userID}, function(err, contacts){
        if(err){
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            // So we need to do something about actually getting contacts from mongoDB
            // For some reaon this worked
            // Parse contact
            console.log(contacts);
            var x = {
                contacts: contacts
            };
            result.setStatus(200);
            result.setPayload(x);
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});


// getContact()
router.get('/contacts.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.user.id;


    Contact.find({userID: userID}, function(err, contacts){
        if(err){
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            // So we need to do something about actually getting contacts from mongoDB
            // For some reaon this worked
            // Parse contact
            console.log(contacts);
            var x = {
                contacts: contacts
            };
            result.setStatus(200);
            result.setPayload(x);
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});



// var contactSchema = new Schema({
      // userID: Object,
      // favorite: Boolean,
      // firstName: String,
      // middleName: String,
      // lastName: String,
      // phoneNumbers: [{ type: String, value: String }],
      // emails: [{ type: String, value: String }]
  // });


// addContact()
router.post('/contacts.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.user.id;

    Contact.post({
          userID: Object,
          favorite: Boolean,
          firstName: String,
          middleName: String,
          lastName: String,
          phoneNumbers: [{ type: String, value: String }],
          emails: [{ type: String, value: String }]
        }, function(err, contacts){
        if(err){
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            result.setStatus(200);
            result.setPayload({
              "success" : "true",
              "status" : "1",
              "msg" : "worked!",
            });
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});



// searchContacts()
router.post('/contacts.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.user.id;

    Contact.post({userID: userID}, function(err, contacts){
        if(err){
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            result.setStatus(200);
            result.setPayload(json.stringify(Contact.find({userID : userID})));
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});




// Actual Endpoints - END




module.exports = router;