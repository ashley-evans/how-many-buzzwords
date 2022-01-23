#!/bin/bash

usage() {
    echo "Usage:
    -c [Mandatory: Executes given npm command on all modules]" 1>&2;
    exit 1; 
}

while getopts "c:h" opt; do
    case $opt in
        c)
            cmd=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [[ -z $cmd ]]; then
    usage
fi

root_dir="$( dirname "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

folders=$(find $root_dir ! -path "*/node_modules/*" ! -path "*/.aws-sam/*" ! -path "*/dist/*" -name package.json -printf '%h\n')

for folder in $folders; do
    echo "Running npm $cmd in $folder..."
    npm --prefix $folder $cmd

    if [ $? -ne 0 ]; then
        exit 1
    fi
done
