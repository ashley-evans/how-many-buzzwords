#!/bin/bash

usage() {
    echo "Usage:
    -c [Mandatory: Path to config file]
    -e [Mandatory: Environment to deploy]
    -f [Force deployment flag]
    -d [Dry run flag]
    -o [Environment parameter overrides]" 1>&2;
    exit 1; 
}

while getopts "c:e:fdo:h" opt; do
    case $opt in
        c)
            config=$OPTARG
            ;;
        e)
            environment=$OPTARG
            ;;
        f)
            force=true
            ;;
        d)
            dryrun=true
            ;;
        o)
            overrides=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $config ]; then
    usage 
fi

optional_params=()
if [ $dryrun ]; then
    optional_params+=(--no-execute-changeset)
elif [ $force ]; then
    optional_params+=(--no-confirm-changeset)
fi

if [ -n "${overrides-}" ]; then
    optional_params+=(--parameter-overrides $overrides)
fi

sam deploy \
    --config-file $config \
    --config-env $environment \
    --no-fail-on-empty-changeset \
    "${optional_params[@]}"
