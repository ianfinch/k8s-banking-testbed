#!/bin/bash
# Populate k3d's registry with images from the local registry

registryLabel="k3d-banking-registry"
registryPort=$( docker ps -f name=k3d-banking-registry | grep -o ":[0-9]*->5000" | sed 's/:\([^-]*\)-.*/\1/' )

if [[ "$registryPort" == "" ]] ; then
    echo "ERROR: Unable to find k3d registry to connect to!"
    exit 1
fi

. ./cluster/images.sh

for image in "${images[@]}" ; do
    imageName=$( echo $image | cut -d'/' -f2 )
    newTag="${registryLabel}.localhost:${registryPort}/${imageName}:local"
    docker tag ${image} ${newTag}
    docker push ${newTag}
    docker rmi ${newTag}
done

. ./cluster/images-istio.sh

for image in "${istioImages[@]}" ; do
    newTag="${registryLabel}.localhost:${registryPort}/${image}"
    docker tag ${image} ${newTag}
    docker push ${newTag}
    docker rmi ${newTag}
done
