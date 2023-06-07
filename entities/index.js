const express = require('express');
const gymRouter = require('./gym/gymRouter');
const memberRouter = require('./member/memberRouter');
const userRouter = require('./user/userRouter');
const authenticateToken = require('../auth/authenticateToken');

const api = express.Router();

// validate all api requests have a valid JWT Token 
// NOTE: If any resources can only be accessed by certain individuals
//       still need to verify the user can access this resource.
api.use(authenticateToken);

api.use('/gyms', gymRouter);
api.use('/members', memberRouter);
api.use('/users', userRouter);

module.exports = api;