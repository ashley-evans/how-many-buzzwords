#!/bin/bash

usage() {
    echo "Usage:
    -c [Executes npm ci rather than npm i]" 1>&2;
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
    cmd="ci"
else
    cmd="i"
fi

folders=$(find $root_dir ! -path "*/node_modules/*" ! -path "*/.aws-sam/*" -name package.json -printf '%h\n')

for folder in $folders; do
    echo "Running npm $cmd in $folder..."
    npm --prefix $folder $cmd

    if [ $? -ne 0 ]; then
        exit 1
    fi
done
