#!/bin/bash

usage() {
    echo "Usage:
    -p [Mandatory: Path to package folder]" 1>&2;
    exit 1; 
}

while getopts "p:h" opt; do
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

package_name=$(jq -r .name $path/package.json)
deployed_version=$(npm view $package_name version --registry https://npm.pkg.github.com)
file_version=$(jq -r .version $path/package.json)

if [ "$deployed_version" = "$file_version" ]; then
    echo "Version has already been deployed."
    exit 1
else
    versions=($file_version $deployed_version)

    IFS=$'\n'
    sorted=($(sort -V <<< "${versions[*]}"))
    unset IFS

    if [ "${sorted[1]}" = "$file_version" ]; then
        echo "Version is newer than that deployed."
        exit 0
    else
        echo "Version is older than that deployed."
        exit 2
    fi
fi
