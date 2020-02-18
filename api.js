// Modules
const fs = require('fs');
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const uuidv4 = require('uuid/v4');
var cors = require('cors');
var cookieParser = require('cookie-parser');
//Libraries
const log = require('./libraries/logging.js');
//Routes
var primary = require('./routes/primary.js');
var auth = require('./routes/auth.js');
// Hard Coded Configs
var service_port = 3030;

// Pull Config
const config = require('./config/auth-config.js');

// Apply Config
const pool = new Pool( config.dbconfig.data );

// HouseKeeping Stuff - START

// Shutdown Stuff
process.on('exit', (code) => {
    log.shutdown(`Process Exits With Code: ${code}`);
});

// the pool with emit an error on behalf of any idle clients
// it contains if a backend error or network partition happens
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// HouseKeeping Stuff - END

// Create Express Instance
const app = express();
// Apply Express Configurations
app.use(bodyParser.urlencoded({limit: '5mb', extended: true}));
app.use(bodyParser.json({limit: '5mb'}));

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
// app.use(cors(corsOptions));
// TEST USING cors with options object {origin: true}
var corsOptions = {
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    credentials: true,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(cors(corsOptions));

// app.use(function(req, res, next) {
//     res.header("Access-Control-Allow-Origin", "https://crabrr.com"); // update to match the domain you will make the request from
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
//     res.header("Access-Control-Allow-Credentials", "true");
//     res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
//     if (req.method === "OPTIONS") {
//         return res.status(200).end();
//     }
//     next();
// });


// Some Basic Routes To Offer Basic Functionality

// Attempting To Load This In A Browser Will Result In Nothing, So we send a 204 status meaning No Content
app.get('/', async function(req, res) {
    res.status(204).send();
});

// This allow us to check if the server is up, responds 200 when up
// Primarily used for load balancer
app.get('/status', async function(req, res) {
    res.status(200).send();
});

app.get('/presentation', async function(req, res) {
    res.redirect(301, "https://docs.google.com/presentation/d/e/2PACX-1vRnMbsvKHr60gHpTM9shhNhs_VkiBoVIVi_IasJwbLcUa--ZOAbHVmXOK-dtoX7nRLaFPmBW-PO0aV-/pub");
});

// Routes - START
// Users and Authentication
app.use('/auth', auth);

// Primary Route
app.use('/', primary);
// Routes - END

// Start The Express Server
app.listen(service_port, () => log.debug(`Listening on ${ service_port }`))
