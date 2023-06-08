const { datastore,
    saveItemInDataStore,
    updateItemInDataStore,
    Datastore,
    gymKind,
    userKind,
    urlConstructor,
    fromDatastore } = require('../database/datastore');
const pageSize = 5;
const createGym = async (req) => {
    let gym = {
        ...req.body,
    }; // only load, name, length, and type are saved in DataStore
    const key = datastore.key(gymKind);
    const itemAdded = await saveItemInDataStore(gym, key);

    // self property is not stored in datastore
    // url to get to boat we just created is generated on the fly. Not saved in Datastore
    itemAdded.self = urlConstructor(req.hostname, req.baseUrl, itemAdded.id)
    return itemAdded
}

const getGyms = async (req) => {
    let query = datastore.createQuery(gymKind).limit(pageSize);
    const results = {};

    if (Object.keys(req.query).includes("cursor")) {
        query = query.start(decodeURIComponent(req.query.cursor));
    }
    const entities = await datastore.runQuery(query);

    results.gyms = entities[0].map(fromDatastore);

    results.gyms.forEach(gym => {
        gym.self = urlConstructor(req.hostname, req.baseUrl, gym.id);
    });
    if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
        results.next = urlConstructor(req.hostname, req.baseUrl, null,) + "?cursor=" + encodeURIComponent(entities[1].endCursor);
    }
    results.self = urlConstructor(req.hostname, req.baseUrl, null)
    if (Object.keys(req.query).includes("cursor")) {
        results.self = results.self + "cursor=" + encodeURIComponent(req.query.cursor);
    }
    return results
}

module.exports = {
    createGym,
    getGyms
}