
const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();

const fromDatastore = (item) => {
    item.id = parseInt(item[Datastore.KEY].id, 10);
    return item;
}

const saveItemInDataStore = async (data, key) => {
    await datastore.save({
        key: key,
        data: data
    });
    data.id = parseInt(key.id, 10);
    return data
}

const updateItemInDataStore = async (data, key) => {
    await datastore.update({
        key: key,
        data: data
    });
    data.id = parseInt(key.id, 10);
    return data
}

const urlConstructor = (domain, path, id) => {
    if (id) return "http://" + domain + ":3000" + path + "/" + id;
    else return "http://" + domain + ":3000" + path;
}

module.exports = {
    datastore,
    fromDatastore,
    saveItemInDataStore,
    updateItemInDataStore,
    urlConstructor,
    Datastore,
    userKind: 'USER',
    gymKind: 'GYM',
    memberKind: 'MEMBER'

};