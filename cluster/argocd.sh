#!/bin/bash

if [[ ! $( k3d cluster list | grep "banking" ) ]] ; then
    echo "Cluster does not exist ... create it before running this script"
    exit
fi

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl get all -n argocd
