
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
    if (id) return "https://" + domain + path + "/" + id
    else return "https://" + domain + path
}

module.exports = {
    datastore,
    saveItemInDataStore,
    updateItemInDataStore,
    urlConstructor,
    userKind: 'USER',
    gymKind: 'GYM',
    memberKind: 'MEMBER'

};