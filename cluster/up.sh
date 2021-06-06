#!/bin/sh

k3d cluster create --config ./cluster/config.yaml
./cluster/populate-registry.sh

kubectl apply -f testdata/service.yaml
kubectl apply -f testdata/deployment.yaml
kubectl apply -f testdata/ingress.yaml
