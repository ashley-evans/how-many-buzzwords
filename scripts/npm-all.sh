#!/bin/bash

usage() {
    echo "Usage:
    -c [Mandatory: Executes given npm command on all modules]
    -p [Flag to execute the given npm command in parallel threads]" 1>&2;
    exit 1; 
}

sequential() {
    for folder in $2; do
        echo "Running npm $1 in $folder..."
        npm --prefix $folder $1

        if [ $? -ne 0 ]; then
            exit 1
        fi
    done
}

parallel() {
    for folder in $2; do
        echo "Running npm $1 in $folder..."
        npm --prefix $folder $1 --cache=$folder/.npm-cache &
    done

    wait
}

while getopts "c:ph" opt; do
    case $opt in
        c)
            cmd=$OPTARG
            ;;
        p)
            run_parallel=true
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [[ -z $cmd ]]; then
    usage
fi

root_dir="$( dirname "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

folders=$(find $root_dir ! -path "*/node_modules/*" ! -path "*/.aws-sam/*" ! -path "*/dist/*" -name package.json -printf '%h\n')

if [ $run_parallel ]; then
    parallel "$cmd" "$folders"
else
    sequential "$cmd" "$folders"
fi
