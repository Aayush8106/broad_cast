//redirecting to home page when user exits from otp page
document.getElementById("exitBtn").addEventListener("click",()=>{
    window.location.href="/";
});


//resend btn
const resendBtn = document.getElementById("resendBtn");
let timeLeft=60;
resendBtn.disabled = true;
resendBtn.style.color = "gray";
const timer = setInterval(() => {
    timeLeft--;
    resendBtn.textContent = `Resend in ${timeLeft}s`;

    if (timeLeft === 0) {
        clearInterval(timer);
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend Code";
        resendBtn.style.color = "rgb(127, 129, 255)";
    }
}, 1000);

//disable resend btn
resendBtn.addEventListener("click", async() => {
    await fetch("/resend-otp",{method:"POST"});
    resendBtn.disabled = true;
    resendBtn.style.color = "gray";
    resendBtn.textContent="Code Sent";
    // send resend request
});

//sending otp to verify
const form=document.getElementById("form");
const otp=document.getElementById("otp");

form.addEventListener("submit",()=>{
    otp.value=document.getElementById("otp-input1").value +
              document.getElementById("otp-input2").value +
              document.getElementById("otp-input3").value +
              document.getElementById("otp-input4").value;
});

//otp digit verifier
const otpInputs = document.querySelectorAll(".otp-input");

otpInputs.forEach((input, index) => {
    input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "");

        if (input.value.length === 1 && index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && input.value === "" && index > 0) {
            otpInputs[index - 1].focus();
        }
    });
});

const verifyBtn = document.getElementById("verifyBtn");

const err_msg = document.getElementById("invalid");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    otp.value =
        document.getElementById("otp-input1").value +
        document.getElementById("otp-input2").value +
        document.getElementById("otp-input3").value +
        document.getElementById("otp-input4").value;

    verifyBtn.disabled = true;
    verifyBtn.textContent = "Verifying...";
    verifyBtn.style.backgroundColor = "gray";
    verifyBtn.style.cursor = "not-allowed";

    const response = await fetch("/verify-otp", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            otp: otp.value
        })
    });

    const data = await response.json();

    if (!response.ok) {
        err_msg.textContent = data.message;
        err_msg.classList.add("input_err", "show");

        verifyBtn.disabled = false;
        verifyBtn.textContent = "Verify";
        verifyBtn.style.backgroundColor = "";
        verifyBtn.style.cursor = "pointer";
        return;
    }

    window.location.href = "/main";
});