const express = require('express');
const memberRouter = express.Router();
const authenticateToken = require('../../auth/authenticateToken');
const { datastore, memberKind, gymKind } = require('../../database/datastore');
const { createEntity, getEntities, getEntity, deleteEntity } = require('../../models/objectModel');

memberRouter.use(authenticateToken)

memberRouter.post('/', async (req, res) => {
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
            if (!entity) return res.status(404).json({ err: "gym_id does not exist in server. Please resend with valid gym_id." });

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

memberRouter.get('/', (req, res) => {
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

memberRouter.get('/:member_id', (req, res) => {
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

memberRouter.delete('/:member_id', async (req, res) => {
    // verify member entity exists and that the user has authorization to delete
    try {
        const item = await getEntity(req, memberKind, req.params.member_id);
        if (item.manager_id !== req.user.sub) {
            return res.status(403).json({ err: "User is not authorized to delete this member. Users can only delete members that belong to their gym" })
        }
    } catch (error) {
        console.error(error);
        res.status(404).json({ err: "No member with member_id exists" })
    }
    try {
        await deleteEntity(memberKind, req.params.member_id);
        res.sendStatus(204);
    } catch (error) {
        console.error(error);
        res.status(400).json({ err: "Error Deleting Member." })
    }
});

memberRouter.patch('/:member_id', async (req, res) => {
    let acceptedProperties = new Set(["gym_id", "fname", "lname", "dob", "email"]);
    const keyPropertiesArray = Object.keys(req.body);
    if (req.get('Content-Type') !== 'application/json') return res.status(415).json({ err: 'Server only accepts application/json data' });
    const accept = req.accepts('application/json');
    if (!accept) return res.status(406).json({ err: 'Requested Media Type Not Applicable' });
    if (Object.keys(req.body).length > 5) return res.status(400).json({ err: "The request object cannot exceed 5 properties: gym_id, fname, lname, dob, email" });
    for (const prop of keyPropertiesArray) {
        if (!(acceptedProperties.has(prop))) return res.status(400).json({ err: "Request body includes properties that are not accepted: gym_id, fname, lname, dob, email" });
        acceptedProperties.delete(prop);
    }

    try {
        const member = await getEntity(req, memberKind, req.params.member_id);
        if (member.manager_id !== req.user.sub) return res.status(403).json({ err: "User is not authorized to manke any changes to this gym. Please provide a gym_id that belongs to this user" })

        // if request body includes gym_id and gym_ids from body and member entity are different, 
        // we need to update the manager_id in the member entity too
        if (req.body.gym_id && req.body.gym_id !== member.gym_id) {
            // get the gym entity in the request body
            // extract the manager_id property from gym entity and assign it to the manager_id property of the member entity
            try {
                const gym = await getEntity(req, gymKind, req.body.gym_id);
                member.manager_id = gym.manager_id;
            } catch (error) {
                console.error(error);
                res.status(404).json({ err: "No gym with gym_id found" })
            }
        }
        // update the member properties with the properties from the request only if they are in the body of the request
        if (req.body.fname) member.fname = req.body.fname;
        if (req.body.lname) member.lname = req.body.lname;
        if (req.body.dob) member.dob = req.body.dob;
        if (req.body.email) member.email = req.body.email;
        if (req.body.gym_id) member.gym_id = req.body.gym_id;

        // update member in datastore
        try {
            await datastore.update(member)
        } catch (error) {
            console.error(error);
            return res.status(500).json({ err: "Issue running query to update member entities manager_id" });

        }
        res.status(200).json(member);
    } catch (error) {
        console.error(error)
        return res.status(404).json({ err: "No gym with this gym_id exists" })
    }
});

memberRouter.put('/:member_id', async (req, res) => {
    if (req.get('Content-Type') !== 'application/json') return res.status(415).json({ err: 'Server only accepts application/json data' });
    const accept = req.accepts('application/json');
    if (!accept) return res.status(406).json({ err: 'Requested Media Type Not Applicable' });
    if (Object.keys(req.body).length !== 5) {
        return res.status(400).json({ err: "The request object is missing or has too many attributes" });
    }
    if (
        (!(req.body.fname)) ||
        (!(req.body.lname)) ||
        (!(req.body.email)) ||
        (!(req.body.dob)) ||
        (!(req.body.gym_id))) {
        return res.status(400).json({ err: "Request includes incorrect attributes" })
    }

    try {
        const member = await getEntity(req, memberKind, req.params.member_id);
        if (member.manager_id !== req.user.sub) return res.status(403).json({ err: "User is not authorized to manke any changes to this gym. Please provide a gym_id that belongs to this user" })

        // if gym_ids from body and member entity are different, 
        // we need to update the manager_id in the member entity too
        if (req.body.gym_id !== member.gym_id) {
            // get the gym entity in the request body
            // extract the manager_id property from gym entity and assign it to the manager_id property of the member entity
            try {
                const gym = await getEntity(req, gymKind, req.body.gym_id);
                member.manager_id = gym.manager_id;
            } catch (error) {
                console.error(error);
                res.status(404).json({ err: "No gym with gym_id found" })
            }
        }
        // update the member properties with the properties from the request only if they are in the body of the request
        member.fname = req.body.fname;
        member.lname = req.body.lname;
        member.dob = req.body.dob;
        member.email = req.body.email;
        member.gym_id = req.body.gym_id;

        // update member in datastore
        try {
            await datastore.update(member)
        } catch (error) {
            console.error(error);
            return res.status(500).json({ err: "Issue running query to update member entities manager_id" });

        }
        res.status(200).json(member);
    } catch (error) {
        console.error(error)
        return res.status(404).json({ err: "No gym with this gym_id exists" })
    }
});


module.exports = memberRouter;