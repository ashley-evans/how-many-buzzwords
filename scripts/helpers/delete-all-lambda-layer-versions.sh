#!/bin/bash

usage() {
    echo "Usage:
    -l [Name of layer to delete]" 1>&2;
    exit 1; 
}

while getopts "l:h" opt; do
    case $opt in
        l)
            layer=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $layer ]; then
    usage 
fi

versions=$(aws lambda list-layer-versions --layer-name $layer | jq -r '.LayerVersions[] | { Version } | join(" ")')

for version in $versions; do
    echo "Deleting layer: $layer, Version: $version"
    aws lambda delete-layer-version --layer-name $layer --version-number $version
done
