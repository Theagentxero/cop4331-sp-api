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
var mongodb = require('mongodb');

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
    phoneNumbers : [{name: String, value: String}],
    emails : [{name: String, value: String}]
});

var Contact = mongoose.model('contacts', contactSchema);


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

// Get all contacts
router.get('/contacts', function (req, res) {
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
            result.setStatus(200);
            result.setPayload(contacts);
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});

// Searching through contacts
router.get('/contacts/search', function (req, res) {

    /*
    Example JSON request
    {
        "search": String,
        "include": [array of Strings],
        "options": {
            "onlyFavorites": boolean
        }
    }
    */

    // get timer and result builder
    var {timer, result} = initializeRoute(req);

    log.info("Searching...")
    console.log(req.params)

    // get user id
    var userID = req.user.id;

    // get json body
    var body = req.body;

    // set up whitelisting to prevent injection
    var whitelist = ["firstName", "lastName", "middleName", "phoneNumbers", "emails"];

    // create empty list of safe includes to use
    var safeInclude = [];

    // if the json body has an include property (these represent search terms)
    if(_.has(req.body, "include"))
    {
        // if the include list is empty
        if(req.body.include.length == 0)
        {
            // then by default, search everything
            safeInclude = whitelist;
        }
        else
        {
            // as a precaution, pick out only the labels we whitelisted to use
            safeInclude = _.intersection(req.body.include, whitelist);
            
            // check if anything "Abnormal" was sent in the includes property
            var removedTerms = _.difference(req.body.include, safeInclude);

            // generate an error message for each invalid search terms
            removedTerms.forEach((term) => {
                result.addError("Include Key: " + term + " is invalid dumbass, skipping search on invalid term");
            });

            // nothing was valid to search... bad request
            if(safeInclude.length == 0)
            {
                result.setStatus(400);
                result.setPayload({});
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
                return;
            }
        }
    }
    else
    {
        // no include? Search everything by default then
        safeInclude = whitelist;
    }

    // get white list for options
    var whitelistOptions = ["onlyFavorites"]

    // empty safeoptions
    var safeOptions = []

    // if json has an options object
    if(_.has(req.body, "options"))
    {
        // store that object
        var obj = req.body.options;

        // if that object is empty
        if(Object.entries(obj).length == 0)
        {
            // do nothing
        }
        else
        {
            // as a precaution, pick out only the options we whitelisted to use
            var safeOptions = _.intersection(Object.keys(obj), whitelistOptions)
            console.log(safeOptions)

            // for every safe json option key, get the json value
            // safeOptions.forEach((term) => {
            //     tmp = {};
            //     if(Object.keys(obj).includes(term))
            //     {
            //         tmp[term + ".value"]
            //     }

            // });
        }  
    }  
        

    var subDocItems = ["phoneNumbers","emails"];
    
    var orAry = [];

    
    // fill the search object
    safeInclude.forEach((term) => {
        tmp = {};
        if(subDocItems.includes(term)){
            tmp[term + ".value"] = new RegExp(req.body.search, "i");
        }else{
            tmp[term] = new RegExp(req.body.search, "i");
        }
        
        orAry.push(tmp)
    });

    console.log(orAry)



    // create an empty object for mongoDB query
    var query = {
        $and: [
            {userID: userID},
            {$or: orAry}
        ]
    };

    console.log("Search Object");
    console.log(query);
    Contact.find(query, function(error, data){

        if (error){
            log.debug("Delete Operation Failed");
            console.log(error);
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return error;
        }
        var packaged = data;
        result.setStatus(200);
        result.setPayload(packaged);
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
    });

    // TODO: Sanitize search for mongoDB
    //       run search query on mongoDB
    //       return results

    // delete later, just testing something
    
});

// Get Single Contact
router.get('/contacts/:id', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    var userID = req.user.id;

    // Validation of Request id parameter before use
    if ( !(_.has(req.params, "id")) || req.params.id == null || req.params.id == undefined){

        result.setStatus(400);
        result.addError("Request Requires Parameter id to be filled");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    if(!mongodb.ObjectID.isValid(req.params.id)){
        result.setStatus(400);
        result.addError("parameter id is not valid");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    var paramID = req.params.id;

    Contact.findOne({ _id: paramID, userID: userID}, function(err, contact){
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
            result.setStatus(200);
            result.setPayload(contact);
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});


// Add A Single New Contact
router.post('/contacts', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);
    var userID = req.user.id;

    // req contains the actual data user sent over..

    // create model instance ...
    var cont = {
        userID: userID,
        favorite: req.body.favorite,
        firstName : req.body.firstName,
        middleName: req.body.middleName,
        lastName: req.body.lastName,
        phoneNumbers: req.body.phoneNumbers,
        emails : req.body.emails,
    };

    var defaultRequest = {
        favorite: false,
        firstName : null,
        middleName: null,
        lastName: null,
        phoneNumbers: [],
        emails : [],
    };

    // returns obj filled obj with new data..
    var newOb = _.defaults(cont, defaultRequest);

    delete newOb._id;
    // Enforce Ownership
    newOb.userID = userID;

    // passing in the cont
    var newContact = new Contact(cont)


    newContact.save(function (err, contact){
        if(err){
            console.log(err);
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return;
        }
        else{
            result.setStatus(200);
            result.setPayload(contact);
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        }

    });
});


// Edit the specific Contact
router.put('/contacts/:id', function(req, res){

    var {timer, result} = initializeRoute(req);
    var userID = req.user.id;

    log.info("Editing Contact")
    console.log(req.params);


    // json body of the request...
    var clientRequest = req.body;

    // Validation of Request id parameter before use
    if ( !(_.has(req.params, "id")) || req.params.id == null || req.params.id == undefined){

        result.setStatus(400);
        result.addError("Request Requires Parameter id to be filled");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    if(!mongodb.ObjectID.isValid(req.params.id)){
        result.setStatus(400);
        result.addError("parameter id is not valid");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    var paramID = req.params.id;


    var defaultRequest = {
        favorite: false,
        firstName : null,
        middleName: null,
        lastName: null,
        phoneNumbers: [],
        emails : [],
    };


    // returns obj filled obj with new data..
    var newOb = _.defaults(clientRequest, defaultRequest);


    delete newOb._id;
    delete newOb.userID;


    // authenticates the user making the changes as the actual user...

    Contact.updateOne({ _id : paramID, userID : userID}, {$set: newOb}, function(error, data){

        if (error)
        {
        contact.log("IT DIDNT WORK!!!!!!\n")
        result.setStatus(500);
        result.setPayload({});
        result.addError("An error occured while updating the database. Change has NOT been saved.");
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
        }
        //console.log(data);
        // console.log("CURRENTLY HAVE after find(): "+ JSON.stringify(data).firstName);

        Contact.findOne({ _id : paramID, userID : req.user.id}, (err, updatedContact) => {

            if (err){
                log.error("Request Failed");
                result.setStatus(500);
                result.setPayload({});
                result.addError("An error occured while updating the database. Change has NOT been saved.");
                res.status(result.getStatus()).type('application/json').send(result.getPayload());
                timer.endTimer(result);
                return;
            }
            //log.info("Request Succeeded");
            //console.log(updatedContact);

            var resultingContact =  _.clone(updatedContact);
            delete resultingContact.userID;
            delete resultingContact.__v;

            result.setStatus(200);
            // Setting the payload to send back..
            result.setPayload(resultingContact);
            // completed the function call..
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
        });
    });
});


// Deletes the specific contact
router.delete('/contacts/:id', function(req, res){

    var {timer, result} = initializeRoute(req);
    var userID = req.user.id;

    if ( !(_.has(req.params, "id")) || req.params.id == null || req.params.id == undefined){

        result.setStatus(400);
        result.addError("Request Requires Parameter id to be filled");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }

    if(!mongodb.ObjectID.isValid(req.params.id)){
        result.setStatus(400);
        result.addError("parameter id is not valid");
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
        return;
    }
    var paramID = req.params.id;

    // userID : req.user.id => confriming it's actually the user making changes to themselves
    Contact.deleteOne({ _id : paramID, userID : userID}, function(error, data){

        if (error){
            log.debug("Delete Operation Failed");
            console.log(error);
            result.setStatus(500);
            result.setPayload({});
            res.status(result.getStatus()).type('application/json').send(result.getPayload());
            timer.endTimer(result);
            return error;
        }
        console.log(data);
        result.setStatus(200);
        result.setPayload({});
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        timer.endTimer(result);
    });
});


// Actual Endpoints - END


module.exports = router;
