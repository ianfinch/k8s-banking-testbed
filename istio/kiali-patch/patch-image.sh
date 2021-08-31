#!/bin/bash
#
# Add in a link back to the banking app, to make any demo easier

# Config
kiali="quay.io/kiali/kiali:v1.34"
patched_image="${kiali}-patched"
container="kiali_to_patch"
remote_file="/opt/kiali/console/index.html"
local_copy="/tmp/$$_kiali_index.html"
fragment_file="$( dirname $0 )/addition.html"
fragment=$( cat $fragment_file )

# If the patched version exists, we don't need to do anything
haveCopy=$( docker images -q -f reference="$patched_image" )
if [[ "$haveCopy" != "" ]] ; then
    exit
fi

# Make sure we have the unpatched version
haveCopy=$( docker images -q -f reference="$kiali" )
if [[ "$haveCopy" == "" ]] ; then
    docker pull $kiali
fi

# Create a patched version of the image
result=$( docker create --name $container $kiali )
docker cp ${container}:$remote_file $local_copy
sed -i "s|<noscript>|${fragment}<noscript>|" $local_copy
docker cp $local_copy ${container}:$remote_file
result=$( docker commit $container )
docker tag $result "$patched_image"
result=$( docker rm $container )
