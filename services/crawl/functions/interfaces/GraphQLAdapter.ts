import { AppSyncResolverEvent } from "aws-lambda";

interface GraphQLAdapter<QueryArguments, QueryResponse> {
    handleQuery(
        event: AppSyncResolverEvent<QueryArguments>
    ): Promise<QueryResponse>;
}

export default GraphQLAdapter;
