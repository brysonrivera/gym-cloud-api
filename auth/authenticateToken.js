const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const client = jwksClient({
    jwksUri: process.env.AUTH0_ISSUER_BASE_URL + "/.well-known/jwks.json",
    timeout: 30000
});

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];

        const token = authHeader && authHeader.split(' ')[1];

        if (token == null) return res.status(401).send("Send Authorization Token to be granted access to requested resource");

        const decodedToken = jwt.decode(token, { complete: true });
        if (!decodedToken) return res.status(401).send("Send a Valid Authorization Token to be granted access to requested resource");
        const kid = decodedToken.header.kid;
        client.getSigningKey(kid, (err, key) => {
            if (err) {
                console.error(err);
                return res.sendStatus(403);
            }
            const signingKey = key.getPublicKey();
            jwt.verify(token, signingKey, (err, user) => {
                if (err) return res.sendStatus(403);
                req.user = user;
                next();
            });
        });
    } catch (error) {
        console.error(error)
        return res.sendStatus(400);
    }
}


module.exports = authenticateToken;