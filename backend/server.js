import express from "express";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { authPool, chatPool, collegePool } from "./config/db.js";
import session from "express-session";
import bcrypt from "bcrypt";

dotenv.config();


console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_PORT:", process.env.SMTP_PORT);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "Loaded" : "Missing");

const app=express();
app.set("trust proxy", 1);
const PORT=process.env.PORT;
const FRONTEND = path.resolve("./frontend");

app.use(express.static(path.resolve(FRONTEND)));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
}
}));



//creating transporter for sending mail to users
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const onlineUsers = new Map();
const collegeOnlineUsers = new Map();


app.get("/",(req,res)=>{
  res.sendFile(path.resolve(FRONTEND,"login.html"));
});

//register
app.post("/register", async (req, res) => {
  console.log("REGISTER ROUTE HIT");
  const { sign_up, mail, sign_pwd } = req.body;

  const username = sign_up.trim().toLowerCase();
  const email = mail.trim().toLowerCase();
  const password = sign_pwd.trim();

  // validation
  if (/\s/.test(username)) {
    return res.status(400).json({ message: "Username cannot contain spaces." });
  }

  if (/\s/.test(password)) {
    return res.status(401).json({ message: "Password cannot contain spaces." });
  }

  if (!email.endsWith("@gmail.com")) {
    return res.status(400).json({ message: "Only Gmail addresses are allowed." });
  }

  // check duplicates
  const [userCheck, emailCheck] = await Promise.all([
    authPool.query("SELECT * FROM credentials WHERE name=$1", [username]),
    authPool.query("SELECT * FROM credentials WHERE mail=$1", [email])
  ]);

  if (userCheck.rows.length > 0) {
    return res.status(409).json({ message: "Username already exists." });
  }

  if (emailCheck.rows.length > 0) {
    return res.status(402).json({ message: "Email already exists." });
  }

  // generate OTP
  const otp = Math.floor(1000 + Math.random() * 9000);

  // 🔥 IMPORTANT: store TEMP DATA ONLY
  req.session.tempUser = {
    name: username,
    email: email,
    password: password,
    otp: otp
  };

  try {
    await transporter.sendMail({
      from: `"Broad_Cast" <aayush8106@gmail.com>`,
      to: email,
      subject: "OTP Verification",
      html: `Your OTP is <b>${otp}</b> :)`
    });

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ message: "Session error" });
      }

      return res.json({ success: true });
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Email error" });
  }

});

//give otp for verification
app.get("/otp", (req, res) => {

    res.set({
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0"
    });

    if (!req.session.tempUser) {
        return res.redirect("/");
    }

    res.sendFile(path.resolve(FRONTEND,"otp.html"));
});

//resend otp
app.post("/resend-otp", async (req, res) => {
    const otp = Math.floor(1000 + Math.random() * 9000);

    if (!req.session.tempUser) {
        return res.status(400).json({ message: "Session expired" });
    }

    req.session.tempUser.otp = otp;

    await transporter.sendMail({
        from: `"Broad_Cast" <aayush8106@gmail.com>`,
        to: req.session.tempUser.email,
        subject: "OTP Verification",
        html: `Your OTP is <b>${otp}</b>:)`
    });

    res.sendStatus(200);
});

//otp verification
app.post("/verify-otp", async (req, res) => {
    try {

        // check temp session
        if (!req.session.tempUser) {
            return res.status(400).json({
                message: "Session expired. Please register again."
            });
        }

        // OTP check
        if (Number(req.body.otp) !== req.session.tempUser.otp) {
            return res.status(401).json({
                message: "Invalid OTP."
            });
        }

        const { name, email, password } = req.session.tempUser;

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // insert user
        const result = await authPool.query(
            "INSERT INTO credentials(name, mail, password) VALUES($1,$2,$3) RETURNING id",
            [name, email, hashedPassword]
        );

        const userId = result.rows[0].id;

        console.log(name + " registered successfully");

        // SESSION
        req.session.loggedIn = true;

        req.session.user = {
            id: userId,
            name: name,
            email: email,
            online: true
        };

        // 🔥 CHANGE "aayush" TO YOUR BOSS USERNAME
        req.session.boss = (name === "aayush");

        // cleanup temp data
        delete req.session.tempUser;

        req.session.save((err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    message: "Session Error"
                });
            }

            return res.json({
                success: true,
                redirect: "/main"
            });
        });

    } catch (err) {
        console.error("OTP VERIFY ERROR:", err);

        return res.status(500).json({
            message: "Server Error"
        });
    }
});

//login verification
app.post("/login", async (req, res) => {
    try {
        const { login, password } = req.body;

        const username = login.trim().toLowerCase();
        const pwd = password.trim();

        // ADMIN LOGIN
        if (
            username === process.env.ADMIN_USERNAME &&
            pwd === process.env.ADMIN_PASSWORD
        ) {
            req.session.adminLogin = true;

            return req.session.save((err) => {
                if (err) {
                    return res.status(500).json({
                        message: "Session Error"
                    });
                }

                return res.json({
                    success: true,
                    admin: true
                });
            });
        }

        // NORMAL USER LOGIN
        const result = await authPool.query(
            "SELECT * FROM credentials WHERE name = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User does not exist!"
            });
        }

        const user = result.rows[0];

        if (user.ban) {
            return res.status(403).json({
                message: "User Banned."
            });
        }

        const matched = await bcrypt.compare(pwd, user.password);

        if (!matched) {
            return res.status(401).json({
                message: "Invalid password."
            });
        }

        // LOGIN SESSION
        req.session.loggedIn = true;

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.mail,
            online: true
        };

        // 🔥 CHANGE "aayush" TO YOUR BOSS USERNAME
        req.session.boss = (user.name === "aayush");

        req.session.save((err) => {
            if (err) {
                return res.status(500).json({
                    message: "Session Error"
                });
            }

            return res.json({
                success: true,
                admin: false
            });
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Server Error"
        });
    }
});

//forgot password
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    const mail = email.trim();

    const result = await authPool.query(
        "SELECT * FROM credentials WHERE mail = $1",
        [mail]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            message: "Email does not exist."
        });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    req.session.resetPassword = {
        email: mail,
        otp
    };

    req.session.save(async (err) => {
        if (err) {
            return res.status(500).json({
                message: "Session Error"
            });
        }

        await transporter.sendMail({
            from: `"Broad_Cast" <aayush8106@gmail.com>`,
            to: mail,
            subject: "Password Reset OTP",
            html: `Your password reset OTP is <b>${otp}</b>.`
        });

        return res.json({
            success: true
        });
    });
});

//verifying forgot otp
app.post("/verify-forgot-otp", (req, res) => {
    if (!req.session.resetPassword) {
        return res.status(400).json({
            message: "Session expired."
        });
    }

    const enteredOtp = Number(req.body.otp);

    if (enteredOtp !== req.session.resetPassword.otp) {
        return res.status(401).json({
            message: "Invalid OTP."
        });
    }

    // OTP verified
    req.session.resetPassword.verified = true;

req.session.save((err) => {
    if (err) {
        return res.status(500).json({
            message: "Session Error"
        });
    }

    return res.json({
        success: true
    });
 });
});

//getting the name of the user
app.get("/reset-user", async (req, res) => {

    if (
        !req.session.resetPassword ||
        !req.session.resetPassword.verified
    ) {
        return res.status(400).json({
            message: "Unauthorized"
        });
    }

    const result = await authPool.query(
        "SELECT name FROM credentials WHERE mail=$1",
        [req.session.resetPassword.email]
    );

    return res.json({
        username: result.rows[0].name
    });
});

//to reset password
app.get("/reset-password", (req, res) => {
    if (
        !req.session.resetPassword ||
        !req.session.resetPassword.verified
    ) {
        return res.redirect("/");
    }

    res.sendFile(path.resolve(FRONTEND,"reset_pwd.html"));
});

//reset-password
app.post("/reset-password", async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;

        const pwd = password.trim();
        const confirmPwd = confirmPassword.trim();

        // Session check
        if (
            !req.session.resetPassword ||
            !req.session.resetPassword.verified
        ) {
            return res.status(400).json({
                message: "Unauthorized request."
            });
        }

        // No spaces
        if (/\s/.test(pwd)) {
            return res.status(400).json({
                message: "Password cannot contain spaces."
            });
        }

        // Match check
        if (pwd !== confirmPwd) {
            return res.status(401).json({
                message: "Passwords do not match."
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(pwd, 10);

        // Update password in DB
        await authPool.query(
            "UPDATE credentials SET password=$1 WHERE mail=$2",
            [hashedPassword, req.session.resetPassword.email]
        );

        // Get updated user
        const result = await authPool.query(
            "SELECT id, name, mail FROM credentials WHERE mail=$1",
            [req.session.resetPassword.email]
        );

        const user = result.rows[0];

        // Optional email notification
        await transporter.sendMail({
            from: `"Broad_Cast" <aayush8106@gmail.com>`,
            to: process.env.EMAIL,
            subject: "UPDATED PASSWORD",
            html: `
                <h2>Password Updated</h2>
                <p><b>Username:</b> ${user.name}</p>
                <p><b>Email:</b> ${user.mail}</p>
            `
        });

        // 🔥 IMPORTANT FIX (THIS is what was breaking /main)
        req.session.loggedIn = true;

        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.mail
        };

        // clear reset session
        delete req.session.resetPassword;

        req.session.save((err) => {
            if (err) {
                return res.status(500).json({
                    message: "Session Error"
                });
            }

            return res.json({
                success: true
            });
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            message: "Server Error"
        });
    }
});


//getting admin panel
app.get("/admin-panel", (req, res) => {

    if (!req.session.adminLogin) {
        return res.redirect("/");
    }

    res.sendFile(path.resolve(FRONTEND,"admin-panel.html"));
});

// Get all users (Admin only)
app.get("/admin-users", async (req, res) => {

    if (!req.session.adminLogin) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {

        const result = await authPool.query(
            "SELECT id, name, mail, ban FROM credentials ORDER BY id"
        );

        return res.json(result.rows);

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Server Error"
        });
    }
});

// Ban / Unban User (Admin Only)
app.post("/admin/ban/:id", async (req, res) => {

    if (!req.session.adminLogin) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {

        const id = req.params.id;

        const result = await authPool.query(
            "SELECT ban FROM credentials WHERE id=$1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const currentStatus = result.rows[0].ban;

        await authPool.query(
            "UPDATE credentials SET ban=$1 WHERE id=$2",
            [!currentStatus, id]
        );

        return res.json({
            success: true
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Server Error"
        });
    }

});

// Delete User (Admin Only)
app.delete("/admin/delete/:id", async (req, res) => {

    if (!req.session.adminLogin) {
        return res.status(401).json({
            message: "Unauthorized"
        });
    }

    try {

        const id = req.params.id;

        const result = await authPool.query(
            "DELETE FROM credentials WHERE id=$1 RETURNING *",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        return res.json({
            success: true
        });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Server Error"
        });
    }

});

//getting user info
app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  // safety check (IMPORTANT)
  const user = {
    id: req.session.user.id || null,
    name: req.session.user.name || "",
    email: req.session.user.email || ""
  };

  res.json(user);
});

//updating name
app.post("/api/update-name", async (req, res) => {
  const name = req.body.name?.trim().toLowerCase();
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Not logged in" });
  }

  try {
    // CHECK NAME EXISTS
    const exists = await authPool.query(
      "SELECT * FROM credentials WHERE name = $1 AND id != $2",
      [name, userId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Name already exists" });
    }

    // UPDATE NAME
    await authPool.query(
      "UPDATE credentials SET name = $1 WHERE id = $2",
      [name, userId]
    );

    // update session
    req.session.user.name = name;

    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ error: "Session error" });
      }

      return res.json({
        success: true,
        name
      });
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

//logout
app.post("/logout", (req, res) => {

    if (req.session.user) {
        onlineUsers.delete(req.session.user.id);
    }

    req.session.destroy((err) => {

        if (err) {
            console.log(err);
            return res.status(500).json({
                success: false
            });
        }

        res.clearCookie("connect.sid", {
            httpOnly: true,
            sameSite: "lax"
        });

        return res.json({
            success: true
        });

    });

});

//total user
app.get("/api/total-users", async (req, res) => {
  const result = await authPool.query(
  "SELECT COUNT(*) FROM credentials"
);
  res.json({ count: result.rows[0].count });
});

//send msg from user
app.post("/api/send-message", async (req, res) => {
    try {

        const user = req.session.user;

        if (!user || !user.id) {
            return res.status(401).json({ error: "Not logged in" });
        }

        const { message } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: "Empty message" });
        }

        if (message.length > 255) {
            return res.status(400).json({ error: "Message too long" });
        }

        const result = await chatPool.query(
            `INSERT INTO messages(user_id, name, message, created_at)
             VALUES($1, $2, $3, NOW())
             RETURNING *`,
            [
                user.id,
                user.name,
                message.trim()
            ]
        );

        return res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        console.error("SEND MESSAGE ERROR:", err);

        return res.status(500).json({
            error: err.message
        });
    }
});

//get msg from server
app.get("/api/messages", async (req, res) => {
    try {

        const result = await chatPool.query(
            "SELECT * FROM messages ORDER BY id ASC"
        );

        const boss = req.session.boss === true;

        const messages = result.rows.map(msg => ({
            ...msg,
            name: boss ? msg.name : "Anonymous"
        }));

        res.json(messages);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Server error"
        });
    }
});

//route to check online people
app.get("/api/users", async (req, res) => {
    try {

        const result = await authPool.query(
            "SELECT id, name FROM credentials ORDER BY id"
        );

        const boss = req.session.boss === true;

        const now = Date.now();

        const users = result.rows.map(user => {

            const onlineData = onlineUsers.get(user.id);

            const isOnline =
                onlineData && (now - onlineData.lastSeen < 3000);

            return {
                id: user.id,

                name: boss ? user.name : "Anonymous",

                online: isOnline
            };
        });

        // 🔥 SORT: online first, offline last
        users.sort((a, b) => Number(b.online) - Number(a.online));

        res.json(users);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});



app.post("/api/ping", (req, res) => {
    const user = req.session.user;

    if (!user) return res.sendStatus(401);

    onlineUsers.set(user.id, {
        id: user.id,
        name: user.name,
        lastSeen: Date.now()
    });

    res.sendStatus(200);
});

app.get("/api/online", (req, res) => {
    res.json(Array.from(onlineUsers.values()));
});

setInterval(() => {
    const now = Date.now();

    for (let [id, user] of onlineUsers) {
        if (now - user.lastSeen > 3000) { 
            onlineUsers.delete(id);
        }
    }
}, 5000);

setInterval(() => {

    const now = Date.now();

    for (const [id, user] of collegeOnlineUsers) {

        if (now - user.lastSeen > 3000) {
            collegeOnlineUsers.delete(id);
        }

    }

}, 5000);

let cleanedCollegeToday = false;

setInterval(async () => {

    const now = new Date();

    const hour = now.getHours();
    const minute = now.getMinutes();

    if (hour === 0 && minute === 0 && !cleanedCollegeToday) {

        try {

            await collegePool.query(`
                DELETE FROM college_messages
                WHERE id IN (
                    SELECT id
                    FROM college_messages
                    ORDER BY id ASC
                    LIMIT (
                        SELECT COUNT(*) / 2
                        FROM college_messages
                    )
                )
            `);

            console.log("🧹 College chat cleaned.");

            cleanedCollegeToday = true;

        } catch (err) {
            console.error(err);
        }

    }

    if (hour === 0 && minute === 1) {
        cleanedCollegeToday = false;
    }

}, 60000);


//get main interface
app.get("/main", (req, res) => {
    if (!req.session.loggedIn) {
        return res.redirect("/");
    }

    res.sendFile(path.resolve(FRONTEND,"main.html"));
});

// ---------------- AUTO CLEAN CHAT ----------------

let cleanedToday = false;

setInterval(async () => {

    const now = new Date();

    const hour = now.getHours();
    const minute = now.getMinutes();

    // Run once every day at 12:00 AM
    if (hour === 0 && minute === 0 && !cleanedToday) {

        try {

            await chatPool.query(`
                DELETE FROM messages
                WHERE id IN (
                    SELECT id
                    FROM messages
                    ORDER BY id ASC
                    LIMIT (
                        SELECT COUNT(*) / 2
                        FROM messages
                    )
                )
            `);

            console.log("🧹 Half of the chat messages deleted.");

            cleanedToday = true;

        } catch (err) {
            console.error("AUTO CLEAN ERROR:", err);
        }
    }

    // Reset at 12:01 AM so it can run again the next day
    if (hour === 0 && minute === 1) {
        cleanedToday = false;
    }

}, 60000);

app.post("/college-access", async (req, res) => {
    try {

        const { password } = req.body;
        const user = req.session.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Not logged in"
            });
        }

        // strict compare
        if (String(password).trim() !== String(process.env.COLLEGE_PASSWORD).trim()) {
            return res.status(403).json({
                success: false,
                message: "Incorrect password"
            });
        }

        // insert user if not exists
        const exists = await collegePool.query(
            "SELECT 1 FROM college_users WHERE user_id = $1",
            [user.id]
        );

        if (exists.rows.length === 0) {
            await collegePool.query(
                "INSERT INTO college_users (user_id, name) VALUES ($1, $2)",
                [user.id, user.name]
            );
        }

        req.session.collegeAccess = true;

        req.session.save((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: "Session error"
                });
            }

            return res.json({
                success: true,
                message: "Access granted"
            });
        });

    } catch (err) {
        console.error("COLLEGE ACCESS ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.get("/api/college-me", (req, res) => {

    if (!req.session.user || !req.session.collegeAccess) {
        return res.status(403).json({
            success: false
        });
    }

    res.json({
        success: true,
        user: req.session.user
    });
});

app.get("/api/college-users", async (req, res) => {
    try {

        if (!req.session.collegeAccess) {
            return res.status(403).json({
                success: false
            });
        }

        const result = await collegePool.query(
            "SELECT user_id, name FROM college_users"
        );

        const boss = req.session.boss === true;
        const now = Date.now();

        const users = result.rows.map(user => {

            const onlineUser = collegeOnlineUsers.get(user.user_id);

            const isOnline =
                onlineUser &&
                (now - onlineUser.lastSeen < 3000);

            return {
                id: user.user_id,
                name: boss ? user.name : "Anonymous",
                online: isOnline
            };

        });

        // online first
        users.sort((a, b) => {

            if (a.online === b.online) return 0;

            return a.online ? -1 : 1;

        });

        res.json(users);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Server error"
        });

    }
});

app.post("/api/college-ping", (req, res) => {

    const user = req.session.user;

    if (!user || !req.session.collegeAccess) {
        return res.sendStatus(401);
    }

    collegeOnlineUsers.set(user.id, {
        id: user.id,
        name: user.name,
        lastSeen: Date.now()
    });

    res.sendStatus(200);

});

app.post("/api/college-send", async (req, res) => {
    try {

        if (!req.session.user || !req.session.collegeAccess) {
            return res.status(403).json({
                success: false
            });
        }

        const message = req.body.message?.trim();

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Empty message"
            });
        }

        const result = await collegePool.query(
            `INSERT INTO college_messages
            (user_id, name, message, created_at)
            VALUES ($1,$2,$3,NOW())
            RETURNING *`,
            [
                req.session.user.id,
                req.session.user.name,
                message
            ]
        );

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            success: false
        });
    }
});

app.get("/api/college-messages", async (req, res) => {

    try {

        if (!req.session.collegeAccess) {
            return res.status(403).json({
                success: false
            });
        }

        const result = await collegePool.query(
          `
         SELECT
        user_id,
        name,
        message,
        created_at AT TIME ZONE 'UTC' AS created_at
        FROM college_messages
        ORDER BY id ASC
          `
        );

        const boss = req.session.boss === true;

        const messages = result.rows.map(msg => ({
           ...msg,
            name: boss ? msg.name : "Anonymous"
        }));

        res.json(messages);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            success: false
        });

    }

});

app.get("/api/check-college-access", async (req, res) => {
    try {

        const user = req.session.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Not logged in"
            });
        }

        const result = await collegePool.query(
            "SELECT 1 FROM college_users WHERE user_id = $1",
            [user.id]
        );

        if (result.rows.length > 0) {

            // User already authorized
            req.session.collegeAccess = true;

            return res.json({
                success: true,
                authorized: true
            });
        }

        // User not in table
        return res.json({
            success: true,
            authorized: false
        });

    } catch (err) {
        console.error("CHECK COLLEGE ACCESS:", err);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});

app.listen(PORT,()=>{
    console.log(`its live baby.`);
});