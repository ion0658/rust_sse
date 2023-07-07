document.addEventListener("DOMContentLoaded", async function () {
    const id = await fetch("/id").then((res) => res.json());
    console.log("ID", id);
    const eventSource = new EventSource("sse");

    eventSource.addEventListener("open", async function (event) {
        console.log("Connection opened", event);
        const elm = document.getElementById("sse-status");
        elm.innerHTML = "Connected";
        await fetch("/post", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: id, msg: `Hello!`, timestamp: new Date().toISOString() }),
        });
    });
    eventSource.addEventListener("error", function (event) {
        console.log("Error occurred", event);
        const elm = document.getElementById("sse-status");
        elm.innerHTML = "Error occurred";
    });
    eventSource.addEventListener("close", async function (event) {
        console.log("Connection closed", event);
        const elm = document.getElementById("sse-status");
        elm.innerHTML = "Closed";
        await fetch("/post", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id: id, msg: `Good bye!`, timestamp: new Date().toISOString() }),
        });
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
        const id_elm = document.createElement("span");
        id_elm.innerHTML = data.id;
        const msg_elm = document.createElement("span");
        msg_elm.innerHTML = msg;
        msg_log_elm.appendChild(time_elm);
        msg_log_elm.appendChild(id_elm);
        msg_log_elm.appendChild(msg_elm);
        parent.prepend(msg_log_elm);
    });

    document.getElementById("send-msg-button").addEventListener("click", async function () {
        const text_elm = document.getElementById("sse-msg");
        const text = text_elm.value;
        text_elm.value = "";
        const msg = { id: id, msg: text, timestamp: new Date().toISOString() };
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
