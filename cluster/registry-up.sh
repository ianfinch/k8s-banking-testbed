#!/bin/bash
#
# Create a local registry and populate it with standard images

k3d registry create banking-registry
./cluster/registry-init.sh
