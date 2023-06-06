const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET,
    baseURL: process.env.AUTH0_BASE_URL,
    clientID: process.env.AUTH0_CLIENTID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL
};
module.exports = config;