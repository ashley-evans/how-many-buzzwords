#!/bin/bash

usage() {
    echo "Usage:
    -p [Mandatory: Path to package folder]
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

if [ $clean ]; then
    echo "Clean installing..."
    rm -rf $output_path
    npm --prefix $root_dir ci
    npm --prefix $path ci
else 
    npm --prefix $root_dir ci
    npm --prefix $path i
fi

echo "Compiling package..."
$root_dir/node_modules/.bin/tsc --project $path --outDir $output_path

if [ $? -ne 0 ]; then
    exit 1
fi

echo "Copying required deployment files to built directory..."
$root_dir/node_modules/.bin/copyfiles -E -u 2 \
    -e "**/node_modules/**" \
    "$path/package.json" \
    "$path/README.md" \
    $output_path
