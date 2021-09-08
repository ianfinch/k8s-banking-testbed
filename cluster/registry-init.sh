#!/bin/bash
# Populate a registry with any standard images we might want to use, to save
# pulling them from docker.io, quay.iotc

registryLabel="k3d-banking-registry"
registryPort=$( docker ps -f name=k3d-banking-registry | grep -o ":[0-9]*->5000" | sed 's/:\([^-]*\)-.*/\1/' )

if [[ "$registryPort" == "" ]] ; then
    echo "ERROR: Unable to find ${registryLabel} to connect to!"
    exit 1
fi

. ./cluster/images-istio.sh

for image in "${istioImages[@]}" ; do
    newTag="${registryLabel}.localhost:${registryPort}/$( echo ${image} |  sed 's|.*/\([^/]*/.*\)|\1|' )"
    docker tag ${image} ${newTag}
    docker push ${newTag}
    docker rmi ${newTag}
done
