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

regex='^(www.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)$'
if [[ ! $url =~ $regex ]]; then
    echo "Error: Invalid URL provided. The URL must not include any protocol." 1>&2;
    exit 1;
fi

stack_physical_id=$(aws cloudformation describe-stack-resource \
    --stack-name "buzzword-stack-$suffix" \
    --logical-resource-id KeywordsSocketApplication \
    | jq -r .StackResourceDetail.PhysicalResourceId)
readarray -d / -t stack_id_array <<< $stack_physical_id

gateway_physical_id=$(aws cloudformation describe-stack-resource \
    --stack-name ${stack_id_array[1]} \
    --logical-resource-id SocketGateway \
    | jq -r .StackResourceDetail.PhysicalResourceId)

wscat -c "wss://$gateway_physical_id.execute-api.eu-west-2.amazonaws.com/prod?BaseUrl=$url"
