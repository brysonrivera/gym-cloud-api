const express = require('express');
const member = express.Router();
const authenticateToken = require('../../auth/authenticateToken');
const { datastore, memberKind, gymKind } = require('../../database/datastore');
const { createEntity, getEntities, getEntity } = require('../../models/objectModel');

member.use(authenticateToken)

member.post('/', async (req, res) => {
    if (req.get('Content-Type') !== 'application/json') {
        return res.status(415).json({ err: 'Server only accepts application/json data' });
    }
    const accept = req.accepts('application/json');
    if (!accept) { return res.status(406).json({ err: 'Requested Media Type Not Applicable' }) }

    else if (accept == 'application/json') {
        try {
            if (Object.keys(req.body).length !== 5) {
                return res.status(400).json({ err: "The request object is missing at least one of the required attributes" });
            }
            if (
                (!(req.body.fname)) ||
                (!(req.body.lname)) ||
                (!(req.body.dob)) ||
                (!(req.body.email)) ||
                (!(req.body.gym_id))) {
                return res.status(400).json({ err: "Request includes incorrect attributes" })
            }

            // confirm that the gym_id provided is a valid entity
            const key = datastore.key([gymKind, parseInt(req.body.gym_id, 10)]);
            const [entity] = await datastore.get(key);
            if (!entity) return res.status(404).json({ err: "manager_id does not exist in server. Please resend with valid manager_id." });

            // MAKE SURE THIS USER HAS AUTHORIZATION TO ADD MEMBERS TO THIS GYM. 
            // IF JWT SUB PROPERTY MATCHES GYM ENTITIES MANAGER_ID, USER IS AUTHORIZED TO ADD MEMBER
            if (req.user.sub !== entity.manager_id) return res.status(403).json({ err: "user not authorized to add member to gym with this gym_id. Users are only allowed to add members to Gyms that have their manager_id" })

            // ADD MANAGER_ID TO MEMBER ENTITY
            // makes get requests more efficient
            req.body.manager_id = entity.manager_id;

            // POST Request has been validated
            // Add Member to Datastore
            const item = await createEntity(req, memberKind);
            res.status(201).json(item);
        } catch (error) {
            console.error(error);
            res.status(400).send("Error completing request");
        }
    }
    else { res.status(500).send('Content type got messed up!') }
});

member.get('/', (req, res) => {
    const accepts = req.accepts('application/json');
    if (!accepts) {
        res.status(406).send('Not Acceptable');
    } else if (accepts === 'application/json') {
        getEntities(req, memberKind, ["manager_id", "=", req.user.sub])
            .then(items => {
                console.log(items);
                res.status(200).json(items);
            })
            .catch(err => {
                console.error(err);
                res.status(400).end();
            });
    }
});

member.get('/:member_id', (req, res) => {
    const accepts = req.accepts('application/json');
    if (!accepts) {
        res.status(406).send('Not Acceptable');
    } else if (accepts === 'application/json') {
        getEntity(req, memberKind, req.params.member_id)
            .then(item => {
                if (item.manager_id !== req.user.sub) return res.status(403).json({ err: "User is not authorized to view this members information. Users can only view members that are part of their gym." })
                res.status(200).json(item);
            })
            .catch(err => {
                console.error(err);
                res.status(404).json({ err: "No member with member_id exists" });
            });
    }
});

member.delete(':/member_id', (req, res) => {

})


module.exports = member;