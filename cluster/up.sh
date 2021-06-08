#!/bin/bash

if [[ $( k3d cluster list | grep "banking" ) ]] ; then
    echo "Cluster already exists:"
    echo
    k3d cluster list | sed 's/^/    /'
    echo
    exit
fi

startTime=$( date '+%s' )

k3d cluster create --config ./cluster/config.yaml
./cluster/build-containers.sh
./cluster/populate-registry.sh

kubectl apply -f cluster/ingress.yaml

kubectl apply -f testdata/service.yaml
kubectl apply -f testdata/deployment.yaml

kubectl apply -f rest-services/instances/customer-service.yaml
kubectl apply -f rest-services/instances/customer-deployment.yaml

echo -n "Waiting for ingress to be created: "
ingressPod=""
while [[ "$ingressPod" == "" ]] ; do
    echo -n "."
    sleep 5
    ingressPod=$( kubectl get pods -n kube-system | grep '^traefik' | cut -d' ' -f1 )
done
echo " $ingressPod"

echo -n "Waiting for ingress pod to start: "
podRunning=""
while [[ "$podRunning" == "" ]] ; do
    echo -n "."
    sleep 5
    podRunning=$( kubectl get pods -n kube-system $ingressPod | grep "1/1" )
done
echo " Running"

startupTime=$( expr $( date '+%s' ) - ${startTime} )
mins=$( expr ${startupTime} / 60 )
secs=$( expr ${startupTime} - $( expr ${mins} '*' 60) )
echo "Cluster started in ${mins}m${secs}s"
