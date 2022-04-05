#!/bin/bash

usage() {
    echo "Usage:
    -c [Clean compile - Reinstalls dependencies and removes existing built files]" 1>&2;
    exit 1; 
}

while getopts "ch" opt; do
    case $opt in
        c)
            clean=true
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

root_dir="$( dirname "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [ $clean ]; then
    echo "Clean installing..."
    rm -rf $root_dir/dist
    npm --prefix $root_dir run ci:parallel
else 
    npm --prefix $root_dir run i:parallel
fi

if [ $? -ne 0 ]; then
    exit 1
fi

echo "Running TSC..."
$root_dir/node_modules/.bin/tsc --project $root_dir/services

if [ $? -ne 0 ]; then
    exit 1
fi

echo "Copying required deployment files to built directory..."
$root_dir/node_modules/.bin/copyfiles -E -u 1 \
    -e "**/node_modules/**" \
    "services/**/*-template.yml" \
    "services/**/*-openapi.yml" \
    "services/**/package*.json" \
    "services/**/Makefile" \
    "services/**/*.asl.json" \
    dist
