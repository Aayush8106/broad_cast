const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');

registerBtn.addEventListener('click', () => {
    container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
    container.classList.remove('active');
});

//login btn toggle
const login_eye = document.getElementById("login_switch");
const sign_eye = document.getElementById("sign_switch");

const login_pwd = document.getElementById("login_pwd");
const sign_pwd = document.getElementById("sign_pwd");

function toggle(pwd, eye) {
    if (pwd.type === "password") {
        pwd.type = "text";
        eye.classList.replace("bxs-lock-alt", "bx-lock-open-alt");
    } else {
        pwd.type = "password";
        eye.classList.replace("bx-lock-open-alt", "bxs-lock-alt");
    }
}

login_eye.addEventListener("click", function () {
    toggle(login_pwd, login_eye);
});

sign_eye.addEventListener("click", function () {
    toggle(sign_pwd, sign_eye);
});

//input logic
const sign_up = document.getElementById("sign_up");
const mail = document.getElementById("mail");
const login = document.getElementById("login");
const sign_up_err = document.getElementById("sign_up_err");
const mail_err = document.getElementById("mail_err");
const sign_pwd_err = document.getElementById("sign_pwd_err");
const login_err= document.getElementById("login_err");
const login_pwd_err= document.getElementById("login_pwd_err");

function checkLeadingSpace(input, error) {
    if (input.value.startsWith(" ")) {
        error.classList.add("show");
    } else {
        error.classList.remove("show");
    }
}

sign_up.addEventListener("input", () => {
    checkLeadingSpace(sign_up, sign_up_err);
});

mail.addEventListener("input", () => {
    checkLeadingSpace(mail, mail_err);
});

sign_pwd.addEventListener("input", () => {
    checkLeadingSpace(sign_pwd, sign_pwd_err);
});

login.addEventListener("input", () => {
    checkLeadingSpace(login, login_err);
});

login_pwd.addEventListener("input", () => {
    checkLeadingSpace(login_pwd, login_pwd_err);
});

const loginForm=document.querySelector(".login form");
const loginButton=document.querySelector(".login .btn");
loginForm.addEventListener("submit",async(e)=>{
         e.preventDefault();
         loginButton.disabled=true;
         loginButton.style.backgroundColor="gray";
         loginButton.style.cursor="not-allowed";
         loginButton.textContent = "Logging in...";

          const response=await fetch("/login",{
          method:"POST",
          headers:{"content-Type":"application/json"},
          body:JSON.stringify({
             login:login.value.toLowerCase(),
             password:login_pwd.value
          })
  });
  const data=await response.json();

    if(!response.ok){
       login_err.classList.remove("show");
       login_pwd_err.classList.remove("show");

       if(response.status===404 ||response.status===403)
       {
        login_err.textContent=data.message;
        login_err.classList.add("show");
       }
       if(response.status===401)
       {
        login_pwd_err.textContent=data.message;
        login_pwd_err.classList.add("show");
       }

        loginButton.disabled = false;
        loginButton.style.backgroundColor = "";
        loginButton.style.cursor = "pointer";
        loginButton.textContent = "Login";

       return;
    };

    if (data.admin) {
    window.location.href = "/admin-panel";
    } else {
    window.location.href = "/main";
    }
});

sign_up.addEventListener("keydown",(e)=>{
    if(e.key===" "){
        e.preventDefault();
    }
});

sign_up.addEventListener("input", () => {
    if (/\s/.test(sign_up.value)) {
        sign_up_err.textContent = "Username cannot contain spaces.";
        sign_up_err.classList.add("show");
    } else {
        sign_up_err.classList.remove("show");
    }
});


const registerButton = document.querySelector(".register form .btn");
const signForm=document.querySelector(".register form");
signForm.addEventListener("submit",async(e)=>{
        e.preventDefault();
        registerButton.disabled = true;
        registerButton.style.backgroundColor = "gray";
        registerButton.style.cursor = "not-allowed";
        registerButton.textContent = "Registering...";

        const response=await fetch("/register",{
            method:"POST",
            headers:{"content-Type":"application/json"},
            body:JSON.stringify({
             sign_up:sign_up.value.trim().toLowerCase(),
             mail:mail.value.trim().toLowerCase(),
             sign_pwd:sign_pwd.value.trim()
          })
        });
        const data=await response.json();
        if (!response.ok) {

    registerButton.disabled = false;
    registerButton.style.backgroundColor = "";
    registerButton.style.cursor = "pointer";
    registerButton.textContent = "Register";

    sign_up_err.classList.remove("show");
    sign_pwd_err.classList.remove("show");

    if (response.status === 400 || response.status === 409) {
        sign_up_err.textContent = data.message;
        sign_up_err.classList.add("show");
    }

    if (response.status === 401) {
        sign_pwd_err.textContent = data.message;
        sign_pwd_err.classList.add("show");
    }

    if (response.status === 402) {
        mail_err.textContent = data.message;
        mail_err.classList.add("show");
    }

    return;
}

    window.location.href = "/otp";
});

sign_pwd.addEventListener("input", () => {
    if (/\s/.test(sign_pwd.value)) {
        sign_pwd_err.textContent = "Password cannot contain spaces.";
        sign_pwd_err.classList.add("show");
    } else {
        sign_pwd_err.classList.remove("show");
    }
});

window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
        loginButton.disabled = false;
        loginButton.style.backgroundColor = "";
        loginButton.style.cursor = "pointer";
        loginButton.textContent = "Login";

         registerButton.disabled = false;
         registerButton.style.backgroundColor = "";
         registerButton.style.cursor = "pointer";
         registerButton.textContent = "Register";
    }
});


