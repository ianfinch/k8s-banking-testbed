#!/bin/bash
#
# Generate some load by performing a variety of requests
#
server="http://localhost:8080"
maxrand=$( echo "2 ^ 15 - 1" | bc )
callsSoFar=0
spinner=0

ticker() {

    callsSoFar=$( echo "$callsSoFar + 1" | bc )
    if [[ $( echo "$callsSoFar % 10" | bc ) -eq 0 ]] ; then
        if [[ "$spinner" -eq 0 ]] ; then
            printf "    | %6d\r" $callsSoFar
            spinner=1
        elif [[ "$spinner" -eq 1 ]] ; then
            printf "    / %6d\r" $callsSoFar
            spinner=2
        elif [[ "$spinner" -eq 2 ]] ; then
            printf "    - %6d\r" $callsSoFar
            spinner=3
        elif [[ "$spinner" -eq 3 ]] ; then
            printf "    \ %6d\r" $callsSoFar
            spinner=0
        fi
    fi
}

frontend() {

    for i in {1..1000} ; do
        curl --silent ${server} > /dev/null
        ticker
    done
}

customerJourney() {

    for i in {1..1000} ; do

        # Choose a random customer
        rand=$( echo "100 * $RANDOM / $maxrand + 1" | bc )

        # Grab the list of customers and choose one at random
        id=$( curl --silent ${server}/customers | jq -r .[].customerId | tail -${rand} | head -1 )
        ticker

        # Get the details for that customer
        curl --silent ${server}/customers/${id} > /dev/null
        ticker

        # Get the customer's contacts
        contacts=$( curl --silent ${server}/customers/${id}/contacts | jq -r .[].contactId )
        ticker

        # Get the customer's accounts
        accounts=$( curl --silent ${server}/customers/${id}/accounts | jq -r .[].accountId )
        ticker
    done
}

contactsJourney() {
    for i in {1..1000} ; do

        rand=$( echo "120 * $RANDOM / $maxrand + 1" | bc )

        id=$( curl --silent ${server}/contacts | jq -r .[].contactId | tail -${rand} | head -1 )
        ticker

        curl --silent ${server}/contacts/${id} > /dev/null
        ticker

        customers=$( curl --silent ${server}/contacts/${id}/customers | jq -r .[].customerId )
        ticker
    done
}

accountsJourney() {
    for i in {1..1000} ; do

        rand=$( echo "150 * $RANDOM / $maxrand + 1" | bc )

        id=$( curl --silent ${server}/accounts | jq -r .[].accountId | tail -${rand} | head -1 )
        ticker

        curl --silent ${server}/accounts/${id} > /dev/null
        ticker

        curl --silent ${server}/accounts/${id}/customers > /dev/null
        ticker

        curl --silent ${server}/accounts/${id}/transactions > /dev/null
        ticker
    done
}

tests() {
    for i in {1..1000} ; do
        curl --silent ${server}/tests > /dev/null
        ticker
    done
}

frontend &
customerJourney &
contactsJourney &
accountsJourney &
tests &
wait
echo
