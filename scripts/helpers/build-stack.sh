#!/bin/bash

usage() {
    echo "Usage:
    -t [Mandatory: Path to template file]
    -c [Cache build flag]" 1>&2;
    exit 1; 
}

while getopts "t:ch" opt; do
    case $opt in
        t)
            template=$OPTARG
            ;;
        c)
            cache=true
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $template ]; then
    usage 
fi

optional_params=()
if [ $cache ]; then
    optional_params+=(--cached)
fi

sam build --parallel --template-file $template "${optional_params[@]}"
