const { datastore, saveItemInDataStore, updateItemInDataStore, gymKind, urlConstructor } = require('../database/datastore');
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

module.exports = {
    createGym
}