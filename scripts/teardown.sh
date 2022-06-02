#!/bin/bash

usage() {
    echo "Usage:
    -e [The environment to be deleted]" 1>&2;
    exit 1; 
}

getstackname() {
    local stack_name=$( node $script_dir/helpers/get-sam-config-value.js -c $1 -e $environment -v stack_name)

    if [ $? -ne 0 ]; then
        exit 1
    fi

    echo $stack_name
}

deletestack() {
    $script_dir/helpers/teardown-stack.sh -s $1
}

while getopts "e:h" opt; do
    case $opt in
        e)
            environment=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [ -z $environment ]; then
    environment="default"
fi

read -p "Are you sure you want to teardown this environment? [y/N] " choice
choice=$( echo $choice | awk '{ print tolower($1) }' )
case $choice in
    y|yes)
        ;;
    n|no)
        exit 1
        ;;
    *)
        exit 1
        ;;
esac

script_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
root_dir="$( dirname "$script_dir")"

ui_config_path="$root_dir/ui/samconfig.toml"
if [ ! -f $ui_config_path ]; then
    echo "Error: Cannot find UI config file." >&2
    exit 1
else
    echo "Deleting UI stack..."
    stack_name=$(getstackname $ui_config_path)

    deletestack $stack_name
fi

keyphrase_config_path="$root_dir/services/keyphrase/samconfig.toml"
if [ ! -f $keyphrase_config_path ]; then
    echo "Error: Cannot find keyphrase service config file." >&2
    exit 1
else
    echo "Deleting keyphrase service..."
    stack_name=$(getstackname $keyphrase_config_path)

    deletestack $stack_name
fi

crawl_config_path="$root_dir/services/crawl/samconfig.toml"
if [ ! -f $crawl_config_path ]; then
    echo "Error: Cannot find crawl service config file." >&2
    exit 1
else
    echo "Deleting crawl service..."
    stack_name=$(getstackname $crawl_config_path)

    deletestack $stack_name
fi
