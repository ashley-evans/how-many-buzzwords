import { AppSyncResolverEvent } from "aws-lambda";

interface AppSyncAdapter<QueryArguments, QueryResponse> {
    handleQuery(
        event: AppSyncResolverEvent<QueryArguments>
    ): Promise<QueryResponse>;
}

export default AppSyncAdapter;
