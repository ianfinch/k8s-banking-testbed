#!/bin/sh

kubectl logs -f -l project=banking --max-log-requests 10
