import dynamoose from 'dynamoose';

import Repository from "../ports/Repository";
import URLsTableSchema from '../schemas/URLsTableSchema';
import URLsTableDocument from '../schemas/URLsTableDocument';

class URLsTableRepository implements Repository {
    private model;

    constructor(private tableName: string) {
        this.model = dynamoose.model<URLsTableDocument>(
            tableName,
            URLsTableSchema
        );
    }

    async storePathname(baseURL: string, pathname: string): Promise<boolean> {
        await this.model.create(
            { 
                BaseUrl: baseURL,
                Pathname: pathname
            },
            {
                overwrite: true
            }
        );

        console.log(`Successfully stored: ${pathname} for ${baseURL}`);
        return true;
    }
}

export default URLsTableRepository;
