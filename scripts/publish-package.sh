#!/bin/bash

usage() {
    echo "Usage:
    -p [Mandatory: Path to package folder]" 1>&2;
    exit 1; 
}

while getopts "p:o:ch" opt; do
    case $opt in
        p)
            path=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $path ]; then
    usage
fi

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

$script_dir/helpers/has-package-version-increased.sh -p $path

if [ $? -eq 0 ]; then
    npm publish $path
fi
