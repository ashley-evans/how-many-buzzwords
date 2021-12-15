import {
    LOCAL_STORAGE_SUBDIRS,
    LOCAL_ENV_VARS, 
    ENV_VARS
} from '@apify/consts';
import fs from 'fs-extra';
import path from 'path';

import { process } from '../../../polyfills';

const LOCAL_STORAGE_DIRECTORIES: string[] = Object.values(
    LOCAL_STORAGE_SUBDIRS
);
const DEFAULT_FOLDERS = LOCAL_STORAGE_DIRECTORIES.concat(
    [
        `${LOCAL_STORAGE_SUBDIRS.keyValueStores}/${LOCAL_ENV_VARS[
            ENV_VARS.DEFAULT_KEY_VALUE_STORE_ID
        ]}`
    ]
);

function init(storageDirectory: string) {
    fs.ensureDirSync(storageDirectory);
    for (const folder of DEFAULT_FOLDERS) {
        const folderPath = path.join(storageDirectory, folder);
        fs.ensureDirSync(folderPath);
    }
    process.env.APIFY_LOCAL_STORAGE_DIR = storageDirectory;
}

function clean() {
    if (!process.env.APIFY_LOCAL_STORAGE_DIR) {
        return;
    }

    for (const folder of DEFAULT_FOLDERS) {
        const folderPath = path.join(
            process.env.APIFY_LOCAL_STORAGE_DIR,
            folder
        );
        fs.emptyDirSync(folderPath);
    }
}

function destroy() {
    if (!process.env.APIFY_LOCAL_STORAGE_DIR) {
        return;
    }

    fs.removeSync(process.env.APIFY_LOCAL_STORAGE_DIR);
    delete process.env.APIFY_LOCAL_STORAGE_DIR;
}

export {
    init,
    clean,
    destroy
};
