#!/bin/sh

kubectl -n istio-system describe ing
kubectl logs -f -l project=banking --max-log-requests 10
