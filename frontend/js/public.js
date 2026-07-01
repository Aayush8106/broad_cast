const messages = document.getElementById("messages");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const usersList = document.getElementById("usersList");
let isCooldown = false;

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebar = document.getElementById("closeSidebar");

const userImg = "./favicons/anonymity.png";

let currentUser = null;

setInterval(() => {
    fetch("/api/ping", {
        method: "POST",
        credentials: "include"
    });
}, 2000);

/* ---------------- TIME ---------------- */
function getTime() {
    const now = new Date();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;
    minutes = minutes.toString().padStart(2, "0");

    return `${hours}:${minutes} ${ampm}`;
}

/* ---------------- GET USER ---------------- */
async function loadUser() {
    try {
        const res = await fetch("/api/me", {
            credentials: "include"
        });

        currentUser = await res.json();

    } catch (err) {
        console.error("USER LOAD ERROR:", err);
    }
}

/* ---------------- SAFE TEXT ---------------- */
function formatText(text) {
    return text
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

/* ---------------- RENDER MESSAGE ---------------- */
function addMessage(text, name, time, isSelf) {

    const msg = document.createElement("div");
    msg.classList.add("message", isSelf ? "right" : "left");

    msg.innerHTML = `
        <img src="${userImg}" width="35" height="35">

        <div class="bubble">
            <div class="msg-name">${name}</div>

            <div class="msg-text">
                ${formatText(text)}
            </div>

            <div class="msg-time">${time}</div>
        </div>
    `;

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

/* ---------------- SEND MESSAGE ---------------- */
async function sendMessage() {

    const text = input.value.trim();
    if (!text || isCooldown) return;

    try {
        const res = await fetch("/api/send-message", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ message: text })
        });

        const data = await res.json();

        if (!data.success) {
            alert(data.error || "Message failed");
            return;
        }

        addMessage(
            text,
            currentUser?.name || "You",
            getTime(),
            true
        );

        input.value = "";
        startCooldown();

    } catch (err) {
        console.error("SEND ERROR:", err);
    }
}

/* ---------------- LOAD MESSAGES ---------------- */
async function loadMessages() {
    try {
        const res = await fetch("/api/messages", {
            credentials: "include"
        });

        const data = await res.json();

        messages.innerHTML = "";

        data.forEach(msg => {

            const isSelf =
                currentUser &&
                msg.user_id === currentUser.id;

            // ✅ FINAL FIX: IST (+5:30) conversion
            const date = new Date(msg.created_at);

            date.setHours(date.getHours() + 5);
            date.setMinutes(date.getMinutes() + 30);

            const time = date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            addMessage(
                msg.message,
                msg.name,
                time,
                isSelf
            );
        });

    } catch (err) {
        console.error("LOAD ERROR:", err);
    }
}

/* ---------------- COOLDOWN ---------------- */
function startCooldown() {

    let timeLeft = 5;
    isCooldown = true;

    const originalText = sendBtn.innerHTML;

    sendBtn.disabled = true;
    sendBtn.style.background = "gray";
    sendBtn.style.opacity = "0.6";
    sendBtn.style.cursor = "not-allowed";

    sendBtn.innerHTML = timeLeft;

    const timer = setInterval(() => {
        timeLeft--;

        if (timeLeft > 0) {
            sendBtn.innerHTML = timeLeft;
        } else {
            clearInterval(timer);

            sendBtn.innerHTML = originalText;
            sendBtn.disabled = false;
            sendBtn.style.background = "#3b82f6";
            sendBtn.style.opacity = "1";
            sendBtn.style.cursor = "pointer";

            isCooldown = false;
        }
    }, 1000);
}

/* ---------------- EVENTS ---------------- */
sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {

    if (e.key === "Enter" && e.shiftKey) return;

    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

/* ---------------- SIDEBAR ---------------- */
menuBtn.addEventListener("click", () => {
    sidebar.classList.add("show");
});

closeSidebar.addEventListener("click", () => {
    sidebar.classList.remove("show");
});

/* ---------------- EXIT ---------------- */
document.getElementById("exitBtn").addEventListener("click", () => {
    window.location.href = "/main";
});

/* ---------------- INIT ---------------- */
window.addEventListener("load", async () => {
    sidebar.classList.remove("show");
    await loadUsers();
    await loadUser();
    await loadMessages();
});

/* AUTO REFRESH */
setInterval(loadMessages, 2000);
setInterval(loadUsers, 2000);

async function loadUsers() {
    try {

        const res = await fetch("/api/users", {
            credentials: "include"
        });

        const users = await res.json();

        // 🟢 Online users first, then offline
        users.sort((a, b) => {

            // If both have same status, sort alphabetically
            if (a.online === b.online) {
                return a.name.localeCompare(b.name);
            }

            // Online users first
            return b.online - a.online;
        });

        usersList.innerHTML = "";

        users.forEach(user => {

            const div = document.createElement("div");
            div.classList.add("user");

            div.innerHTML = `
                <div class="name">${user.name}</div>
                <div class="status ${user.online ? "online" : "offline"}">
                    ${user.online ? "online" : "offline"}
                </div>
            `;

            usersList.appendChild(div);
        });

    } catch (err) {
        console.error("USERS LOAD ERROR:", err);
    }
}