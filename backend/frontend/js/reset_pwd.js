const form = document.querySelector(".form");
const pwd = document.getElementById("pwd");
const con_pwd = document.getElementById("con_pwd");
const submitBtn = document.querySelector(".submit");
const err = document.querySelector(".input_err");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    err.classList.remove("show");

    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";
    submitBtn.style.backgroundColor = "gray";
    submitBtn.style.cursor = "not-allowed";

    if (pwd.value.trim() !== con_pwd.value.trim()) {

    submitBtn.disabled = false;
    submitBtn.textContent = "Update";
    submitBtn.style.backgroundColor = "";
    submitBtn.style.cursor = "pointer";

    err.textContent = "Passwords do not match.";
    err.classList.add("show");

    return;
}

    const response = await fetch("/reset-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            password: pwd.value.trim(),
            confirmPassword: con_pwd.value.trim()
        })
    });

    const data = await response.json();

    if (!response.ok) {

        submitBtn.disabled = false;
        submitBtn.textContent = "Update";
        submitBtn.style.backgroundColor = "";
        submitBtn.style.cursor = "pointer";

        err.textContent = data.message;
        err.classList.add("show");

        return;
    }

    window.location.href = "/main";
});

window.addEventListener("DOMContentLoaded", async () => {

    const response = await fetch("/reset-user");

    if (!response.ok) {
        window.location.href = "/";
        return;
    }

    const data = await response.json();

    document.getElementById("username").textContent = data.username;
});

const togglePwd = document.getElementById("togglePwd");
const toggleConPwd = document.getElementById("toggleConPwd");

togglePwd.addEventListener("click", () => {
    pwd.type = pwd.type === "password" ? "text" : "password";
});

toggleConPwd.addEventListener("click", () => {
    con_pwd.type = con_pwd.type === "password" ? "text" : "password";
});