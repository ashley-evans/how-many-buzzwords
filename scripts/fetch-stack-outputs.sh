#!/bin/bash

usage() {
    echo "Usage:
    -s [Name of stack to obtain outputs from]" 1>&2;
    exit 1; 
}

while getopts "s:h" opt; do
    case $opt in
        s)
            stack=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $stack ]; then
    usage 
fi

details=$(aws cloudformation describe-stacks --stack-name $stack)

if [ $? -ne 0 ]; then
    exit 1
fi

echo $(echo $details | jq -r '.Stacks[] | .Outputs[] | { OutputKey, OutputValue}')
