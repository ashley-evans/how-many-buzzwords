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

current_dir=$( pwd )
script_dir=$( dirname "${BASH_SOURCE[0]}" )
root_dir=$( dirname "$( dirname $script_dir )" )
path=$(realpath --relative-to $current_dir $path)

if [ -z $output_path ]; then
    output_path="$root_dir/dist"
fi

if [ $clean ]; then
    echo "Clean installing..."
    rm -rf $output_path
    if [ $? -ne 0 ]; then
        exit 1
    fi

    npm --prefix $root_dir ci
    $script_dir/npm-all.sh -c ci -r $path
else
    npm --prefix $root_dir i
    $script_dir/npm-all.sh -c i -r $path
fi

if [ $? -ne 0 ]; then
    exit 1
fi

if [ -f $path/tsconfig.build.json ]; then
    config_path="$path/tsconfig.build.json"
elif [ -f $path/tsconfig.json ]; then
    config_path="$path/tsconfig.json"
else
    echo "No tsconfig.build.json or tsconfig.json file could be found." 1>&2;
    exit 1
fi

echo "Compiling service using config: $config_path..."
$root_dir/node_modules/.bin/tsc --project $config_path --outDir $output_path

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
    $output_path
