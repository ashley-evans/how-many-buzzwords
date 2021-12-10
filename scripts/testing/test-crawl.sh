#!/bin/bash

usage() {
    echo "Usage:
    -s [Mandatory: The environment suffix of the stack to invoke the crawl API on]
    -u [Mandatory: The URL to be crawled]" 1>&2;
    exit 1;
}

while getopts "s:u:" opt; do
    case $opt in
        s)
            suffix=$OPTARG
            ;;
        u)
            url=$OPTARG
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $suffix ] || [ -z $url ]; then
    usage 
fi

regex='^(http(s)?:\/\/)?(www.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)$'
if [[ ! $url =~ $regex ]]; then
    echo "Error: Invalid URL provided" 1>&2;
    exit 1;
fi

physical_id=$(aws cloudformation describe-stack-resource \
    --stack-name "buzzword-stack-$suffix" \
    --logical-resource-id BuzzwordHTTPGateway \
    | jq -r .StackResourceDetail.PhysicalResourceId)

body="{\"MessageBody\":{\"url\":\"$url\"}}"

curl -d $body -H "Content-Type: application/json" -X POST "https://$physical_id.execute-api.eu-west-2.amazonaws.com/prod/crawl"
