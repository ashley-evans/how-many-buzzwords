#!/bin/bash

usage() {
    echo "Usage:
    -p [Mandatory: Path to service to compile]
    -o [Path to compilation output folder]
    -c [Clean compile - Reinstalls dependencies and removes existing built files]" 1>&2;
    exit 1; 
}

while getopts "p:o:ch" opt; do
    case $opt in
        p)
            path=$OPTARG
            ;;
        o)
            output_path=$OPTARG
            ;;
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

if [ -z $path ]; then
    usage
fi

root_dir="$( dirname "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [ -z $output_path ]; then
    output_path="$root_dir/dist"
fi

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

if [ $clean ]; then
    echo "Clean installing..."
    rm -rf $output_path
    if [ $? -ne 0 ]; then
        exit 1
    fi

    $script_dir/npm-all.sh -c ci -r $path
else
    $script_dir/npm-all.sh -c i -r $path
fi

if [ $? -ne 0 ]; then
    exit 1
fi

echo "Compiling Service..."
$root_dir/node_modules/.bin/tsc --project $path --outDir $output_path

if [ $? -ne 0 ]; then
    exit 1
fi

echo "Copying required deployment files to built directory..."
$root_dir/node_modules/.bin/copyfiles -E -u 2 \
    -e "$path/**/node_modules/**" \
    "$path/**/*-template.yml" \
    "$path/**/*-openapi.yml" \
    "$path/**/package*.json" \
    "$path/**/Makefile" \
    "$path/**/*.asl.json" \
    dist
