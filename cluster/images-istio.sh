#!/bin/bash

# List of images is here ... https://gcsweb.istio.io/gcs/istio-prerelease/prerelease/1.10.1/docker/

# Somewhere to build up our list of istio images
declare -a istioImages=()

# The list of images we want
declare -a istioLabels=(
    "app"
    "app_sidecar_ubuntu_focal"
    "install-cni"
    "istioctl"
    "operator"
    "pilot"
    "proxyv2"
)

version=$( istioctl version 2> /dev/null )

# Go through the list of images we want, pulling any we don't have and building
# up a fully specified list
for label in "${istioLabels[@]}" ; do
    image="istio/${label}:${version}"
    haveCopy=$( docker images -q -f reference="$image" )

    if [[ "$haveCopy" == "" ]] ; then
        docker pull $image
    fi

    istioImages+=($image)
done
