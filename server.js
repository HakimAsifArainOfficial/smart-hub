"use strict";

/*
========================================================
SMART HUB — ORACLE OCI BACKEND
Version: 1.0
Backend Server: Oracle Cloud Infrastructure (OCI)

IMPORTANT:
- This file is ONLY the Smart Hub backend foundation.
- Search engines are NOT included here.
- Frontend/UI is NOT included here.
- Supabase is NOT used.
- Cloudflare is NOT used by Smart Hub architecture.
- Secrets/passwords must NEVER be written directly in this file.
========================================================
*/

const http = require("http");
const crypto = require("crypto");

/*
--------------------------------------------------------
SERVER CONFIGURATION
--------------------------------------------------------
*/

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 8080);

const SERVER_NAME = "Smart Hub Oracle Backend";
const SERVER_VERSION = "1.0.0";

/*
--------------------------------------------------------
SECURITY CONFIGURATION
--------------------------------------------------------
*/

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB
const REQUEST_TIMEOUT = 15000;      // 15 seconds

/*
--------------------------------------------------------
SECURITY HEADERS
--------------------------------------------------------
*/

function securityHeaders() {
    return {
        "Content-Type": "application/json; charset=utf-8",

        "X-Content-Type-Options": "nosniff",

        "X-Frame-Options": "DENY",

        "Referrer-Policy": "no-referrer",

        "Permissions-Policy":
            "camera=(), microphone=(), geolocation=()",

        "Cache-Control":
            "no-store, no-cache, must-revalidate, private",

        "Pragma": "no-cache"
    };
}

/*
--------------------------------------------------------
JSON RESPONSE
--------------------------------------------------------
*/

function sendJSON(res, statusCode, data) {

    const headers = securityHeaders();

    res.writeHead(statusCode, headers);

    res.end(
        JSON.stringify(data)
    );
}

/*
--------------------------------------------------------
REQUEST BODY READER
--------------------------------------------------------
*/

function readRequestBody(req) {

    return new Promise((resolve, reject) => {

        let body = "";
        let size = 0;

        req.on("data", chunk => {

            size += chunk.length;

            if (size > MAX_BODY_SIZE) {

                reject(
                    new Error("Request body too large")
                );

                req.destroy();

                return;
            }

            body += chunk.toString("utf8");
        });

        req.on("end", () => {

            if (!body) {

                resolve({});

                return;
            }

            try {

                const parsed = JSON.parse(body);

                resolve(parsed);

            } catch {

                reject(
                    new Error("Invalid JSON")
                );
            }
        });

        req.on("error", reject);
    });
}

/*
--------------------------------------------------------
REQUEST ID
--------------------------------------------------------
*/

function createRequestId() {

    return crypto.randomUUID();
}

/*
--------------------------------------------------------
HEALTH CHECK
--------------------------------------------------------
*/

function healthResponse(requestId) {

    return {

        success: true,

        service: SERVER_NAME,

        version: SERVER_VERSION,

        status: "online",

        server: "Oracle Cloud Infrastructure",

        requestId: requestId,

        timestamp: new Date().toISOString()
    };
}

/*
--------------------------------------------------------
SECURE RANDOM TOKEN
--------------------------------------------------------
*/

function createSecureToken(bytes = 32) {

    return crypto.randomBytes(bytes).toString("base64url");
}

/*
--------------------------------------------------------
PASSWORD HASH FOUNDATION
--------------------------------------------------------

Passwords must NEVER be stored as plaintext.

This function uses Node.js scrypt as a server-side
password hashing mechanism.

For the final Earnings authentication system we can
replace this with Argon2id if the OCI deployment
includes the required Argon2 package/library.

--------------------------------------------------------
*/

async function hashPassword(password) {

    if (
        typeof password !== "string" ||
        password.length < 10
    ) {

        throw new Error(
            "Password must contain at least 10 characters"
        );
    }

    const salt = crypto.randomBytes(16);

    return new Promise((resolve, reject) => {

        crypto.scrypt(
            password,
            salt,
            64,
            {
                N: 16384,
                r: 8,
                p: 1
            },
            (error, derivedKey) => {

                if (error) {

                    reject(error);

                    return;
                }

                resolve({

                    algorithm: "scrypt",

                    salt:
                        salt.toString("base64"),

                    hash:
                        derivedKey.toString("base64"),

                    parameters: {

                        N: 16384,

                        r: 8,

                        p: 1,

                        keyLength: 64
                    }
                });
            }
        );
    });
}

/*
--------------------------------------------------------
PASSWORD VERIFICATION
--------------------------------------------------------
*/

async function verifyPassword(
    password,
    stored
) {

    if (
        typeof password !== "string" ||
        !stored ||
        !stored.salt ||
        !stored.hash
    ) {

        return false;
    }

    const salt =
        Buffer.from(
            stored.salt,
            "base64"
        );

    const storedHash =
        Buffer.from(
            stored.hash,
            "base64"
        );

    return new Promise((resolve, reject) => {

        crypto.scrypt(
            password,
            salt,
            storedHash.length,
            {
                N: stored.parameters.N,
                r: stored.parameters.r,
                p: stored.parameters.p
            },
            (error, derivedKey) => {

                if (error) {

                    reject(error);

                    return;
                }

                if (
                    derivedKey.length !==
                    storedHash.length
                ) {

                    resolve(false);

                    return;
                }

                resolve(
                    crypto.timingSafeEqual(
                        derivedKey,
                        storedHash
                    )
                );
            }
        );
    });
}

/*
--------------------------------------------------------
SECURE EMAIL VERIFICATION CODE
--------------------------------------------------------
*/

function createEmailVerificationCode() {

    return crypto
        .randomInt(100000, 1000000)
        .toString();
}

/*
--------------------------------------------------------
EMAIL CODE HASH
--------------------------------------------------------

The actual verification code should not be stored
directly in the database.

--------------------------------------------------------
*/

function hashVerificationCode(code) {

    return crypto
        .createHash("sha256")
        .update(code, "utf8")
        .digest("hex");
}

/*
--------------------------------------------------------
BASIC INPUT CLEANING
--------------------------------------------------------
*/

function cleanText(value, maxLength = 500) {

    if (typeof value !== "string") {

        return "";
    }

    return value
        .trim()
        .slice(0, maxLength);
}

/*
--------------------------------------------------------
ROUTE HANDLER
--------------------------------------------------------
*/

async function handleRequest(req, res) {

    const requestId =
        createRequestId();

    /*
    Basic request timeout
    */

    req.setTimeout(
        REQUEST_TIMEOUT,
        () => {

            req.destroy();
        }
    );

    /*
    Health endpoint
    */

    if (
        req.method === "GET" &&
        req.url === "/api/health"
    ) {

        sendJSON(
            res,
            200,
            healthResponse(requestId)
        );

        return;
    }

    /*
    Backend information
    */

    if (
        req.method === "GET" &&
        req.url === "/api/info"
    ) {

        sendJSON(
            res,
            200,
            {

                success: true,

                name: SERVER_NAME,

                version: SERVER_VERSION,

                platform:
                    "Oracle Cloud Infrastructure",

                backend:
                    "Oracle OCI",

                database:
                    "Not connected yet",

                authentication:
                    "Backend foundation ready",

                searchEngines:
                    "Managed separately by Smart Hub frontend",

                requestId
            }
        );

        return;
    }

    /*
    Temporary secure-token endpoint.

    This is only a backend foundation.
    Real authentication/session management will be
    implemented after the database structure is finalized.
    */

    if (
        req.method === "POST" &&
        req.url === "/api/security/token"
    ) {

        const token =
            createSecureToken(32);

        sendJSON(
            res,
            200,
            {

                success: true,

                token,

                requestId,

                warning:
                    "Temporary backend foundation token. Final authentication will use server-side sessions."
            }
        );

        return;
    }

    /*
    Password hashing test endpoint.

    It is NOT an account creation endpoint.
    It exists only as a secure backend foundation.
    */

    if (
        req.method === "POST" &&
        req.url === "/api/security/hash-password"
    ) {

        try {

            const body =
                await readRequestBody(req);

            const password =
                body.password;

            const result =
                await hashPassword(password);

            sendJSON(
                res,
                200,
                {

                    success: true,

                    passwordHash:
                        result,

                    requestId
                }
            );

        } catch (error) {

            sendJSON(
                res,
                400,
                {

                    success: false,

                    error:
                        error.message,

                    requestId
                }
            );
        }

        return;
    }

    /*
    Email verification-code foundation
    */

    if (
        req.method === "POST" &&
        req.url === "/api/security/email-code"
    ) {

        try {

            const body =
                await readRequestBody(req);

            const email =
                cleanText(
                    body.email,
                    320
                );

            if (!email) {

                sendJSON(
                    res,
                    400,
                    {

                        success: false,

                        error:
                            "Email is required",

                        requestId
                    }
                );

                return;
            }

            const code =
                createEmailVerificationCode();

            const codeHash =
                hashVerificationCode(code);

            sendJSON(
                res,
                200,
                {

                    success: true,

                    email,

                    /*
                    DEVELOPMENT ONLY.
                    This must NEVER be returned to the
                    frontend in the final production system.
                    */

                    developmentCode:
                        code,

                    codeHash,

                    expiresInSeconds:
                        600,

                    requestId
                }
            );

        } catch (error) {

            sendJSON(
                res,
                400,
                {

                    success: false,

                    error:
                        error.message,

                    requestId
                }
            );
        }

        return;
    }

    /*
    404
    */

    sendJSON(
        res,
        404,
        {

            success: false,

            error:
                "Endpoint not found",

            requestId
        }
    );
}

/*
--------------------------------------------------------
HTTP SERVER
--------------------------------------------------------
*/

const server =
    http.createServer(
        async (req, res) => {

            try {

                await handleRequest(
                    req,
                    res
                );

            } catch (error) {

                console.error(
                    "Backend error:",
                    error
                );

                if (!res.headersSent) {

                    sendJSON(
                        res,
                        500,
                        {

                            success: false,

                            error:
                                "Internal server error"
                        }
                    );
                }
            }
        }
    );

/*
--------------------------------------------------------
SERVER START
--------------------------------------------------------
*/

server.listen(
    PORT,
    HOST,
    () => {

        console.log(
            `${SERVER_NAME} v${SERVER_VERSION}`
        );

        console.log(
            `Oracle OCI backend listening on ${HOST}:${PORT}`
        );

        console.log(
            "Smart Hub backend foundation is online."
        );
    }
);

/*
--------------------------------------------------------
GRACEFUL SHUTDOWN
--------------------------------------------------------
*/

function shutdown(signal) {

    console.log(
        `${signal} received. Shutting down safely...`
    );

    server.close(() => {

        console.log(
            "Oracle backend stopped."
        );

        process.exit(0);
    });
}

process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);
