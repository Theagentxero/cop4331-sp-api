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


// addContact()
router.post('/add.json', function (req, res) {
    // Get Timer and Result Builder
    var {timer, result} = initializeRoute(req);

    // req contains the actual data user sent over..

    var userID = req.user.id;

    // create model instance ...

    var cont = {
      userID: userID,
      favorite: req.body.favorite,
      firstName : req.body.firstName,
      middleName: req.body.middleName,
      lastName: req.body.lastName,
      phoneNumbers: req.body.phoneNumbers,
      email : req.body.emails,
    };

    // passing in the cont
    var newContact = new Contact(cont)


    newContact.save(function (err, contact){
      if(err)
      {
        console.log(err);
          result.setStatus(500);
          result.setPayload({});
          res.status(result.getStatus()).type('application/json').send(result.getPayload());
          timer.endTimer(result);
          return;
        }
        else
        {
          // console.log("Added contact named " +req.body.firstName),
          // console.log("Added contact named " +req.body.lastName),


          result.setStatus(200);
          result.setPayload(contact);
          res.status(result.getStatus()).type('application/json').send(result.getPayload());
          timer.endTimer(result);
        }

    });
});



  // edit... delete.. contacts..


// edit function()..
router.post('/edit.json', function(req, res){

  var {timer, result} = initializeRoute(req);

  console.log("incoming id: "+ req.params._id);
  console.log("incoming data: "+ req.body.firstName);
  console.log("incoming data: "+ req.body.middleName);
  console.log("incoming data: "+ req.body.lastName);
  console.log("incoming data: "+ req.body.phoneNumbers);
  console.log("incoming data: "+ req.body.emails);

  console.log("\n\n\n");


  // json body of the request...
  var clientRequest = req.body;


  if ( !(_.has(clientRequest, "_id")) || clientRequest._id == null){

    result.setStatus(400);

    result.addError("Request is missing required key value pair: _id");

    result.setPayload({});

    res.status(result.getStatus()).type('application/json').send(result.getPayload());

    timer.endTimer(result);

    return;
  }

  var defaultRequest = {
    favorite: false,
    firstName : null,
    middleName: null,
    lastName: null,
    phoneNumbers: [],
    email : [],
  };


  // returns obj filled obj with new data..
  var newOb = _.defaults(clientRequest, defaultRequest);


  delete newOb._id;
  delete newOb.userID;


  // authenticates the user making the changes as the actual user...
  // userID...

  Contact.updateOne({ _id : req.user._id, userID : req.user.id}, {$set: newOb}, function(error, data){

    if (error)
    {
      contact.log("IT DIDNT WORK!!!!!!\n")
      result.setStatus(500);
      result.setPayload({});
      result.addError("An error occured while updating the database. Change has NOT been saved.");
      res.status(result.getStatus()).type('application/json').send(result.getPayload());
      return;
    }

    // console.log("CURRENTLY HAVE after find(): "+ JSON.stringify(data).firstName);

    Contact.findOne({ _id : req.user._id, userID : req.user.id}, (err, updatedContact) => {

      if (err){
        contact.log("IT DIDNT WORK!!!!!!\n")
        result.setStatus(500);
        result.setPayload({});
        result.addError("An error occured while updating the database. Change has NOT been saved.");
        res.status(result.getStatus()).type('application/json').send(result.getPayload());
        return;
      }


      // settign the payload to send back..
      console.log(updatedContact);

      result.setPayload({});


      result.setStatus(200);

      timer.endTimer(result);
      // completed the function call..
      res.status(result.getStatus()).type('application/json').send(result.getPayload());
    });
  });
});



  // deletes the specific contact
router.delete('/deletecontact.json', function(req, res){

  var {timer, result} = initializeRoute(req);

  result.setStatus(200);


  // userID : req.user.id => confriming it's actually the user making changes to themselves
  Contact.deleteOne({ "_id" : req.body._id, userID : req.user.id}, function(error, data){

    if (error){
      console.log("IT DIDNT WORK!!!!!!!!\n");

      result.setPayload({});

      result.setStatus(500);

      res.status(result.getStatus()).type('application/json').send(result.getPayload());

      return error;
    }

    result.setStatus(200);

    result.setPayload({
      'Success' : true,
      'status' : 1,
      'msg' : 'deleted succesfully'
    });

    timer.endTimer(result);

    res.status(result.getStatus()).type('application/json').send(result.getPayload());
  });
});




//wrecking ball
router.delete('/delete.json', function(req, res){

  var {timer, result} = initializeRoute(req);

  // console.log("incoming id: "+ req.body.userId);
  // console.log("incoming data: "+ req.body.firstName);
  // console.log("incoming data: "+ req.body.middleName);
  // console.log("incoming data: "+ req.body.lastName);
  // console.log("incoming data: "+ req.body.phoneNumbers);
  // console.log("incoming data: "+ req.body.emails);

  console.log("\n\n\n");

  result.setStatus(200);

  Contact.deleteMany({}, function(error, data){

    if (error){
      console.log("IT DIDNT WORK!!!!!!!!\n");

      result.setPayload({});

      result.setStatus(500);

      res.status(result.getStatus()).type('application/json').send(result.getPayload());
    }

    result.setStatus(200);

    console.log("It worked!!! All your contacts have been deleted!!\n");
  });

  // settign the payload to send back..
  result.setPayload({
    'Success' : true,
    'status' : 1,
    'msg' : 'deleted all contacts succesfully'
  });


  timer.endTimer(result);
  // completed the function call..
  res.status(result.getStatus()).type('application/json').send(result.getPayload());
});







// searchContacts()
// router.get('/search.json', function (req, res) {
//     // Get Timer and Result Builder
//     var {timer, result} = initializeRoute(req);
//
//     // var userID = req.user.id;
//
//     var cont = {
//       favorite: req.body.favorite,
//       firstName : req.body.firstName,
//       middleName: req.body.middleName,
//       lastName: req.body.lastName,
//       phoneNumbers: req.body.phoneNumbers,
//       email : req.body.emails,
//     };
//
//

//
//
//     var newValue = new Contact(cont);
//
//     // console.log("item: "+ newValue.firstName);
//     // console.log("item: "+ newValue.middleName);
//     // console.log("item: "+ newValue.lastName);
//     // console.log("item: "+ newValue.phoneNumbers);
//     // console.log("item: "+ newValue.emails);
//     // console.log("item: "+ newValue.favorite);
//
//
//   Contact.find({firstName : newValue.firstName}, function(err, contacts){
//       if(err){
//           result.setStatus(500);
//           result.setPayload({});
//
//           // console.log("Value not found...\n");
//
//           res.status(result.getStatus()).type('application/json').send(result.getPayload());
//           timer.endTimer(result);
//
//           return;
//       }else{
//           result.setStatus(200);
//
//
//
//           // console.log("\n\n\nFound: " + contacts.firstName);
//
//           // console.log("item: "+ contacts.firstName);
//           // console.log("item: "+ contacts.middleName);
//           // console.log("item: "+ contacts.lastName);
//           // console.log("item: "+ contacts.phoneNumbers);
//           // console.log("item: "+ contacts.emails);
//           // console.log("item: "+ contacts.favorite);
//
//           // console.log("\n\n");
//
//           res.status(result.getStatus()).type('application/json').send(result.getPayload());
//
//           timer.endTimer(result);
//       }
//   }
//   );
// });


// router.get('/favorite.json', function (req, res) {
//     // Get Timer and Result Builder
//     var {timer, result} = initializeRoute(req);
//
//     var userID = req.id;
//
//     Contact.find({userID : userID}, {favorite : true} , function(err, contacts){
//         if(err)
//         {
//             result.setStatus(500);
//             result.setPayload({});
//             res.status(result.getStatus()).type('application/json').send(result.getPayload());
//             timer.endTimer(result);
//             return;
//         }
//         else
//         {
//             result.setStatus(200);
//             result.setPayload(contacts);
//             res.status(result.getStatus()).type('application/json').send(result.getPayload());
//             timer.endTimer(result);
//         }
//
//     });
// });


// Actual Endpoints - END


module.exports = router;
