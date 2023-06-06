const express = require('express');
const gym = express.Router();

gym.get('/', (req, res) => {
    res.send("User has access to the gym")
});


module.exports = gym;