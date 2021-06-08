#!/bin/sh

k3d cluster create --config ./cluster/config.yaml
./cluster/populate-registry.sh

kubectl apply -f cluster/ingress.yaml

kubectl apply -f testdata/service.yaml
kubectl apply -f testdata/deployment.yaml

kubectl apply -f customer/service.yaml
kubectl apply -f customer/deployment.yaml
