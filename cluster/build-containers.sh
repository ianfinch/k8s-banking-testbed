#!/bin/bash

. ./cluster/images.sh

for image in "${images[@]}" ; do
    echo "Image $image"

    lastBuilt=$( docker inspect $image \
                     | grep LastTagTime \
                     | sed -E 's/^.*([0-9]{4}-[0-9]{2}-[0-9]{2})T([0-9]{2}:[0-9]{2}).*/\1 \2/' )
    echo "- Last build: $lastBuilt"

    instance=""
    dir=$( echo "$image" | cut -d'-' -f2 )
    if [[ ! -e $dir ]] ; then
       instance="rest-services/instances/${dir}.js"
       dir="rest-services"
    fi

    timestampAnalysis=$(
        ls -l --time-style=long-iso $dir $instance | grep '^-' | grep -v '.yaml' \
                                                   | sed -E 's/^.*([0-9]{4}-.*)/\1/' \
                                                   | while read file ; do
            if [[ "$file" > "$lastBuilt" ]] ; then
                echo "- Newer file: $file"
            fi
        done
    )
    echo "$timestampAnalysis"

    if [[ $( echo "$timestampAnalysis" | grep "Newer" ) ]] ; then
        echo "- Image build needed"
        if [[ "$instance" == "" ]] ; then
            docker build -t $image -f ./${dir}/Dockerfile ./${dir}
        else
            docker build -t $image -f ./${dir}/Dockerfile --build-arg REST_SERVICE=$( echo ${instance} | sed 's|^rest-services/||' ) ./${dir}
        fi
    fi
done
