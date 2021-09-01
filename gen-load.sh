#!/bin/bash
#
# Generate some load by performing a variety of requests
#
server="http://localhost:8080"
maxrand=$( echo "2 ^ 15 - 1" | bc )
callsSoFar=0
spinner=0

# Colours
WHITE=$( echo -e "\033[38;2;255;255;255m" )
GREY=$( echo -e "\033[38;5;245m" )
GREEN=$( echo -e "\033[38;5;46m" )
AMBER=$( echo -e "\033[38;5;166m" )
RED=$( echo -e "\033[38;5;196m" )
BLUE=$( echo -e "\033[38;5;39m" )
PLAIN=$( echo -e "\033[0m" )

# Backgrounds
BG_WHITE=$( echo -e "\033[48;2;255;255;255m" )
BG_SOLARIZED=$( echo -e "\033[48;2;0;43;54m" )

# Icons
TICK=$( echo -e "\u2714" )
CROSS=$( echo -e "\u2718" )
SPINNER_1=$( echo -e "\u25d0" )
SPINNER_2=$( echo -e "\u25d3" )
SPINNER_3=$( echo -e "\u25d1" )
SPINNER_4=$( echo -e "\u25d2" )

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

# Display the header
__display_header() {

    echo "${CLEAR}${BG_SOLARIZED}$hrule${PLAIN}"
    echo "${BG_SOLARIZED}${CLEAR_LINE}${WHITE}${BOLD} GENERATING LOAD${PLAIN}"
    echo "${BG_SOLARIZED}$hrule${PLAIN}"
    echo "${BG_SOLARIZED}${CLEAR_LINE}"
    echo "${BG_SOLARIZED}${CLEAR_LINE}"
    echo "${BG_SOLARIZED}${CLEAR_LINE}"
    echo "${BG_SOLARIZED}${CLEAR_LINE}"
    echo "${BG_SOLARIZED}${CLEAR_LINE}"
    echo "${BG_SOLARIZED}$hrule${PLAIN}"
}

ticker() {

    POSITION=$( echo -e "\033[${1};H" )
    OFFSET=$( echo -e "\033[${1};30H" )
    END_LINE=$( echo -e "\033[9;H" )

    callsSoFar=$( echo "$callsSoFar + 1" | bc )
    if [[ $( echo "$callsSoFar % 10" | bc ) -eq 0 ]] ; then
        if [[ "$spinner" -eq 0 ]] ; then
            echo "${POSITION}${BG_SOLARIZED} ${SPINNER_1}  $2${OFFSET}$( printf %4d $callsSoFar )"
            spinner=1
        elif [[ "$spinner" -eq 1 ]] ; then
            echo "${POSITION}${BG_SOLARIZED} ${SPINNER_2}  $2${OFFSET}$( printf %4d $callsSoFar )"
            spinner=2
        elif [[ "$spinner" -eq 2 ]] ; then
            echo "${POSITION}${BG_SOLARIZED} ${SPINNER_3}  $2${OFFSET}$( printf %4d $callsSoFar )"
            spinner=3
        elif [[ "$spinner" -eq 3 ]] ; then
            echo "${POSITION}${BG_SOLARIZED} ${SPINNER_4}  $2${OFFSET}$( printf %4d $callsSoFar )"
            spinner=0
        fi
        echo ${END_LINE}
    fi
}

customerJourney() {

    # Details for ticker
    label="Customer journey"
    row=5

    for i in {1..1000} ; do

        # Choose a random customer
        rand=$( echo "100 * $RANDOM / $maxrand + 1" | bc )

        # Grab the list of customers and choose one at random
        id=$( curl --silent ${server}/customers | jq -r .[].customerId | tail -${rand} | head -1 )
        ticker $row "$label"

        # Get the details for that customer
        curl --silent ${server}/customers/${id} > /dev/null
        ticker $row "$label"

        # Get the customer's contacts
        contacts=$( curl --silent ${server}/customers/${id}/contacts | jq -r .[].contactId )
        ticker $row "$label"

        # Get the customer's accounts
        accounts=$( curl --silent ${server}/customers/${id}/accounts | jq -r .[].accountId )
        ticker $row "$label"
    done
}

frontend() {
    label="Frontend"
    row=4

    for i in {1..1000} ; do
        curl --silent ${server} > /dev/null
        ticker $row "$label"
    done
}

contactsJourney() {
    label="Contacts journey"
    row=6

    for i in {1..1000} ; do

        rand=$( echo "120 * $RANDOM / $maxrand + 1" | bc )

        id=$( curl --silent ${server}/contacts | jq -r .[].contactId | tail -${rand} | head -1 )
        ticker $row "$label"

        curl --silent ${server}/contacts/${id} > /dev/null
        ticker $row "$label"

        customers=$( curl --silent ${server}/contacts/${id}/customers | jq -r .[].customerId )
        ticker $row "$label"
    done
}

accountsJourney() {
    label="Accounts journey"
    row=7

    for i in {1..1000} ; do

        rand=$( echo "150 * $RANDOM / $maxrand + 1" | bc )

        id=$( curl --silent ${server}/accounts | jq -r .[].accountId | tail -${rand} | head -1 )
        ticker $row "$label"

        curl --silent ${server}/accounts/${id} > /dev/null
        ticker $row "$label"

        curl --silent ${server}/accounts/${id}/customers > /dev/null
        ticker $row "$label"

        curl --silent ${server}/accounts/${id}/transactions > /dev/null
        ticker $row "$label"
    done
}

tests() {
    label="Test suite"
    row=8

    for i in {1..300} ; do
        curl --silent ${server}/tests > /dev/null
        ticker $row "$label"
    done
}

__display_header

frontend &
customerJourney &
contactsJourney &
accountsJourney &
tests &
wait
