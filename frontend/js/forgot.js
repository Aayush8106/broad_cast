const otpSection = document.getElementById("otp-tab");
const emailSection = document.getElementById("email-tab");
const actionBtn = document.getElementById("actionBtn");
const mail_err = document.getElementById("mail_err");
const formContainer = document.querySelector(".form-container");

const form = document.querySelector(".form");
const email = document.getElementById("email");
const otp = document.getElementById("otp");

let otpSent = false;

// Restrict OTP to only 4 digits
otp.addEventListener("input", () => {
    otp.value = otp.value.replace(/\D/g, "").slice(0, 4);
});

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    mail_err.classList.remove("show");
    formContainer.classList.remove("error");

    actionBtn.disabled = true;
    actionBtn.style.backgroundColor = "gray";
    actionBtn.style.cursor = "not-allowed";

    //SEND EMAIL
    if (!otpSent) {

        actionBtn.textContent = "Sending...";

        const response = await fetch("/forgot-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: email.value.trim()
            })
        });

        const data = await response.json();

        if (!response.ok) {

            actionBtn.disabled = false;
            actionBtn.textContent = "Send Email";
            actionBtn.style.backgroundColor = "";
            actionBtn.style.cursor = "pointer";

            if (window.innerWidth > 768) {
                formContainer.classList.add("error");
            }

            mail_err.textContent = data.message;
            mail_err.classList.add("show");

            return;
        }

        otpSent = true;

        mail_err.classList.remove("show");

        if (window.innerWidth > 768) {
            formContainer.classList.remove("error");
        }

        document.querySelector("#email-tab label").style.display = "none";
        email.style.display = "none";
        otpSection.style.display = "flex";

        otp.required = true;
        otp.focus();

        actionBtn.disabled = false;
        actionBtn.textContent = "Verify OTP";
        actionBtn.style.backgroundColor = "";
        actionBtn.style.cursor = "pointer";

        return;
    }

    //VERIFY OTP

    actionBtn.textContent = "Verifying...";

    const response = await fetch("/verify-forgot-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            otp: otp.value.trim()
        })
    });

    const data = await response.json();

    if (!response.ok) {

        actionBtn.disabled = false;
        actionBtn.textContent = "Verify OTP";
        actionBtn.style.backgroundColor = "";
        actionBtn.style.cursor = "pointer";

        if (window.innerWidth > 768) {
            formContainer.classList.add("error");
        }

        mail_err.textContent = data.message;
        mail_err.classList.add("show");

        otp.focus();

        return;
    }

    if (window.innerWidth > 768) {
        formContainer.classList.remove("error");
    }

    window.location.href = "/reset-password";
});