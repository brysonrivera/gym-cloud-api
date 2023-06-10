const express = require('express');
const gymRouter = express.Router();
const { datastore, gymKind, userKind, memberKind } = require('../../database/datastore');
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

gymRouter.get('/', (req, res) => {
    const accepts = req.accepts('application/json');
    if (!accepts) {
        res.status(406).send('Not Acceptable');
    } else if (accepts === 'application/json') {
        getEntities(req, gymKind, null)
            .then(items => {
                res.status(200).json(items);
            })
            .catch(err => {
                console.error(err);
                res.status(400).end();
            });
    }
});

gymRouter.get('/:gym_id/members', authenticateToken, async (req, res) => {
    const accepts = req.accepts('application/json');
    if (!accepts) {
        res.status(406).send('Not Acceptable');
    } else if (accepts === 'application/json') {
        try {
            await getEntity(req, gymKind, req.params.gym_id);
        } catch (error) {
            console.error(error);
            res.status(404).json({ err: "No gym with this gym_id exists" })
        }
        try {
            const items = await getEntities(req, memberKind, ['gym_id', '=', parseInt(req.params.gym_id, 10)]);
            console.log(items)
            if (items.entities.length > 0) {
                managerId = items.entities[0].manager_id;
                if (managerId !== req.user.sub) return res.status(403).json({ err: "User is not authorized to view this members information. Users can only view members that are part of their gym." })
            }
            res.status(200).json(items);
        } catch (error) {
            console.error(err);
            res.status(400).json({ err: "There was an issue getting member entities with the same gym_id " })
        }
    }

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

gymRouter.put('/:gym_id', authenticateToken, async (req, res) => {
    if (req.get('Content-Type') !== 'application/json') { return res.status(415).send('Server only accepts application/json data') }
    const accept = req.accepts('application/json');
    if (!accept) { return res.status(406).send('Requested Media Type Not Applicable'); }
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

    try {
        // check if 
        const entity = await getEntity(req, gymKind, req.params.gym_id);
        if (entity.manager_id !== req.user.sub) return res.status(403).json({ err: "User is not authorized to manke any changes to this gym. Please provide a gym_id that belongs to this user" })
        // if entity manager_id not equal to req.body.manager_id we need to change each members manager_id property
        if (entity.manager_id !== req.body.manager_id) {
            // query to check if user with this manager_id exists
            try {
                let query = datastore.createQuery(userKind).filter("unique_id", "=", req.body.manager_id);
                const [user] = await datastore.runQuery(query);
                if (user.length === 0) return res.status(404).json({ err: "No user with this manager_id exists" });

            } catch (error) {
                console.error(error);
                return res.status(500).json({ err: "Issue querying if manager_id exists in user db." });
            }

            // query to get a list of member entities
            try {
                query = datastore.createQuery(memberKind).filter("gym_id", "=", parseInt(req.params.gym_id, 10));
                const [members] = await datastore.runQuery(query);
                // iterate through each member and update it in the datastore
                for (const member of members) {
                    member.manager_id = req.body.manager_id;
                    try {
                        await datastore.update(member);
                    } catch (error) {
                        console.error(error);
                        return res.status(500).json({ err: "Issue updating member entity with new manager_id property in datastore" });
                    }
                }

            } catch (error) {
                console.error(error);
                return res.status(500).json({ err: "Issue running query to update member entities manager_id" });
            }
        }
        // update the gym properties with the properties from the request
        entity.manager_id = req.body.manager_id;
        entity.address = req.body.address;
        entity.city = req.body.city;
        entity.state = req.body.state;
        entity.zip = req.body.zip;
        entity.max_capacity = req.body.max_capacity;

        //update gym in datastore
        try {
            await datastore.update(entity)
        } catch (error) {
            console.error(error);
            return res.status(500).json({ err: "Issue running query to update member entities manager_id" });

        }
        res.status(200).json(entity);
    } catch (error) {
        console.error(error)
        return res.status(404).send("No gym with this gym_id exists")
    }
});

gymRouter.patch('/:gym_id', authenticateToken, async (req, res) => {
    let acceptedProperties = new Set(["manager_id", "address", "city", "state", "zip", "max_capacity"]);
    const keyPropertiesArray = Object.keys(req.body);
    if (req.get('Content-Type') !== 'application/json') return res.status(415).json({ err: 'Server only accepts application/json data' });
    const accept = req.accepts('application/json');
    if (!accept) return res.status(406).json({ err: 'Requested Media Type Not Applicable' });
    if (Object.keys(req.body).length > 6) return res.status(400).json({ err: "The request object cannot exceed 6 properties: manager_id, address, city, state, zip, max_capacity" });
    for (const prop of keyPropertiesArray) {
        if (!(acceptedProperties.has(prop))) return res.status(400).json({ err: "Request body includes properties that are not accepted: manager_id, address, city, state, zip, max_capacity" });
        acceptedProperties.delete(prop);
    }
    try {
        const entity = await getEntity(req, gymKind, req.params.gym_id);
        if (entity.manager_id !== req.user.sub) return res.status(403).json({ err: "User is not authorized to manke any changes to this gym. Please provide a gym_id that belongs to this user" })

        // if managfer_id is included in patch and entity manager_id not equal to req.body.manager_id 
        // we need to change each members manager_id property
        if (req.body.manager_id && entity.manager_id !== req.body.manager_id) {
            // query to check if user with this manager_id exists
            try {
                let query = datastore.createQuery(userKind).filter("unique_id", "=", req.body.manager_id);
                const [user] = await datastore.runQuery(query);
                if (user.length === 0) return res.status(404).json({ err: "No user with this manager_id exists" });
            } catch (error) {
                console.error(error);
                return res.status(500).json({ err: "Issue querying if manager_id exists in user db." });
            }
            // query to get a list of member entities
            try {
                query = datastore.createQuery(memberKind).filter("gym_id", "=", parseInt(req.params.gym_id, 10));
                const [members] = await datastore.runQuery(query);
                // iterate through each member and update it in the datastore
                for (const member of members) {
                    member.manager_id = req.body.manager_id;
                    try {
                        await datastore.update(member);
                    } catch (error) {
                        console.error(error);
                        return res.status(500).json({ err: "Issue updating member entity with new manager_id property in datastore" });
                    }
                }
            } catch (error) {
                console.error(error);
                return res.status(500).json({ err: "Issue running query to update member entities manager_id" });
            }
        }
        // update the gym properties with the properties from the request
        if (req.body.manager_id) entity.manager_id = req.body.manager_id;
        if (req.body.address) entity.address = req.body.address;
        if (req.body.city) entity.city = req.body.city;
        if (req.body.state) entity.state = req.body.state;
        if (req.body.zip) entity.zip = req.body.zip;
        if (req.body.max_capacity) entity.max_capacity = req.body.max_capacity;

        //update gym in datastore
        try {
            await datastore.update(entity)
        } catch (error) {
            console.error(error);
            return res.status(500).json({ err: "Issue running query to update member entities manager_id" });

        }
        res.status(200).json(entity);
    } catch (error) {
        console.error(error)
        return res.status(404).json({ err: "No gym with this gym_id exists" })
    }
});



module.exports = gymRouter;