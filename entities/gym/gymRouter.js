const express = require('express');
const gymRouter = express.Router();
const { datastore, gymKind, userKind } = require('../../database/datastore');
const { createGym, getGyms } = require('../../models/gymModel');
const authenticateToken = require('../../auth/authenticateToken');

gymRouter.post('/', authenticateToken, async (req, res) => {
    if (req.get('Content-Type') !== 'application/json') {
        return res.status(415).json({ err: 'Server only accepts application/json data' });
    }
    const accept = req.accepts('application/json');
    if (!accept) { return res.status(406).json({ err: 'Requested Media Type Not Applicable' }) }

    else if (accept == 'application/json') {
        try {
            console.log(req);
            if (Object.keys(req.body).length !== 6) {
                return res.status(400).json({ err: "The request object is missing at least one of the required attributes" });
            }
            if (
                (!(req.body.address)) ||
                (!(req.body.city)) ||
                (!(req.body.state)) ||
                (!(req.body.zip)) ||
                (!(req.body.max_capacity)) ||
                (!(req.body.manager_id))) {
                return res.status(400).json({ err: "Request includes incorrect attributes" })
            }

            // confirm that the manager_id provided is a valid user
            const query = datastore.createQuery(userKind).filter('unique_id', '=', req.body.manager_id);
            const [entities] = await datastore.runQuery(query);
            if (entities.length === 0) { return res.status(404).json({ err: "manager_id does not exist in server. Please resend with valid manager_id." }) }

            // POST Request has been validated
            // Add Gym to Datastore
            const item = await createGym(req)
            console.log(item);
            res.status(201).json(item)
        } catch (error) {
            console.error(error)
            res.status(400).send("Error completing request");
        }
    }
    else { res.status(500).send('Content type got messed up!') }

});

gymRouter.get('/', async (req, res) => {
    getGyms(req)
        .then(items => {
            console.log(items);
            res.status(200).json(items);
        })
        .catch(err => {
            console.error(err);
            res.status(400).end();
        });
});


module.exports = gymRouter;