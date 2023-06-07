const express = require('express');
const gymRouter = express.Router();
const { datastore, gymKind } = require('../../database/datastore')

gymRouter.get('/', (req, res) => {
    res.send("User has access to the gym")
});


module.exports = gymRouter;