#!/bin/sh

kubectl describe ing
kubectl logs -f -l project=banking --max-log-requests 10
