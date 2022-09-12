#!/bin/bash

usage() {
    echo "Usage:
    -c [Mandatory: Executes given npm command on all modules]
    -p [Flag to execute the given npm command in parallel threads]
    -t [Number of threads to execute npm command across. Default 5]
    -r [Path to root folder to scope search]" 1>&2;
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
            output=$(npm --prefix $folder $1 --cache=$folder/.npm-cache --loglevel=error --progress=false)
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
        exit_code=$?
        if [ $exit_code -ne 0 ] && [ $exit_code -ne 127 ]; then
            wait
            exit 1
        fi
    done

    exit 0
}

while getopts "c:pt:r:h" opt; do
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
        r)
            root_dir=$OPTARG
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

if [ -z $root_dir ]; then
    root_dir="$( dirname "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
fi

folders=$(find $root_dir ! -path "*/node_modules/*" ! -path "*/.aws-sam/*" ! -path "*/dist/*" -name package-lock.json -printf '%h\n')

if [ $run_parallel ]; then
    if [ -z $threads ]; then
        threads=5
    fi

    parallel "$cmd" "$folders" $threads
else
    sequential "$cmd" "$folders"
fi
