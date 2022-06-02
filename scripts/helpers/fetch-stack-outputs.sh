#!/bin/bash

usage() {
    echo "Usage:
    -s [Name of stack to obtain outputs from]
    -r [The region the stack resides in]" 1>&2;
    exit 1; 
}

while getopts "s:r:h" opt; do
    case $opt in
        s)
            stack=$OPTARG
            ;;
        r)
            region=$OPTARG
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

if [ -z $region ]; then
    details=$(aws cloudformation describe-stacks --stack-name $stack)
else
    details=$(aws --region $region cloudformation describe-stacks --stack-name $stack)
fi

if [ $? -ne 0 ]; then
    exit 1
fi

echo $(echo $details | jq -r '.Stacks[] | .Outputs[] | { OutputKey, OutputValue}')
