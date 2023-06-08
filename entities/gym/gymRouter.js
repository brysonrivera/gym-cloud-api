const express = require('express');
const gymRouter = express.Router();
const { datastore, gymKind, userKind } = require('../../database/datastore');
const { createEntity, getEntities, getEntity } = require('../../models/objectModel');
const authenticateToken = require('../../auth/authenticateToken');

gymRouter.post('/', authenticateToken, async (req, res) => {
    if (req.get('Content-Type') !== 'application/json') {
        return res.status(415).json({ err: 'Server only accepts application/json data' });
    }
    const accept = req.accepts('application/json');
    if (!accept) { return res.status(406).json({ err: 'Requested Media Type Not Applicable' }) }

    else if (accept == 'application/json') {
        try {

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
            // MAKE SURE JWT SUB PROPERTY MATCHES MANAGER_ID PROPERTY
            if (req.user.sub !== req.body.manager_id) return res.status(403).json({ err: "User not authorized to add gym to Datastore. manager_id does not match client credentials" })

            // confirm that the manager_id provided is a valid user
            const query = datastore.createQuery(userKind).filter('unique_id', '=', req.body.manager_id);
            const [entities] = await datastore.runQuery(query);
            if (entities.length === 0) { return res.status(404).json({ err: "manager_id does not exist in server. Please resend with valid manager_id." }) }

            // POST Request has been validated
            // Add Gym to Datastore
            const item = await createEntity(req, gymKind)
            console.log(item);
            res.status(201).json(item)
        } catch (error) {
            console.error(error)

        }
    }
    else { res.status(500).send('Content type got messed up!') }

});

gymRouter.get('/', async (req, res) => {
    getEntities(req, gymKind, null)
        .then(items => {
            console.log(items);
            res.status(200).json(items);
        })
        .catch(err => {
            console.error(err);
            res.status(400).end();
        });
});

gymRouter.get('/:gym_id', (req, res) => {
    const accepts = req.accepts('application/json');
    if (!accepts) {
        res.status(406).send('Not Acceptable');
    } else if (accepts === 'application/json') {
        getEntity(req, gymKind, req.params.gym_id)
            .then(gym => {
                res.status(200).json(gym);
            })
            .catch(err => {
                console.error(err);
                res.status(404).send("No Gym with gym_id exists");
            });
    }
});

module.exports = gymRouter;