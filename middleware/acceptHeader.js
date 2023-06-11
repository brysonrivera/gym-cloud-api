const acceptHeader = (req, res, next) => {
    const accept = req.accepts('application/json');
    if (!accept) {
        return res.status(406).json({ err: 'Requested Media Type Not Applicable' });
    }
    next();
}

module.exports = acceptHeader;