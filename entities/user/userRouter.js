const express = require('express');
const { datastore, userKind } = require('../../database/datastore');

const userRouter = express.Router();

userRouter.get('/', async (req, res) => {
    const query = datastore.createQuery(userKind);
    const [tasks] = await datastore.runQuery(query);
    res.status(200).json(tasks);
})

module.exports = userRouter