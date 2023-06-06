const express = require('express');
const gym = require('./gym/gym');
const member = require('./member/member');
const authenticateToken = require('../auth/authenticateToken');

const api = express.Router();

// validate all api requests have a valid JWT Token 
// NOTE: If any resources can only be accessed by certain individuals
//       still need to verify the user can access this resource.
api.use(authenticateToken);

api.use('/gyms', gym);
api.use('/members', member);

module.exports = api;