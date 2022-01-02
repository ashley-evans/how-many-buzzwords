#!/bin/bash

usage() {
    echo "Usage:
    -t [Mandatory: Path to template file]
    -c [Mandatory: Path to config file]
    -e [Mandatory: Environment to deploy]
    -f [Force deployment flag]
    -o [Environment parameter overrides]
    --cache [Cache build flag]" 1>&2;
    exit 1; 
}

while getopts "t:c:e:fo:-:h" opt; do
    if [ $opt = "-" ]; then
        opt="${OPTARG%%=*}"
        OPTARG="${OPTARG#$opt}"
        OPTARG="${OPTARG#=}"
    fi

    case $opt in
        t)
            template=$OPTARG
            ;;
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
        cache)
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

if [ -z $template ] || [ -z $config ] || [ -z $environment ]; then
    usage 
fi

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

build_optional_params=()
if [ $cache ]; then
    build_optional_params+=(-c)
fi

$script_dir/build-stack.sh -t $template "${build_optional_params[@]}"

deploy_optional_params=()
if [ $force ]; then
    deploy_optional_params+=(-f)
fi

if [ -n "${overrides-}" ]; then
    deploy_optional_params+=(-o $overrides)
fi

$script_dir/deploy-stack.sh -c $config -e $environment "${deploy_optional_params[@]}"
