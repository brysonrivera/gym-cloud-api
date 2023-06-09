const { datastore,
    saveItemInDataStore,
    Datastore,
    urlConstructor,
    fromDatastore } = require('../database/datastore');
const pageSize = 5;
const createEntity = async (req, kind) => {
    let data = {
        ...req.body,
    }; // only load, name, length, and type are saved in DataStore
    const key = datastore.key(kind);
    const itemAdded = await saveItemInDataStore(data, key);

    // self property is not stored in datastore
    // url to get to boat we just created is generated on the fly. Not saved in Datastore
    itemAdded.self = urlConstructor(req.hostname, req.baseUrl, itemAdded.id)
    return itemAdded
}

const getEntities = async (req, kind, filterArr) => {
    let query = datastore.createQuery(kind);

    if (filterArr) {
        const [property, operator, value] = filterArr;
        query.filter(property, operator, value)
    }

    query.limit(pageSize);
    const results = {};

    if (Object.keys(req.query).includes("cursor")) {
        query = query.start(decodeURIComponent(req.query.cursor));
    }
    const entities = await datastore.runQuery(query);

    results.entities = entities[0].map(fromDatastore);

    results.entities.forEach(entity => {
        entity.self = urlConstructor(req.hostname, req.baseUrl, entity.id);
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

const getEntity = async (req, kind, id) => {
    const key = datastore.key([kind, parseInt(id, 10)]);
    const [entity] = await datastore.get(key);
    if (!entity) throw new Error();
    const result = fromDatastore(entity)
    result.self = urlConstructor(req.hostname, req.baseUrl, result.id)
    return result
}

const deleteEntity = async (kind, id) => {
    const key = datastore.key([kind, parseInt(id, 10)]);
    const [result] = await datastore.delete(key);
    if (!result || result.indexUpdates === 0) throw new Error();
}
module.exports = {
    createEntity,
    getEntities,
    getEntity,
    deleteEntity
}