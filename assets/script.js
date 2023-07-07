document.addEventListener("DOMContentLoaded", function () {
    let id = 0;
    const eventSource = new EventSource("sse");

    eventSource.addEventListener("open", function (event) {
        console.log("Connection opened", event);
        const elm = document.getElementById("sse-status");
        elm.innerHTML = "Connected";
    });
    eventSource.addEventListener("error", function (event) {
        console.log("Error occurred", event);
        const elm = document.getElementById("sse-status");
        elm.innerHTML = "Error occurred";
    });

    eventSource.addEventListener("message", function (event) {
        const data = JSON.parse(event.data);
        console.log("message event received", data);
        const parent = document.getElementById("messages");
        const msg_log_elm = document.createElement("li");

        const msg = data.msg;
        const timestamp = new Date(data.timestamp);
        const time_elm = document.createElement("span");
        time_elm.innerHTML = timestamp.toLocaleString();
        const msg_elm = document.createElement("span");
        msg_elm.innerHTML = msg;
        msg_log_elm.appendChild(time_elm);
        msg_log_elm.appendChild(msg_elm);
        parent.prepend(msg_log_elm);
    });

    document.getElementById("send-msg-button").addEventListener("click", async function () {
        const text_elm = document.getElementById("sse-msg");
        const text = text_elm.value;
        text_elm.value = "";
        const now = new Date();
        const msg = { id: id++, msg: text, timestamp: now.toISOString() };
        console.log("Sending message", msg);
        await fetch("/post", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(msg),
        });
    });
});
