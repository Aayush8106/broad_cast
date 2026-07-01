const sidebar = document.getElementById("user_info");
const userImg = document.getElementById("user_img");
const burger = document.getElementById("burger");

/* ---------------- SIDEBAR ---------------- */
userImg?.addEventListener("click", () => {
    sidebar?.classList.remove("collapsed");
    burger?.classList.add("active");
    if (userImg) userImg.style.display = "none";
});

burger?.addEventListener("click", () => {
    sidebar?.classList.add("collapsed");
    burger?.classList.remove("active");
    if (userImg) userImg.style.display = "block";
});

/* keep state sync */
if (sidebar && !sidebar.classList.contains("collapsed")) {
    burger?.classList.add("active");
    if (userImg) userImg.style.display = "none";
}

/* ---------------- RADIO + BUTTON ---------------- */
const radios = document.querySelectorAll('input[name="status"]');
const btn = document.querySelector(".ui-btn");

function updateButton() {
    const selected = document.querySelector('input[name="status"]:checked');
    if (selected) btn.classList.add("active-btn");
    else btn.classList.remove("active-btn");
}

radios.forEach(r => r.addEventListener("change", updateButton));
updateButton();

/* ---------------- COLLEGE MODAL ---------------- */

const collegeModal = document.getElementById("collegeModal");
const collegePassword = document.getElementById("collegePassword");
const collegeJoinBtn = document.getElementById("collegeJoinBtn");
const collegeCancelBtn = document.getElementById("collegeCancelBtn");
const collegeError = document.getElementById("collegeError");

/* ---------------- GET IN ---------------- */

document.getElementById("getInBtn")?.addEventListener("click", async () => {

    const selected = document.querySelector('input[name="status"]:checked');

    if (!selected) {
        alert("Select an option first");
        return;
    }

    // PUBLIC
    if (selected.id === "css") {
        window.location.href = "public.html";
        return;
    }

    // COLLEGE
    if (selected.id === "html") {

        try {

            const res = await fetch("/api/check-college-access", {
                credentials: "include"
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                alert(data.message || "Server error");
                return;
            }

            // Already authorized → skip password
            if (data.authorized) {
                window.location.href = "/collage.html";
                return;
            }

            // First time user → show password modal
            collegePassword.value = "";
            collegeError.classList.add("hidden");

            collegeModal.classList.remove("hidden");
            collegeModal.classList.add("flex");

        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    }

});

/* ---------------- CLOSE MODAL ---------------- */

function closeCollegeModal() {
    collegeModal.classList.add("hidden");
    collegeModal.classList.remove("flex");
}

collegeCancelBtn?.addEventListener("click", closeCollegeModal);

collegeModal?.addEventListener("click", (e) => {
    if (e.target === collegeModal) {
        closeCollegeModal();
    }
});

/* ---------------- ENTER KEY ---------------- */

collegePassword?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        collegeJoinBtn.click();
    }
});

/* ---------------- JOIN BUTTON ---------------- */

collegeJoinBtn?.addEventListener("click", async () => {

    const pwd = collegePassword.value.trim();

    if (!pwd) {
        collegeError.textContent = "Password required.";
        collegeError.classList.remove("hidden");
        return;
    }

    try {

        const res = await fetch("/college-access", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                password: pwd
            })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            collegeError.textContent = data.message || "Wrong password";
            collegeError.classList.remove("hidden");
            return;
        }

        closeCollegeModal();

        window.location.href = "/collage.html";

    } catch (err) {

        console.error("College access error:", err);

        collegeError.textContent = "Server error";
        collegeError.classList.remove("hidden");

    }

});

/* ---------------- LOAD USER ---------------- */
async function loadUser() {
    try {
        const res = await fetch("/api/me", {
            credentials: "include"
        });

        if (!res.ok) return;

        const data = await res.json();

        const emailEl = document.getElementById("userEmail");
        if (emailEl && data.email) {
            emailEl.textContent = data.email;
        }

        const nameEl = document.getElementById("userName");
        if (nameEl && data.name) {
            nameEl.textContent = data.name;
        }

    } catch (err) {
        console.log("loadUser error:", err);
    }
}

loadUser();

/* ---------------- PROFILE MODAL ---------------- */
const profileBtn = document.getElementById("profileBtn");
const profileModal = document.getElementById("profileModal");
const closeProfileModalBtn = document.getElementById("closeProfileModal");

profileBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    profileModal?.classList.add("show");
});

profileModal?.addEventListener("click", (e) => {
    if (e.target === profileModal) {
        profileModal.classList.remove("show");
    }
});

closeProfileModalBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    profileModal?.classList.remove("show");
});

/* ---------------- UPDATE NAME ---------------- */
const updateBtn = document.getElementById("btn");
const input = document.querySelector("#new_name input");
const errBox = document.querySelector(".input_err");

updateBtn?.addEventListener("click", async () => {
    const name = input.value.trim().toLowerCase();
    if (!name) return;

    updateBtn.disabled = true;
    updateBtn.querySelector("span").textContent = "Updating...";
    errBox?.classList.remove("show");

    try {
        const res = await fetch("/api/update-name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ name })
        });

        const data = await res.json();

        if (!res.ok) {
            errBox.textContent = data.error || data.message || "Error";
            errBox.classList.add("show");
        } else {
            const nameEl = document.getElementById("userName");
            if (nameEl) nameEl.textContent = data.name;

            input.value = "";
        }

    } catch (err) {
        console.log("update error:", err);
    }

    updateBtn.disabled = false;
    updateBtn.querySelector("span").textContent = "Update";
});

/* ---------------- LOGOUT ---------------- */
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const logoutConfirmBtn = document.getElementById("logoutConfirmBtn");
const cancelBtn = document.querySelector(".card-button.secondary");

/* open modal */
logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    logoutModal?.classList.add("show");
});

/* cancel */
cancelBtn?.addEventListener("click", () => {
    logoutModal?.classList.remove("show");
});

/* confirm logout */
logoutConfirmBtn?.addEventListener("click", async () => {
    try {
        const res = await fetch("/logout", {
            method: "POST",
            credentials: "include"
        });

        const data = await res.json();

        if (data.success) {
            window.location.href = "/login.html";
        } else {
            alert("Logout failed");
        }

    } catch (err) {
        console.log("logout error:", err);
        alert("Server not reachable");
    }
});

/* ---------------- TOTAL USERS ---------------- */
async function loadUsers() {
    try {
        const res = await fetch("/api/total-users");
        const data = await res.json();

        const el = document.querySelector("#submit_form h6 span");
        if (el && data.count !== undefined) {
            el.textContent = data.count;
        }

    } catch (err) {
        console.log("total users error:", err);
    }
}

loadUsers();
setInterval(loadUsers, 5000);

/* ---------------- ESC CLOSE ---------------- */
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        profileModal?.classList.remove("show");
        logoutModal?.classList.remove("show");
    }
});