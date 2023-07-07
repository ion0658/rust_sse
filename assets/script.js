let id = 0;
let eventSource = new EventSource("sse");

eventSource.addEventListener("open", function (event) {
    console.log("Connection opened", event);
    let elm = document.getElementById("sse-status");
    elm.innerHTML = "Connected";
});
eventSource.addEventListener("error", function (event) {
    console.log("Error occurred", event);
    let elm = document.getElementById("sse-status");
    elm.innerHTML = "Error occurred";
});

eventSource.addEventListener("message", function (event) {
    console.log("message event received", event.data);
    let parent = document.getElementById("messages");
    let msg_log_eln = document.createElement("li");
    let data = JSON.parse(event.data);
    let msg = data.msg;
    let timestamp = new Date(data.timestamp);
    let time_elm = document.createElement("span");
    time_elm.innerHTML = timestamp.toLocaleString();
    let msg_elm = document.createElement("span");
    msg_elm.innerHTML = msg;
    msg_log_eln.appendChild(time_elm);
    msg_log_eln.appendChild(msg_elm);
    parent.appendChild(msg_log_eln);
});

document.getElementById("send-msg-button").addEventListener("click", async function () {
    let text_elm = document.getElementById("sse-msg");
    let text = text_elm.value;
    text_elm.value = "";
    let now = new Date();
    let msg = { id: id++, msg: text, timestamp: now.toISOString() };
    console.log("Sending message", msg);
    await fetch("/post", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(msg),
    });
});
