#!/bin/bash

if [[ $( k3d cluster list | grep "banking" ) ]] ; then
    echo "Cluster already exists:"
    echo
    k3d cluster list
    echo
    exit
fi

# The steps we need to execute
declare -a steps=(
    "Create K3D cluster"
    "Populate K3D registry"
    "Install Istio"
    "Deploy application microservices"
    "Wait for ingress to be available"
)

# Colours
WHITE=$( echo -e "\033[38;2;255;255;255m" )
GREY=$( echo -e "\033[38:5:245m" )
GREEN=$( echo -e "\033[38:5:46m" )
AMBER=$( echo -e "\033[38:5:166m" )
RED=$( echo -e "\033[38:5:196m" )
BLUE=$( echo -e "\033[38:5:39m" )
PLAIN=$( echo -e "\033[0m" )

# Backgrounds
BG_WHITE=$( echo -e "\033[48;2;255;255;255m" )
BG_SOLARIZED=$( echo -e "\033[48;2;0;43;54m" )

# Icons
PENDING=$( echo -e "\u23fb" )
RUNNING=$( echo -e "\u2692" )
TICK=$( echo -e "\u2714" )
CROSS=$( echo -e "\u2718" )

# Control sequences
BOLD=$( echo -e "\033[1m" )
CLEAR=$( echo -e "\033[H\033[J" )
CLEAR_LINE=$( echo -e "\033[K" )
CLEAR_BELOW=$( echo -e "\033[J" )

# Constants
startTime=$( date '+%s' )
timestamp=$startTime
width=$( tput cols )
box_h=$( echo -e "\u2550" )
box_v=$( echo -e "\u2551" )
hrule=$( printf "%${width}s" | sed "s/ /${box_h}/g" )

# Initial display of the steps
__display_steps() {

    # Set up scrolling area
    endOfSteps=$( echo "${#steps[@]} + 5" | bc )
    echo -e "\033[${endOfSteps}r"

    # Display header
    echo "${CLEAR}${BG_SOLARIZED}$hrule${PLAIN}"
    echo "${BG_SOLARIZED}${CLEAR_LINE}${WHITE}${BOLD} SPINNING UP ENVIRONMENT${PLAIN}"
    echo "${BG_SOLARIZED}$hrule${PLAIN}"

    # Display the steps
    for step in "${steps[@]}" ; do
        echo "${BG_SOLARIZED}${CLEAR_LINE}${GREY} ${PENDING} $step${PLAIN}"
    done

    # Separator
    echo "${BG_SOLARIZED}$hrule${PLAIN}"
}

# Clear the output area
__clear_output() {
    endOfSteps=$( echo "${#steps[@]} + 5" | bc )
    RESUME=$( echo -e "\033[${endOfSteps};H" )
    echo -n "${RESUME}${CLEAR_BELOW}"
}

# Clear the scrolling region from the terminal
__reset_scrolling() {
    echo -e "\033[r"
    __clear_output
}

# Calculate how long from start until now
__get_time() {

    now=$( expr $( date '+%s' ) )

    totalTime=$( expr ${now} - ${startTime} )
    totalMins=$( expr ${totalTime} / 60 )
    totalSecs=$( expr ${totalTime} - $( expr ${totalMins} '*' 60) )

    lapTime=$( expr ${now} - ${timestamp} )
    timestamp="${now}"
    lapMins=$( expr ${lapTime} / 60 )
    lapSecs=$( expr ${lapTime} - $( expr ${lapMins} '*' 60) )

    echo -n "${lapMins}m${lapSecs}s / ${totalMins}m${totalSecs}s"
}

# Set the position for displaying a step
__set_step_position() {

    # If there's no parameter, default to zero
    if [[ "$1" == "" ]] ; then
        stepNum=0
    else
        stepNum="$1"
    fi

    # Work out which row on the screen we need
    hpos=$( echo "${stepNum} + 4" | bc )
    POSITION=$( echo -e "\033[${hpos};H" )
    echo -n "${POSITION}"
}

# Start a specific step - parameter is number
__start_step() {

    __set_step_position "$1"
    echo "${POSITION}${BG_SOLARIZED}${CLEAR_LINE}${WHITE} ${RUNNING} ${steps[$stepNum]}${PLAIN}"
    __clear_output
}

# Mark a step as completed
#
# Note we call __get_time directly and rely on it to output the timing, rather
# than using a $( ... ) construct.  This is so that __get_time can update the
# timestamp global.
__step_success() {

    __set_step_position "$1"
    echo -n "${POSITION}${BG_SOLARIZED}${CLEAR_LINE}${GREEN} ${TICK} ${steps[$stepNum]} ("
    __get_time
    echo ")${PLAIN}"
    __clear_output
}

__display_steps

__start_step 0
k3d cluster create --config ./cluster/config.yaml
__step_success 0

__start_step 1
./cluster/build-containers.sh
__clear_output
./cluster/populate-registry.sh
__step_success 1

__start_step 2
istioctl install --set profile=default --set hub="k3d-banking-registry:5000/istio" -y
kubectl apply -f cluster/ingress.yaml
kubectl apply -f cluster/namespaces.yaml
kubectl label namespace default istio-injection=enabled
kubectl label namespace operations istio-injection=enabled
__step_success 2

__start_step 3
kubectl apply -f monitoring/account.yaml
kubectl apply -f monitoring/service.yaml
kubectl apply -f monitoring/deployment.yaml

kubectl apply -f testdata/service.yaml
kubectl apply -f testdata/deployment.yaml

kubectl apply -f frontend/service.yaml
kubectl apply -f frontend/deployment.yaml

kubectl apply -f rest-services/instances/customer-service.yaml
kubectl apply -f rest-services/instances/customer-deployment.yaml

kubectl apply -f rest-services/instances/contacts-service.yaml
kubectl apply -f rest-services/instances/contacts-deployment.yaml

kubectl apply -f rest-services/instances/accounts-service.yaml
kubectl apply -f rest-services/instances/accounts-deployment.yaml

kubectl apply -f rest-services/instances/transactions-service.yaml
kubectl apply -f rest-services/instances/transactions-deployment.yaml

kubectl apply -f tests/service.yaml
kubectl apply -f tests/deployment.yaml

kubectl apply -f istio/prometheus.yaml
kubectl apply -f istio/grafana.yaml
kubectl apply -f istio/kiali.yaml
__step_success 3

__start_step 4
echo -n "Waiting for ingress to be created: "
ingressPod=""
while [[ "$ingressPod" == "" ]] ; do
    echo -n "."
    sleep 5
    ingressPod=$( kubectl get pods -n istio-system | grep '^istio-ingressgateway' | cut -d' ' -f1 )
done
echo " $ingressPod"

echo -n "Waiting for ingress pod to start: "
podRunning=""
while [[ "$podRunning" == "" ]] ; do
    echo -n "."
    sleep 5
    podRunning=$( kubectl get pods -n istio-system $ingressPod | grep "1/1" )
done
__step_success 4

__reset_scrolling
