const messages = document.getElementById("messages");
const input = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const usersList = document.getElementById("usersList");

const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menuBtn");
const closeSidebar = document.getElementById("closeSidebar");
const exitBtn = document.getElementById("exitBtn");

const userImg = "./favicons/anonymity.png";

let isCooldown = false;
let currentUser = null;

/* ---------------- PING ---------------- */
setInterval(() => {
    fetch("/api/college-ping", {
        method: "POST",
        credentials: "include"
    });
}, 1500);

/* ---------------- SIDEBAR ---------------- */
menuBtn?.addEventListener("click", () => {
    sidebar?.classList.add("show");
});

closeSidebar?.addEventListener("click", () => {
    sidebar?.classList.remove("show");
});

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

/* ---------------- SAFE TEXT ---------------- */
function formatText(text) {
    return text
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
}

/* ---------------- ADD MESSAGE ---------------- */
function addMessage(text, name, time, isSelf) {

    const msg = document.createElement("div");
    msg.classList.add("message", isSelf ? "right" : "left");

    msg.innerHTML = `
        <img src="${userImg}" width="35" height="35">

        <div class="bubble">
            <div class="msg-name">${name}</div>
            <div class="msg-text">${formatText(text)}</div>
            <div class="msg-time">${time}</div>
        </div>
    `;

    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
}

/* ---------------- LOAD USER ---------------- */
async function loadUser() {
    try {
        const res = await fetch("/api/me", {
            credentials: "include"
        });

        if (!res.ok) return;

        currentUser = await res.json();

    } catch (err) {
        console.log(err);
    }
}

/* ---------------- LOAD MESSAGES ---------------- */
async function loadMessages() {
    try {
        const res = await fetch("/api/college-messages", {
            credentials: "include"
        });

        const data = await res.json();

        messages.innerHTML = "";

        data.forEach(msg => {

            const isSelf =
                currentUser &&
                msg.user_id === currentUser.id;

            const utcDate = new Date(msg.created_at);

          const time = new Date(msg.created_at).toLocaleTimeString("en-IN", {
           timeZone: "Asia/Kolkata",
           hour: "2-digit",
           minute: "2-digit",
           hour12: true
        });

            

            addMessage(msg.message, msg.name, time, isSelf);
        });

    } catch (err) {
        console.log(err);
    }
}

function startCooldown() {

    let timeLeft = 5;

    isCooldown = true;

    const originalText = sendBtn.textContent;
    const originalBg = sendBtn.style.backgroundColor;
    const originalCursor = sendBtn.style.cursor;

    sendBtn.disabled = true;
    sendBtn.style.pointerEvents = "none";
    sendBtn.style.opacity = "0.6";
    sendBtn.style.backgroundColor = "#7d7d7d";
    sendBtn.style.cursor = "not-allowed";

    sendBtn.textContent = timeLeft;

    const timer = setInterval(() => {

        timeLeft--;

        if (timeLeft > 0) {
            sendBtn.textContent = timeLeft;
            return;
        }

        clearInterval(timer);

        isCooldown = false;

        sendBtn.disabled = false;
        sendBtn.style.pointerEvents = "auto";
        sendBtn.style.opacity = "1";
        sendBtn.style.backgroundColor = originalBg;
        sendBtn.style.cursor = originalCursor;

        sendBtn.textContent = originalText;

    }, 1000);
}

/* ---------------- SEND MESSAGE ---------------- */
async function sendMessage() {

    const text = input.value.trim();
    if (!text || isCooldown) return;

    try {
        const res = await fetch("/api/college-send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ message: text })
        });

        const data = await res.json();

        if (!data.success) return;

        const currentTime = new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
           hour12: true
        }).format(new Date());

        addMessage(text, currentUser?.name || "You", currentTime, true);

        input.value = "";
        startCooldown();

    } catch (err) {
        console.log(err);
    }
}

/* ---------------- USERS (FIXED ONLINE BUG) ---------------- */
async function loadUsers() {
    try {
        const res = await fetch("/api/college-users", {
            credentials: "include"
        });

        const users = await res.json();

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
        console.log(err);
    }
}

/* ---------------- EVENTS ---------------- */
sendBtn?.addEventListener("click", sendMessage);

input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

exitBtn?.addEventListener("click", () => {
    window.location.href = "/main";
});

/* ---------------- INIT ---------------- */
window.addEventListener("load", async () => {
    await loadUser();
    await loadMessages();
    await loadUsers();
});

/* AUTO REFRESH */
setInterval(loadMessages, 2000);
setInterval(loadUsers, 3000);