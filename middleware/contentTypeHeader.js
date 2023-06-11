const contentTypeHeader = (req, res, next) => {
    if (req.get('Content-Type') !== 'application/json') {
        return res.status(415).json({ err: 'Server only accepts application/json data' });
    }
    next();
}

module.exports = contentTypeHeader;