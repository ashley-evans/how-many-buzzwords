#!/bin/bash

usage() {
    echo "Usage:
    -d [Port to map DynamoDB container onto host]
    -g [Port for DynamoDB GUI to listen on]
    -i [Flag to use integration test access keys]" 1>&2;
    exit 1;
}

stop_container() {
    echo
    if [ -z $container_id ]; then
        exit 1;
    fi

    echo "Stopping DynamoDB container with ID: $container_id"
    
    docker stop $container_id &> /dev/null
}

trap stop_container SIGINT SIGTERM

while getopts "d:g:ih" opt; do
    case $opt in
        d)
            dynamodb_port=$OPTARG
            ;;
        g)
            gui_port=$OPTARG
            ;;
        i)
            integration_tests=true
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $dynamodb_port ]; then
    dynamodb_port=8000
fi

if [ -z $gui_port ]; then
    gui_port=$(( $dynamodb_port + 1 ))
fi

echo "Pulling DynamoDB local image"

docker pull amazon/dynamodb-local

existing_containers=($(docker ps --filter ancestor=amazon/dynamodb-local -q -a))

for container in "${existing_containers[@]}"
do
    echo "Deleting existing DynamoDB local container with ID: $container"
    docker rm $container --force &> /dev/null
done

echo "Creating local DynamoDB container, mapping to port: $dynamodb_port of host"

container_id=$(docker run --detach -p $dynamodb_port:8000 amazon/dynamodb-local)

echo "Created with ID: $container_id"

root_dir="$( dirname "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "Setting up GUI for DynamoDB container"

if [ $integration_tests ]; then
    AWS_ACCESS_KEY_ID=x \
    AWS_SECRET_ACCESS_KEY=x \
    DYNAMO_ENDPOINT=http://localhost:$dynamodb_port \
    $root_dir/node_modules/.bin/dynamodb-admin -p $gui_port
else
    DYNAMO_ENDPOINT=http://localhost:$dynamodb_port \
    $root_dir/node_modules/.bin/dynamodb-admin -p $gui_port
fi
