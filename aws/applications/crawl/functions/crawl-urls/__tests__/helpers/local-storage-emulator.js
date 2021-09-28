const { LOCAL_STORAGE_SUBDIRS, LOCAL_ENV_VARS, ENV_VARS } = require('@apify/consts');
const fs = require('fs-extra');
const path = require('path');

const DEFAULT_FOLDERS = Object.values(LOCAL_STORAGE_SUBDIRS)
    .concat([
        `${LOCAL_STORAGE_SUBDIRS.keyValueStores}/${LOCAL_ENV_VARS[ENV_VARS.DEFAULT_KEY_VALUE_STORE_ID]}`
    ]);

let localStorageDirectory;

const init = async (storageDirectory) => {
    localStorageDirectory = storageDirectory;
    await fs.ensureDir(storageDirectory);
    for (const folder of DEFAULT_FOLDERS) {
        fs.ensureDirSync(path.join(storageDirectory, folder));
    }
    process.env.APIFY_LOCAL_STORAGE_DIR = storageDirectory;
};

const clean = async () => {
    for (const folder of DEFAULT_FOLDERS) {
        fs.emptyDirSync(path.join(localStorageDirectory, folder));
    }
};

const destroy = async () => {
    fs.removeSync(localStorageDirectory);
    delete process.env.APIFY_LOCAL_STORAGE_DIR;
};

module.exports = {
    init,
    clean,
    destroy
};
