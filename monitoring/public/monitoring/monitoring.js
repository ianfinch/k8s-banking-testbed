/**
 * Add a service into the display
 */
const addService = (srv, pods, parent) => {
    const elem = document.getElementById(parent)
                         .appendChild(document.createElement("div"));
    elem.setAttribute("id", pods);
    elem.appendChild(document.createElement("div")).innerText = srv;
    return elem;
};

/**
 * Add a group of pods (a deployment) into the display
 */
const addPods = (pods, parent, rootElem) => {
    pods.forEach(pod => addPod(pod, parent, rootElem));
};

/**
 * Add a pod into a group of pods
 */
const addPod = (pod, parent, rootElem) => {
    let parentElem = document.getElementById(parent);
    if (!parentElem) {
        parentElem = addService("no service", parent, rootElem);
    }
    const elem = parentElem.appendChild(document.createElement("div"));
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
    const container = event.target.innerText.replace(/\^.*/, "");
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
    if (container.restarts) {
        elem.innerText = container.name + "^" + container.restarts;
    } else {
        elem.innerText = container.name;
    }
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

    Object.keys(data.services).sort().forEach(service => {
        addService(service, data.services[service], "monitoring");
    });

    Object.keys(data.pods).forEach(pod => {
        addPods(data.pods[pod], pod, "monitoring");
    });
};

// A count of our retries
var retries = 0;

/**
 * Get a new set of monitoring stats
 */
const refreshMonitoring = () => {
    fetch(window.location.origin + "/monitoring/data")
        .then(response => response.json())
        .then(renderMonitoring)
        .catch(error => {
            renderMonitoring({ error: "Backend monitoring service has stopped responding (retry " +
                                      retries + ")" });
            retries++;
        });
};

/**
 * A loop to continually refresh the monitoring data
 */
const refreshLoop = () => {

    refreshMonitoring();
    setTimeout(() => {
        refreshLoop();
    }, 5000);
};

refreshLoop();
