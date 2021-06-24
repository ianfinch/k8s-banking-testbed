#!/bin/bash
#
# Generate some load by performing a variety of requests
#
server="http://localhost:8080"
maxrand=$( echo "2 ^ 15 - 1" | bc )

frontend() {

    for i in {1..1000} ; do
        curl --silent ${server} > /dev/null
        echo -n "."
    done
}

customerJourney() {

    for i in {1..1000} ; do

        # Choose a random customer
        rand=$( echo "100 * $RANDOM / $maxrand + 1" | bc )

        # Grab the list of customers and choose one at random
        id=$( curl --silent ${server}/customers | jq -r .[].customerId | tail -${rand} | head -1 )
        echo -n "."

        # Get the details for that customer
        curl --silent ${server}/customers/${id} > /dev/null
        echo -n "."

        # Get the customer's contacts
        contacts=$( curl --silent ${server}/customers/${id}/contacts | jq -r .[].contactId )
        echo -n "."

    # Get the customer's accounts
#    accounts=$( curl --silent ${server}/customers/${id}/accounts | jq -r .[].accountId )
#    echo "${accounts}" | sed 's/^/- Account /'
    done
}

contactsJourney() {

    for i in {1..1000} ; do
        curl --silent ${server}/contacts > /dev/null
        echo -n "."
    done
}

frontend &
customerJourney &
contactsJourney &
wait
echo
