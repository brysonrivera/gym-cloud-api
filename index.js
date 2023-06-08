const express = require('express');
require('dotenv').config();
const { auth, requiresAuth } = require('express-openid-connect');
const api = require('./entities/index');
const config = require('./database/config')
const { datastore, saveItemInDataStore, userKind } = require('./database/datastore')

const app = express();

app.set('views', './views');
app.set('view engine', 'pug');


app.use(auth(config));
app.use(express.json()) // for parsing application/json

app.get('/profile', requiresAuth(), (req, res) => {
    res.send(JSON.stringify(req.oidc.user));
});

app.get('/', async (req, res) => {
    if (req.oidc.isAuthenticated()) {
        // check if entity with unique_id already exists
        const query = datastore.createQuery(userKind).filter('unique_id', '=', req.oidc.user.sub);
        const [entities] = await datastore.runQuery(query);
        console.log(entities);
        if (entities.length === 0) {
            // HERE add user info to datastore for User Kind
            const taskKey = datastore.key(userKind);
            task = {
                email: req.oidc.user.email,
                unique_id: req.oidc.user.sub
            };
            const entity = {
                key: taskKey,
                data: task
            };
            // upsert overwrites an entity if it already exists in Datastore
            await datastore.upsert(entity);
        }
        res.render('Dashboard', { encodedJWT: req.oidc.idToken, uniqueID: req.oidc.user.sub });

    } else {
        res.render('Welcome');
    }
});

app.use('/', api);

app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on PORT ${(process.env.PORT) ? process.env.PORT : 3000}`)
});