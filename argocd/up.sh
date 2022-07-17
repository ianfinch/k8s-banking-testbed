#!/bin/bash

if [[ ! $( k3d cluster list | grep "banking" ) ]] ; then
    echo "Cluster does not exist ... create it before running this script"
    exit
fi

# Create our namespace (if it doesn't already exist)
if [[ $( kubectl get namespaces | grep "^argocd " ) == "" ]] ; then
    kubectl create namespace argocd
fi

# Enable istio injection
kubectl label namespace argocd istio-injection=enabled

# Deploy argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Patch the ingress to include argocd
mkdir ./argocd/scratch
cp ./cluster/ingress.yaml ./argocd/scratch/ingress.yaml
kubectl apply -k ./argocd/
rm ./argocd/scratch/ingress.yaml
rmdir ./argocd/scratch
