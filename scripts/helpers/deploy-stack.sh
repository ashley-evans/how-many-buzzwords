#!/bin/bash

usage() {
    echo "Usage:
    -c [Mandatory: Path to config file]
    -e [Mandatory: Environment to deploy]
    -f [Force deployment flag]
    -o [Environment parameter overrides]" 1>&2;
    exit 1; 
}

while getopts "c:e:fo:h" opt; do
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

if [ $force ]; then
    if [[ -z $overrides ]]; then
        sam deploy --config-file $config --no-confirm-changeset --config-env $environment
    else
        sam deploy --config-file $config --no-confirm-changeset --config-env $environment --parameter-overrides $overrides
    fi
else
    if [[ -z $overrides ]]; then
        sam deploy --config-file $config --config-env $environment
    else
        sam deploy --config-file $config --config-env $environment --parameter-overrides $overrides
    fi
fi
