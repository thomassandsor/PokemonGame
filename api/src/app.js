const { app } = require('@azure/functions');

// Load the dataverse-proxy function
require('./functions/dataverse-proxy');

module.exports = app;
