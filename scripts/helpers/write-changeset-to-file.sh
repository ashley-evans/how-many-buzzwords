#!/bin/bash

usage() {
    echo "Usage:
    -c [Mandatory: Command to execute]
    -f [Mandatory: File path to write changeset to]
    -v [Variable prefix, Mandatory if delimeter provided]
    -d [Variable delimeter, Mandatory if prefix provided]" 1>&2;
    exit 1; 
}

while getopts "c:f:v:d:h" opt; do
    case $opt in
        c)
            command=$OPTARG
            ;;
        f)
            filepath=$OPTARG
            ;;
        v)
            variable_name=$OPTARG
            ;;
        d)
            delimeter=$OPTARG
            ;;
        h)
            usage
            ;;
        ?)
            usage
            ;;
    esac
done

if [[ -z $command ]] || [[ -z $filepath ]]; then
    usage 
fi

if [[ $delimeter ]] && [[ -z $variable_name ]]; then
    usage
fi

if [[ $variable_name ]] && [[ -z $delimeter ]]; then
    usage
fi 

exec 5>&1
set -e -o pipefail

output=$(bash -c "$command" | tee >(cat - >&5))

set +e +o pipefail

changeset_start_text="CloudFormation stack changeset"
changeset_end_text="Changeset created successfully"

changeset=$(echo "$output" | sed -n "/$changeset_start_text/,/$changeset_end_text/{/$changeset_end_text/!p;}")

if [[ -z $changeset ]]; then
    exit 0
fi

if [[ $variable_name ]] && [[ $delimeter ]]; then
    echo "$variable_name<<$delimeter" >> $filepath
fi

echo "$changeset" >> $filepath

if [[ $variable_name ]] && [[ $delimeter ]]; then
    echo "$delimeter" >> $filepath
fi
