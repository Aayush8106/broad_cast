import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

/* ---------------- AUTH DATABASE (credentials) ---------------- */
export const authPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

/* ---------------- CHAT DATABASE (messages) ---------------- */
export const chatPool = new Pool({
    connectionString: process.env.PUBLIC_DATABASE,
    ssl: {
        rejectUnauthorized: false,
    },
});

/* ---------------- COLLEGE CHAT DATABASE ---------------- */
export const collegePool = new Pool({
    connectionString: process.env.COLLEGE_DATABASE,
    ssl: {
        rejectUnauthorized: false,
    },
});