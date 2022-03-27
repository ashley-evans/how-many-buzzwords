#!/bin/bash

usage() {
    echo "Usage:
    -c [Mandatory: Executes given npm command on all modules]
    -p [Flag to execute the given npm command in parallel threads]
    -t [Number of threads to execute npm command across. Default 5]" 1>&2;
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
    declare -A pids
    for folder in $2; do
        echo "Running npm $1 in $folder..."
        (
            output=$(npm --prefix $folder $1 --cache=$folder/.npm-cache)
            if [ $? -ne 0 ]; then
                echo "An error occurred during execution of npm $1 in $folder:"
                echo "$output"

                exit 1
            fi
        ) &
        
        pids[$folder]=$!
        job_count=$(jobs -r -p | wc -l)
        if [[ $job_count -ge $3 ]]; then
            wait -n
            if [ $? -ne 0 ]; then
                wait
                exit 1
            fi
        fi
    done

    for key in ${!pids[@]}; do
        wait ${pids[${key}]}
        if [ $? -ne 0 ]; then
            wait
            exit 1
        fi
    done
}

while getopts "c:pt:h" opt; do
    case $opt in
        c)
            cmd=$OPTARG
            ;;
        p)
            run_parallel=true
            ;;
        t)
            threads=$OPTARG
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
    if [ -z $threads ]; then
        threads=5
    fi

    parallel "$cmd" "$folders" $threads
else
    sequential "$cmd" "$folders"
fi
