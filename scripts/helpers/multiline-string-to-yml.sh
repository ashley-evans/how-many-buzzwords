#!/bin/bash

usage() {
    echo "Usage:
    -k [Mandatory: YML Key]
    -v [Mandatory: YML Value]
    -o [Mandatory: Output path]" 1>&2;
    exit 1; 
}

while getopts "k:v:o:h" opt; do
    case $opt in
        k)
            key=$OPTARG
            ;;
        v)
            value=$OPTARG
            ;;
        o)
            output=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [[ -z $key ]] || [[ -z $value ]] || [[ -z $output ]]; then
    usage 
fi

echo "$key: |
$(echo "$value" | sed 's/^/  /')" > $output
