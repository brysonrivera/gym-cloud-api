const express = require('express');
require('dotenv').config();
const { auth, requiresAuth } = require('express-openid-connect');
const api = require('./entities/index');
const config = require('./database/config')

const app = express();

app.set('views', './views');
app.set('view engine', 'pug');
app.use(auth(config));
app.use('/api', api);


app.get('/profile', requiresAuth(), (req, res) => {
    res.send(JSON.stringify(req.oidc.user));
});

app.get('/', (req, res) => {
    res.send(req.oidc.isAuthenticated() ? res.render('Dashboard', { encodedJWT: req.oidc.idToken }) : res.render('Welcome'))
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Listening on PORT ${(process.env.PORT) ? process.env.PORT : 3000}`)
});