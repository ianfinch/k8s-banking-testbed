/**
 * Add a service into the display
 */
const addService = (srv, pods, parent) => {
    const elem = document.getElementById(parent)
                         .appendChild(document.createElement("div"));
    elem.setAttribute("id", pods);
    elem.appendChild(document.createElement("div")).innerText = srv;
};

/**
 * Add a group of pods (a deployment) into the display
 */
const addPods = (pods, parent) => {
    pods.forEach(pod => addPod(pod, parent));
};

/**
 * Add a pod into a group of pods
 */
const addPod = (pod, parent) => {
    const elem = document.getElementById(parent)
                         .appendChild(document.createElement("div"));
    elem.classList.add("pod", "status-" + pod.ready.status);
    elem.appendChild(document.createElement("div")).innerText = pod.name;

    pod.ready.containers.forEach(container => {
        addContainer(container, elem);
    });
};

/**
 * Show the log for a container when it is clicked on
 */
const showLog = (event) => {
    const pod = event.target.parentNode.firstChild.innerText;
    const container = event.target.innerText;
    fetch(window.location.origin + "/monitoring/logs/" + pod + "/" + container)
        .then(response => response.json())
        .then(logs => {
            document.getElementById("logs").innerText = "*** LOG FOR " + container + " in " + pod + "\n\n" +
                                                        logs.join("\n");
        })
        .catch(error => {
            document.getElementById("logs").innerText = "*** LOG FOR " + container + " in " + pod + "\n\n" +
                                                        "Error getting logs\n";
        });
};

/**
 * Add a container into a pod
 */
const addContainer = (container, parent) => {
    const elem = parent.appendChild(document.createElement("div"));
    elem.classList.add("container", "status-" + container.status);
    elem.innerText = container.name + "^".repeat(container.restarts);
    elem.addEventListener("click", showLog);
};

/**
 * Show an error message
 */
const showErrorMessage = (msg) => {
    document.getElementById("logs").innerText = "";
    const elem = document.getElementById("monitoring")
                         .appendChild(document.createElement("div"))
                         .innerText = msg;
};

/**
 * Render the monitoring data into our page
 */
const renderMonitoring = (data) => {
    
    document.getElementById("monitoring").innerText = "";

    if (data.error) {
        showErrorMessage(data.error);
        return;
    };

    if (Object.keys(data.services).length === 0) {
        showErrorMessage("No services running");
        return;
    };

    Object.keys(data.services).forEach(service => {
        addService(service, data.services[service], "monitoring");
    });

    Object.keys(data.pods).forEach(pod => {
        addPods(data.pods[pod], pod);
    });
};

// An upper limit for trying to fetch data, if the backend becomes unavailable
var retriesLeft = 10;

/**
 * Get a new set of monitoring stats
 */
const refreshMonitoring = () => {
    fetch(window.location.origin + "/monitoring/data")
        .then(response => response.json())
        .then(renderMonitoring)
        .catch(error => {
            renderMonitoring({ error: "Backend monitoring service has stopped responding (" +
                                      (retriesLeft === 0
                                        ? "no longer refreshing"
                                        : retriesLeft + " attempt" + (retriesLeft === 1 ? "" : "s") + " left") + 
                                      ")" });
            retriesLeft--;
        });
};

/**
 * A loop to continually refresh the monitoring data
 */
const refreshLoop = () => {
    refreshMonitoring();

    if (retriesLeft) {
        setTimeout(() => {
            refreshLoop();
        }, 5000);
    } else {
        renderMonitoring({ error: "Backend monitoring service has stopped responding" });
    }
};

refreshLoop();
