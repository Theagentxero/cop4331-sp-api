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
  userID: String,
  favorite: Boolean,
  firstName : String,
  middleName: String,
  lastName: String,

  phoneNumbers : [{type: String, value: String}],

  emails : [{type: String, value: String}]
});

var Contact = mongoose.model('contact', contactSchema);


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

// getContact()
router.get('/contacts/all.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.id;


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


// addContact()
router.post('/contacs/add.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    // req contains the actual data user sent over...
    var userID = req.user.id;

    var formValues = req.body;
    // Validate Form Values
    var requiresOneOfTheFollowing = ["favorite","firstName","middleName","lastName","phoneNumbers","emails"];
    var containsMin = false;
    requiresOneOfTheFollowing.forEach((itm)=>{
        if(_.has(formValues,itm)){
            containsMin = true;
            break;
        }
    });
    if(!containsMin){
        result.addError("At Least One Field is Rrequired")
        result.setStatus(400);
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    // Setup Defaults For Value Where None Exist:
    // The Default Form Object
    var defaultObject = {
        favorite: null,
        firstName: null,
        middleName: null,
        lastName: null,
        phoneNumbers: [],
        emails: []
    };

    var formWithDefaults = _.defaults(formValues, defaultObject);

    // create model instance ...

    var cont = {
      userID: userID,
      favorite: formWithDefaults.favorite,
      firstName : formWithDefaults.firstName,
      middleName: formWithDefaults.middleName,
      lastName: formWithDefaults.lastName,
      phoneNumbers: formWithDefaults.phoneNumbers,
      email : formWithDefaults.emails,
    };

    // pssing in the cont
    var newContact = new Contact(cont)

    newContact.save(function (err, contact){
      if(err){
          result.setStatus(500);
          result.setPayload({});
          res.status(result.getStatus()).type('application/json').send(result.getPayload());
          timer.endTimer(result);
          return;

        }else{
          console.log("I saved it!"),
          result.setStatus(200);
          result.setPayload(contact);
          res.status(result.getStatus()).type('application/json').send(result.getPayload());
          timer.endTimer(result);
        }

    });
});

// searchContacts()
router.get('/contacts/search.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.id;

    Contact.find({userID: userID}, function(err, contacts){
        if(err){
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            result.setStatus(200);
            result.setPayload();
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});


router.get('/contacts/favorites.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.id;

    Contact.find({userID : userID}, {favorite : true} , function(err, contacts){
        if(err){
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }else{
            result.setStatus(200);
            result.setPayload(contacts);
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});


// Actual Endpoints - END


module.exports = router;
