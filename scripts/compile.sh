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
    npm --prefix $root_dir run ci
    rm -rf $root_dir/dist
else 
    npm --prefix $root_dir run i
fi

echo "Running TSC..."
$root_dir/node_modules/.bin/tsc --project $root_dir/tsconfig.build.json

echo "Copying required deployment files to built directory..."
$root_dir/node_modules/.bin/copyfiles -E \
    applications/**/*-template.yml \
    applications/**/*-openapi.yml \
    applications/**/package*.json \
    applications/**/Makefile \
    services/**/*-template.yml \
    services/**/*-openapi.yml \
    services/**/package*.json \
    services/**/Makefile \
    dist
