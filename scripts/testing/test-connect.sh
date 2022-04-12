#!/bin/bash

usage() {
    echo "Usage:
    -s [Mandatory: The environment suffix of the stack to connect to]
    -u [Mandatory: The URL to listen for updates]" 1>&2;
    exit 1;
}

while getopts "s:u:h" opt; do
    case $opt in
        s)
            suffix=$OPTARG
            ;;
        u)
            url=$OPTARG
            ;;
        h)
            usage
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

gateway_physical_id=$(aws cloudformation describe-stack-resource \
    --stack-name buzzword-keyphrase-service-$suffix \
    --logical-resource-id KeyphraseWebSocketGateway \
    | jq -r .StackResourceDetail.PhysicalResourceId)

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="$( dirname "$(dirname "$script_dir")")"

"$root_dir"/node_modules/.bin/wscat -c "wss://$gateway_physical_id.execute-api.eu-west-2.amazonaws.com/\$default?baseURL=$url"
