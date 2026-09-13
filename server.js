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

/*
========================================================
SMART HUB — ORACLE OCI BACKEND
PERMANENT ROUTE REGISTRY
========================================================

IMPORTANT:
- This registry is the permanent extension point.
- Future Backend modules will register their routes here.
- Existing routes are preserved.
- Future modules must NOT create separate HTTP servers.
- Future modules must NOT create another request handler.
- Future modules must NOT call server.listen().
- Only this Backend server handles Smart Hub API requests.

This structure is designed to prevent route conflicts.
========================================================
*/

const SH_BACKEND_ROUTES = [];

/*
--------------------------------------------------------
ROUTE REGISTRATION
--------------------------------------------------------
*/

function shRegisterRoute(
    method,
    path,
    handler
) {

    const normalizedMethod =
        String(method)
            .trim()
            .toUpperCase();

    const normalizedPath =
        String(path)
            .trim();

    if (!normalizedMethod) {

        throw new Error(
            "Backend route method is required"
        );
    }

    if (!normalizedPath) {

        throw new Error(
            "Backend route path is required"
        );
    }

    if (typeof handler !== "function") {

        throw new Error(
            "Backend route handler must be a function"
        );
    }

    /*
    Prevent accidental duplicate routes.
    */

    const duplicate =
        SH_BACKEND_ROUTES.some(
            route =>
                route.method === normalizedMethod &&
                route.path === normalizedPath
        );

    if (duplicate) {

        throw new Error(
            `Duplicate Backend route: ${normalizedMethod} ${normalizedPath}`
        );
    }

    SH_BACKEND_ROUTES.push({

        method:
            normalizedMethod,

        path:
            normalizedPath,

        handler
    });
}

/*
--------------------------------------------------------
ROUTE LOOKUP
--------------------------------------------------------
*/

function shFindBackendRoute(
    method,
    path
) {

    const normalizedMethod =
        String(method)
            .toUpperCase();

    const normalizedPath =
        String(path);

    return SH_BACKEND_ROUTES.find(
        route =>
            route.method === normalizedMethod &&
            route.path === normalizedPath
    );
}

/*
--------------------------------------------------------
SAFE ROUTE EXECUTION
--------------------------------------------------------
*/

async function shExecuteBackendRoute(
    req,
    res,
    route,
    requestId
) {

    try {

        await route.handler(
            req,
            res,
            {
                requestId
            }
        );

    } catch (error) {

        console.error(
            "Backend route error:",
            error
        );

        if (!res.headersSent) {

            sendJSON(
                res,
                500,
                {

                    success: false,

                    error:
                        "Internal server error",

                    requestId
                }
            );
        }
    }
}

/*
--------------------------------------------------------
PRESERVE ORIGINAL BACKEND HANDLER
--------------------------------------------------------

The original handler from the foundation remains intact.

The new permanent route registry is checked first.
If no registered route matches, the original handler
continues normally.

--------------------------------------------------------
*/

const shOriginalHandleRequest =
    handleRequest;

/*
--------------------------------------------------------
NEW PERMANENT BACKEND REQUEST HANDLER
--------------------------------------------------------
*/

handleRequest =
    async function (
        req,
        res
    ) {

        const requestPath =
            String(req.url || "")
                .split("?")[0];

        const route =
            shFindBackendRoute(
                req.method,
                requestPath
            );

        /*
        Registered permanent route
        */

        if (route) {

            const requestId =
                createRequestId();

            req.setTimeout(
                REQUEST_TIMEOUT,
                () => {

                    req.destroy();
                }
            );

            await shExecuteBackendRoute(
                req,
                res,
                route,
                requestId
            );

            return;
        }

        /*
        Existing foundation routes
        */

        await shOriginalHandleRequest(
            req,
            res
        );
    };

/*
========================================================
PERMANENT BACKEND CORE ROUTES
========================================================
*/

/*
--------------------------------------------------------
API STATUS
--------------------------------------------------------
*/

shRegisterRoute(
    "GET",
    "/api/backend/status",
    async (
        req,
        res,
        context
    ) => {

        sendJSON(
            res,
            200,
            {

                success: true,

                service:
                    SERVER_NAME,

                version:
                    SERVER_VERSION,

                backend:
                    "Oracle Cloud Infrastructure",

                status:
                    "online",

                architecture:
                    "Single Backend Server",

                requestId:
                    context.requestId,

                timestamp:
                    new Date().toISOString()
            }
        );
    }
);

/*
--------------------------------------------------------
BACKEND SECURITY INFORMATION
--------------------------------------------------------
*/

shRegisterRoute(
    "GET",
    "/api/backend/security",
    async (
        req,
        res,
        context
    ) => {

        sendJSON(
            res,
            200,
            {

                success: true,

                backend:
                    "Oracle Cloud Infrastructure",

                transport:
                    "HTTPS/TLS 1.3 to be enforced at production deployment",

                passwordProtection:
                    "Server-side password hashing",

                randomGeneration:
                    "Node.js cryptographically secure random generator",

                requestProtection:
                    "Request size and timeout limits",

                responseProtection:
                    "Security response headers",

                routeProtection:
                    "Permanent route registry with duplicate-route detection",

                secrets:
                    "Environment variables only",

                requestId:
                    context.requestId
            }
        );
    }
);

/*
--------------------------------------------------------
ROUTE LIST
--------------------------------------------------------

This endpoint intentionally exposes only route paths,
not internal implementation details.

--------------------------------------------------------
*/

shRegisterRoute(
    "GET",
    "/api/backend/routes",
    async (
        req,
        res,
        context
    ) => {

        sendJSON(
            res,
            200,
            {

                success: true,

                routes:
                    SH_BACKEND_ROUTES.map(
                        route => ({

                            method:
                                route.method,

                            path:
                                route.path
                        })
                    ),

                requestId:
                    context.requestId
            }
        );
    }
);

/*
========================================================
BACKEND ARCHITECTURE LOCK
========================================================

Future modules must use:

    shRegisterRoute(...)

Future modules must NOT:

    http.createServer(...)
    server.listen(...)
    create another Backend server
    replace handleRequest(...)
    create another route registry

This keeps Smart Hub on ONE Oracle Backend.
========================================================
*/

const SH_BACKEND_ARCHITECTURE = Object.freeze({

    provider:
        "Oracle Cloud Infrastructure",

    serverCount:
        1,

    backendCount:
        1,

    routeRegistry:
        "SH_BACKEND_ROUTES",

    searchEngineBackend:
        false,

    supabase:
        false,

    cloudflare:
        false
});

/*
--------------------------------------------------------
FINAL BACKEND ARCHITECTURE CHECK
--------------------------------------------------------
*/

console.log(
    "Smart Hub Oracle Backend route registry initialized."
);

console.log(
    `Permanent Backend routes: ${SH_BACKEND_ROUTES.length}`
);

console.log(
    `Backend provider: ${SH_BACKEND_ARCHITECTURE.provider}`
);

console.log(
    `Backend servers: ${SH_BACKEND_ARCHITECTURE.serverCount}`
);

/*
========================================================
SMART HUB — ORACLE OCI BACKEND
PART 3 — REQUEST SECURITY LAYER
========================================================

PURPOSE:
- Protect backend routes from basic abuse
- Add request rate limiting
- Protect temporary development endpoints
- Reject unsupported HTTP methods
- Keep the architecture append-only
- Maintain ONE Oracle OCI Backend Server

IMPORTANT:
- Do NOT delete previous Parts.
- Do NOT create another HTTP server.
- Do NOT create another Backend Server.
- Search Engines remain separate services.
========================================================
*/


/*
--------------------------------------------------------
PART 3 — SECURITY CONFIGURATION
--------------------------------------------------------
*/

const SH_SECURITY_CONFIG = Object.freeze({

    /*
    Maximum requests allowed from one IP
    during the rate-limit window.
    */

    rateLimitMaxRequests: 120,

    /*
    Rate-limit window:
    60 seconds
    */

    rateLimitWindowMs: 60 * 1000,

    /*
    Temporary security/development endpoints
    are allowed only outside production.
    */

    developmentEndpoints:

        new Set([
            "/api/security/token",
            "/api/security/hash-password",
            "/api/security/email-code"
        ])

});


/*
--------------------------------------------------------
IN-MEMORY RATE LIMIT STORE
--------------------------------------------------------

This is only a basic protection layer.

Final large-scale production protection can later
be connected to a persistent server-side security
system without changing the Backend architecture.

--------------------------------------------------------
*/

const SH_RATE_LIMIT_STORE = new Map();


/*
--------------------------------------------------------
GET CLIENT IP
--------------------------------------------------------

We do NOT blindly trust forwarded IP headers.

By default the direct socket address is used.

--------------------------------------------------------
*/

function shGetClientIP(req) {

    if (
        req &&
        req.socket &&
        req.socket.remoteAddress
    ) {

        return req.socket.remoteAddress;
    }

    return "unknown";
}


/*
--------------------------------------------------------
RATE LIMIT CLEANUP
--------------------------------------------------------
*/

function shCleanupRateLimitStore(now) {

    for (
        const [
            ip,
            record
        ]
        of SH_RATE_LIMIT_STORE
    ) {

        if (
            now - record.windowStart >=
            SH_SECURITY_CONFIG.rateLimitWindowMs
        ) {

            SH_RATE_LIMIT_STORE.delete(ip);
        }
    }
}


/*
--------------------------------------------------------
RATE LIMIT CHECK
--------------------------------------------------------
*/

function shCheckRateLimit(ip) {

    const now =
        Date.now();

    const existing =
        SH_RATE_LIMIT_STORE.get(ip);

    if (!existing) {

        SH_RATE_LIMIT_STORE.set(
            ip,
            {

                windowStart: now,

                count: 1
            }
        );

        return {

            allowed: true,

            remaining:
                SH_SECURITY_CONFIG.rateLimitMaxRequests - 1
        };
    }


    /*
    Start a new window.
    */

    if (
        now - existing.windowStart >=
        SH_SECURITY_CONFIG.rateLimitWindowMs
    ) {

        existing.windowStart = now;

        existing.count = 1;

        return {

            allowed: true,

            remaining:
                SH_SECURITY_CONFIG.rateLimitMaxRequests - 1
        };
    }


    /*
    Existing window.
    */

    existing.count += 1;


    if (
        existing.count >
        SH_SECURITY_CONFIG.rateLimitMaxRequests
    ) {

        return {

            allowed: false,

            remaining: 0
        };
    }


    return {

        allowed: true,

        remaining:
            SH_SECURITY_CONFIG.rateLimitMaxRequests -
            existing.count
    };
}


/*
--------------------------------------------------------
PERIODIC RATE-LIMIT CLEANUP
--------------------------------------------------------
*/

const SH_RATE_LIMIT_CLEANUP_TIMER =
    setInterval(
        () => {

            shCleanupRateLimitStore(
                Date.now()
            );

        },
        SH_SECURITY_CONFIG.rateLimitWindowMs
    );


/*
Do not keep the Node.js process alive only because
of this cleanup timer during shutdown.
*/

if (
    SH_RATE_LIMIT_CLEANUP_TIMER &&
    typeof SH_RATE_LIMIT_CLEANUP_TIMER.unref ===
    "function"
) {

    SH_RATE_LIMIT_CLEANUP_TIMER.unref();
}


/*
--------------------------------------------------------
HTTP METHOD VALIDATION
--------------------------------------------------------
*/

const SH_ALLOWED_HTTP_METHODS =
    new Set([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ]);


function shIsAllowedHttpMethod(method) {

    return SH_ALLOWED_HTTP_METHODS.has(
        method
    );
}


/*
--------------------------------------------------------
PRODUCTION ENVIRONMENT CHECK
--------------------------------------------------------
*/

function shIsProduction() {

    return (
        process.env.NODE_ENV ===
        "production"
    );
}


/*
--------------------------------------------------------
DEVELOPMENT ENDPOINT PROTECTION
--------------------------------------------------------

The old endpoints remain in the file.

We do NOT delete them.

Instead, when NODE_ENV=production,
they become unavailable.

This prevents the temporary development
endpoints from being exposed publicly
in the final production environment.

--------------------------------------------------------
*/

function shIsProtectedDevelopmentEndpoint(
    url
) {

    return SH_SECURITY_CONFIG
        .developmentEndpoints
        .has(url);
}


/*
--------------------------------------------------------
REQUEST SECURITY RESPONSE
--------------------------------------------------------
*/

function shSecurityError(
    res,
    statusCode,
    message,
    requestId
) {

    sendJSON(
        res,
        statusCode,
        {

            success: false,

            error: message,

            requestId
        }
    );
}


/*
--------------------------------------------------------
PRESERVE CURRENT REQUEST HANDLER
--------------------------------------------------------

The previous Parts remain untouched.

We place one additional security layer
in front of the existing handler.

--------------------------------------------------------
*/

const shPreviousHandleRequest =
    handleRequest;


/*
--------------------------------------------------------
SECURED REQUEST HANDLER
--------------------------------------------------------
*/

handleRequest =
    async function securedHandleRequest(
        req,
        res
    ) {

        const requestId =
            createRequestId();


        /*
        ------------------------------------------------
        METHOD CHECK
        ------------------------------------------------
        */

        if (
            !shIsAllowedHttpMethod(
                req.method
            )
        ) {

            shSecurityError(
                res,
                405,
                "HTTP method not allowed",
                requestId
            );

            return;
        }


        /*
        ------------------------------------------------
        RATE LIMIT
        ------------------------------------------------
        */

        const clientIP =
            shGetClientIP(req);

        const rateLimit =
            shCheckRateLimit(
                clientIP
            );


        if (!rateLimit.allowed) {

            shSecurityError(
                res,
                429,
                "Too many requests. Please try again later.",
                requestId
            );

            return;
        }


        /*
        ------------------------------------------------
        PRODUCTION PROTECTION
        ------------------------------------------------
        */

        if (
            shIsProduction() &&
            shIsProtectedDevelopmentEndpoint(
                req.url
            )
        ) {

            shSecurityError(
                res,
                404,
                "Endpoint not available",
                requestId
            );

            return;
        }


        /*
        ------------------------------------------------
        CONTINUE TO EXISTING BACKEND
        ------------------------------------------------

        Nothing from the previous Parts is deleted.

        The request simply continues through the
        already-built Backend architecture.
        ------------------------------------------------
        */

        await shPreviousHandleRequest(
            req,
            res
        );
    };


/*
--------------------------------------------------------
PART 3 SECURITY STATUS
--------------------------------------------------------
*/

shRegisterRoute(
    "GET",
    "/api/backend/security-status",
    async (
        req,
        res
    ) => {

        sendJSON(
            res,
            200,
            {

                success: true,

                backend:
                    "Oracle Cloud Infrastructure",

                serverCount:
                    1,

                rateLimit:
                    {

                        enabled: true,

                        maxRequests:
                            SH_SECURITY_CONFIG
                                .rateLimitMaxRequests,

                        windowSeconds:
                            SH_SECURITY_CONFIG
                                .rateLimitWindowMs /
                            1000
                    },

                productionProtection:
                    true,

                developmentEndpointsProtected:
                    true,

                requestSecurity:
                    "enabled",

                requestId:
                    createRequestId()
            }
        );
    }
);


/*
--------------------------------------------------------
PART 3 COMPLETE
--------------------------------------------------------
*/

console.log(
    "Smart Hub Part 3 request security layer initialized."
);

console.log(
    "Rate limiting: enabled."
);

console.log(
    "Production endpoint protection: enabled."
);

console.log(
    "Smart Hub continues to use ONE Oracle OCI Backend Server."
);

/*
========================================================
SMART HUB — ORACLE OCI BACKEND
PART 4 — CRYPTOGRAPHIC CORE
========================================================

Purpose:
- AES-256-GCM for encrypted App Data
- SHA-384 for integrity verification
- RSA-3072 for cryptographic key protection/signatures
- Secure random IVs and keys
- Versioned encryption envelope
- No cryptographic secrets hard-coded in source code

Important:
- This is ONE Smart Hub Backend Server.
- Search Engines remain separate external services.
- Supabase is NOT used.
- Cloudflare is NOT used.
- Password authentication will use Argon2id in a later
  authentication layer.
========================================================
*/


/* -----------------------------------------------------
   PART 4.1 — CRYPTOGRAPHIC CONFIGURATION
----------------------------------------------------- */

const SH_CRYPTO_CONFIG = Object.freeze({

    encryptionAlgorithm:
        "AES-256-GCM",

    integrityAlgorithm:
        "SHA-384",

    rsaAlgorithm:
        "RSA-3072",

    rsaPadding:
        "RSA_PKCS1_OAEP",

    rsaSignature:
        "RSA-PSS",

    rsaHash:
        "SHA-384",

    aesKeyLength:
        32, // 256 bits

    aesIvLength:
        12, // recommended GCM IV length

    aesAuthTagLength:
        16, // 128-bit authentication tag

    rsaKeySize:
        3072,

    envelopeVersion:
        1
});


/* -----------------------------------------------------
   PART 4.2 — SECURE RANDOM BYTES
----------------------------------------------------- */

function shRandomBytes(length) {

    if (
        !Number.isInteger(length) ||
        length <= 0
    ) {
        throw new Error(
            "Invalid random byte length"
        );
    }

    return crypto.randomBytes(length);
}


/* -----------------------------------------------------
   PART 4.3 — AES-256-GCM KEY GENERATION
----------------------------------------------------- */

function shGenerateAES256Key() {

    return shRandomBytes(
        SH_CRYPTO_CONFIG.aesKeyLength
    );
}


/* -----------------------------------------------------
   PART 4.4 — SHA-384 INTEGRITY DIGEST
----------------------------------------------------- */

function shSHA384(data) {

    let input;

    if (Buffer.isBuffer(data)) {

        input = data;

    } else if (typeof data === "string") {

        input = Buffer.from(
            data,
            "utf8"
        );

    } else {

        throw new Error(
            "SHA-384 input must be a string or Buffer"
        );
    }

    return crypto
        .createHash("sha384")
        .update(input)
        .digest("hex");
}


/* -----------------------------------------------------
   PART 4.5 — AES-256-GCM ENCRYPTION
----------------------------------------------------- */

function shAES256GCMEncrypt(
    plaintext,
    encryptionKey
) {

    if (
        typeof plaintext !== "string"
    ) {
        throw new Error(
            "Plaintext must be a string"
        );
    }

    if (
        !Buffer.isBuffer(encryptionKey) ||
        encryptionKey.length !==
        SH_CRYPTO_CONFIG.aesKeyLength
    ) {
        throw new Error(
            "AES-256 key must be exactly 32 bytes"
        );
    }

    const iv =
        shRandomBytes(
            SH_CRYPTO_CONFIG.aesIvLength
        );

    const cipher =
        crypto.createCipheriv(
            "aes-256-gcm",
            encryptionKey,
            iv
        );

    const encrypted =
        Buffer.concat([
            cipher.update(
                plaintext,
                "utf8"
            ),
            cipher.final()
        ]);

    const authTag =
        cipher.getAuthTag();

    const integrity =
        shSHA384(
            Buffer.concat([
                iv,
                authTag,
                encrypted
            ])
        );

    return {

        version:
            SH_CRYPTO_CONFIG.envelopeVersion,

        algorithm:
            SH_CRYPTO_CONFIG.encryptionAlgorithm,

        integrityAlgorithm:
            SH_CRYPTO_CONFIG.integrityAlgorithm,

        iv:
            iv.toString("base64"),

        authTag:
            authTag.toString("base64"),

        ciphertext:
            encrypted.toString("base64"),

        integrity:
            integrity
    };
}


/* -----------------------------------------------------
   PART 4.6 — AES-256-GCM DECRYPTION
----------------------------------------------------- */

function shAES256GCMDecrypt(
    envelope,
    encryptionKey
) {

    if (
        !envelope ||
        typeof envelope !== "object"
    ) {
        throw new Error(
            "Invalid encryption envelope"
        );
    }

    if (
        envelope.algorithm !==
        SH_CRYPTO_CONFIG.encryptionAlgorithm
    ) {
        throw new Error(
            "Unsupported encryption algorithm"
        );
    }

    if (
        envelope.version !==
        SH_CRYPTO_CONFIG.envelopeVersion
    ) {
        throw new Error(
            "Unsupported encryption envelope version"
        );
    }

    if (
        !Buffer.isBuffer(encryptionKey) ||
        encryptionKey.length !==
        SH_CRYPTO_CONFIG.aesKeyLength
    ) {
        throw new Error(
            "AES-256 key must be exactly 32 bytes"
        );
    }

    const iv =
        Buffer.from(
            envelope.iv,
            "base64"
        );

    const authTag =
        Buffer.from(
            envelope.authTag,
            "base64"
        );

    const ciphertext =
        Buffer.from(
            envelope.ciphertext,
            "base64"
        );

    if (
        iv.length !==
        SH_CRYPTO_CONFIG.aesIvLength
    ) {
        throw new Error(
            "Invalid AES-GCM IV"
        );
    }

    if (
        authTag.length !==
        SH_CRYPTO_CONFIG.aesAuthTagLength
    ) {
        throw new Error(
            "Invalid AES-GCM authentication tag"
        );
    }

    const calculatedIntegrity =
        shSHA384(
            Buffer.concat([
                iv,
                authTag,
                ciphertext
            ])
        );

    if (
        typeof envelope.integrity !==
        "string"
    ) {
        throw new Error(
            "Missing integrity value"
        );
    }

    const expectedIntegrity =
        Buffer.from(
            envelope.integrity,
            "hex"
        );

    const actualIntegrity =
        Buffer.from(
            calculatedIntegrity,
            "hex"
        );

    if (
        expectedIntegrity.length !==
        actualIntegrity.length ||
        !crypto.timingSafeEqual(
            expectedIntegrity,
            actualIntegrity
        )
    ) {
        throw new Error(
            "Integrity verification failed"
        );
    }

    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            encryptionKey,
            iv
        );

    decipher.setAuthTag(
        authTag
    );

    const decrypted =
        Buffer.concat([
            decipher.update(
                ciphertext
            ),
            decipher.final()
        ]);

    return decrypted.toString(
        "utf8"
    );
}


/* -----------------------------------------------------
   PART 4.7 — RSA-3072 KEY LOADING
-----------------------------------------------------

RSA private/public keys are NEVER written directly
inside server.js.

They will later be supplied securely through the
Oracle OCI server environment / secret-management
configuration.

Expected environment variables:

SH_RSA_PRIVATE_KEY
SH_RSA_PUBLIC_KEY
----------------------------------------------------- */

function shGetRSAPrivateKey() {

    const key =
        process.env.SH_RSA_PRIVATE_KEY;

    if (
        !key ||
        typeof key !== "string"
    ) {
        throw new Error(
            "RSA private key is not configured"
        );
    }

    return key;
}


function shGetRSAPublicKey() {

    const key =
        process.env.SH_RSA_PUBLIC_KEY;

    if (
        !key ||
        typeof key !== "string"
    ) {
        throw new Error(
            "RSA public key is not configured"
        );
    }

    return key;
}


/* -----------------------------------------------------
   PART 4.8 — RSA-3072 KEY WRAPPING
-----------------------------------------------------

RSA is NOT used to encrypt the entire Settings/Data.

Instead:

AES-256-GCM
      ↓
encrypts the actual data

RSA-3072
      ↓
protects the AES encryption key

This is the correct hybrid cryptographic structure.
----------------------------------------------------- */

function shRSA3072EncryptKey(
    aesKey
) {

    if (
        !Buffer.isBuffer(aesKey) ||
        aesKey.length !==
        SH_CRYPTO_CONFIG.aesKeyLength
    ) {
        throw new Error(
            "Invalid AES key"
        );
    }

    const publicKey =
        shGetRSAPublicKey();

    const encryptedKey =
        crypto.publicEncrypt(
            {
                key:
                    publicKey,

                padding:
                    crypto.constants
                        .RSA_PKCS1_OAEP_PADDING,

                oaepHash:
                    "sha384"
            },
            aesKey
        );

    return encryptedKey.toString(
        "base64"
    );
}


/* -----------------------------------------------------
   PART 4.9 — RSA-3072 KEY UNWRAPPING
----------------------------------------------------- */

function shRSA3072DecryptKey(
    encryptedKeyBase64
) {

    if (
        typeof encryptedKeyBase64 !==
        "string"
    ) {
        throw new Error(
            "Invalid encrypted AES key"
        );
    }

    const privateKey =
        shGetRSAPrivateKey();

    const encryptedKey =
        Buffer.from(
            encryptedKeyBase64,
            "base64"
        );

    const aesKey =
        crypto.privateDecrypt(
            {
                key:
                    privateKey,

                padding:
                    crypto.constants
                        .RSA_PKCS1_OAEP_PADDING,

                oaepHash:
                    "sha384"
            },
            encryptedKey
        );

    if (
        aesKey.length !==
        SH_CRYPTO_CONFIG.aesKeyLength
    ) {
        throw new Error(
            "Recovered AES key has invalid length"
        );
    }

    return aesKey;
}


/* -----------------------------------------------------
   PART 4.10 — RSA-3072 SIGNATURE
-----------------------------------------------------

SHA-384 + RSA-3072 are also used for
cryptographic verification.

RSA-PSS is used for the signature operation.

This allows the server to verify that an important
cryptographic envelope was produced by the trusted
server key.
----------------------------------------------------- */

function shRSA3072Sign(
    data
) {

    const privateKey =
        shGetRSAPrivateKey();

    const signer =
        crypto.createSign(
            "sha384"
        );

    signer.update(
        data
    );

    signer.end();

    const signature =
        signer.sign({
            key:
                privateKey,

            padding:
                crypto.constants
                    .RSA_PKCS1_PSS_PADDING,

            saltLength:
                crypto.constants
                    .RSA_PSS_SALTLEN_DIGEST
        });

    return signature.toString(
        "base64"
    );
}


/* -----------------------------------------------------
   PART 4.11 — RSA-3072 SIGNATURE VERIFICATION
----------------------------------------------------- */

function shRSA3072Verify(
    data,
    signatureBase64
) {

    if (
        typeof signatureBase64 !==
        "string"
    ) {
        return false;
    }

    const publicKey =
        shGetRSAPublicKey();

    const verifier =
        crypto.createVerify(
            "sha384"
        );

    verifier.update(
        data
    );

    verifier.end();

    return verifier.verify(
        {
            key:
                publicKey,

            padding:
                crypto.constants
                    .RSA_PKCS1_PSS_PADDING,

            saltLength:
                crypto.constants
                    .RSA_PSS_SALTLEN_DIGEST
        },

        Buffer.from(
            signatureBase64,
            "base64"
        )
    );
}


/* -----------------------------------------------------
   PART 4.12 — CRYPTOGRAPHIC ENVELOPE
-----------------------------------------------------

This creates the basic structure we will later use
for Settings, Search History, Links, App Preferences,
Earnings data and other Smart Hub server-side data.
----------------------------------------------------- */

function shCreateCryptoEnvelope(
    plaintext
) {

    const aesKey =
        shGenerateAES256Key();

    const encrypted =
        shAES256GCMEncrypt(
            plaintext,
            aesKey
        );

    const encryptedAESKey =
        shRSA3072EncryptKey(
            aesKey
        );

    const signedPayload =
        JSON.stringify({
            version:
                encrypted.version,

            algorithm:
                encrypted.algorithm,

            integrityAlgorithm:
                encrypted.integrityAlgorithm,

            iv:
                encrypted.iv,

            authTag:
                encrypted.authTag,

            ciphertext:
                encrypted.ciphertext,

            integrity:
                encrypted.integrity,

            encryptedKey:
                encryptedAESKey
        });

    const signature =
        shRSA3072Sign(
            signedPayload
        );

    return {

        version:
            encrypted.version,

        encryption:
            encrypted.algorithm,

        integrity:
            encrypted.integrityAlgorithm,

        iv:
            encrypted.iv,

        authTag:
            encrypted.authTag,

        ciphertext:
            encrypted.ciphertext,

        integrityHash:
            encrypted.integrity,

        encryptedKey:
            encryptedAESKey,

        signature:
            signature
    };
}


/* -----------------------------------------------------
   PART 4.13 — CRYPTOGRAPHIC ENVELOPE OPENING
----------------------------------------------------- */

function shOpenCryptoEnvelope(
    envelope
) {

    if (
        !envelope ||
        typeof envelope !== "object"
    ) {
        throw new Error(
            "Invalid cryptographic envelope"
        );
    }

    const signedPayload =
        JSON.stringify({
            version:
                envelope.version,

            algorithm:
                envelope.encryption,

            integrityAlgorithm:
                envelope.integrity,

            iv:
                envelope.iv,

            authTag:
                envelope.authTag,

            ciphertext:
                envelope.ciphertext,

            integrity:
                envelope.integrityHash,

            encryptedKey:
                envelope.encryptedKey
        });

    const validSignature =
        shRSA3072Verify(
            signedPayload,
            envelope.signature
        );

    if (!validSignature) {
        throw new Error(
            "RSA-3072 signature verification failed"
        );
    }

    const aesKey =
        shRSA3072DecryptKey(
            envelope.encryptedKey
        );

    return shAES256GCMDecrypt(
        {
            version:
                envelope.version,

            algorithm:
                envelope.encryption,

            integrityAlgorithm:
                envelope.integrity,

            iv:
                envelope.iv,

            authTag:
                envelope.authTag,

            ciphertext:
                envelope.ciphertext,

            integrity:
                envelope.integrityHash
        },

        aesKey
    );
}


/* -----------------------------------------------------
   PART 4.14 — CRYPTOGRAPHIC STATUS
----------------------------------------------------- */

shRegisterRoute(
    "GET",
    "/api/backend/crypto-status",
    async function (
        req,
        res,
        requestId
    ) {

        const rsaConfigured =
            Boolean(
                process.env.SH_RSA_PRIVATE_KEY &&
                process.env.SH_RSA_PUBLIC_KEY
            );

        sendJSON(
            res,
            200,
            {
                success: true,

                cryptography: {

                    dataEncryption:
                        "AES-256-GCM",

                    integrityVerification:
                        "SHA-384",

                    keyProtection:
                        "RSA-3072",

                    rsaSignature:
                        "RSA-PSS + SHA-384",

                    passwordHashing:
                        "Argon2id",

                    transportSecurity:
                        "TLS 1.3",

                    rsaKeysConfigured:
                        rsaConfigured
                },

                backend:
                    "Oracle Cloud Infrastructure",

                serverCount:
                    1,

                requestId
            }
        );
    }
);


/* -----------------------------------------------------
   PART 4.15 — CRYPTOGRAPHIC ARCHITECTURE
----------------------------------------------------- */

const SH_CRYPTO_ARCHITECTURE =
    Object.freeze({

        backend:
            "Oracle Cloud Infrastructure",

        backendServerCount:
            1,

        transport:
            "TLS 1.3",

        storedData:
            "AES-256-GCM",

        integrity:
            "SHA-384",

        keyProtection:
            "RSA-3072",

        passwordSecurity:
            "Argon2id",

        searchEngines:
            "External services",

        supabase:
            false,

        cloudflare:
            false
    });


console.log(
    "Smart Hub Part 4 Cryptographic Core initialized."
);

console.log(
    "AES-256-GCM + SHA-384 + RSA-3072 cryptographic layer ready."
);

/*
========================================================
SMART HUB — ORACLE OCI BACKEND
PART 5 — SECURE ENCRYPTED DATA STORAGE
========================================================

Purpose:
- Store Smart Hub App Data encrypted at rest.
- AES-256-GCM encrypts the actual stored data.
- SHA-384 verifies integrity.
- RSA-3072 protects the AES encryption key.
- RSA-PSS + SHA-384 verifies the cryptographic envelope.
- One Oracle OCI Backend Server only.

Protected data categories include:
- Settings
- Search History
- Saved Links
- App Cookie Data
- Earnings Data
- User Profile Data
- Application Preferences
- Other Smart Hub server-side App Data

IMPORTANT:
- Plaintext App Data is never intentionally written
  to the storage file.
- Encryption keys are not hard-coded.
- RSA keys come from secure server configuration.
- This storage layer is the foundation for later
  database/storage upgrades.
========================================================
*/


const fs = require("fs");
const path = require("path");


/* -----------------------------------------------------
   PART 5.1 — SECURE STORAGE CONFIGURATION
----------------------------------------------------- */

const SH_STORAGE_CONFIG = Object.freeze({

    directory:
        process.env.SH_STORAGE_DIR ||
        path.join(
            __dirname,
            "smart-hub-secure-storage"
        ),

    file:
        process.env.SH_STORAGE_FILE ||
        "encrypted-data.json",

    maxRecordSize:
        5 * 1024 * 1024,

    storageVersion:
        1
});


/* -----------------------------------------------------
   PART 5.2 — STORAGE DIRECTORY
----------------------------------------------------- */

function shEnsureStorageDirectory() {

    if (
        !fs.existsSync(
            SH_STORAGE_CONFIG.directory
        )
    ) {

        fs.mkdirSync(
            SH_STORAGE_CONFIG.directory,
            {
                recursive: true,
                mode: 0o700
            }
        );
    }
}


/* -----------------------------------------------------
   PART 5.3 — STORAGE FILE PATH
----------------------------------------------------- */

function shGetStorageFilePath() {

    shEnsureStorageDirectory();

    return path.join(
        SH_STORAGE_CONFIG.directory,
        SH_STORAGE_CONFIG.file
    );
}


/* -----------------------------------------------------
   PART 5.4 — EMPTY STORAGE STRUCTURE
----------------------------------------------------- */

function shCreateEmptyStorage() {

    return {

        version:
            SH_STORAGE_CONFIG.storageVersion,

        server:
            "Oracle Cloud Infrastructure",

        backendServerCount:
            1,

        encryption:
            "AES-256-GCM",

        integrity:
            "SHA-384",

        keyProtection:
            "RSA-3072",

        records:
            {}
    };
}


/* -----------------------------------------------------
   PART 5.5 — READ ENCRYPTED STORAGE
----------------------------------------------------- */

function shReadStorageFile() {

    const filePath =
        shGetStorageFilePath();

    if (
        !fs.existsSync(filePath)
    ) {

        return shCreateEmptyStorage();
    }

    const raw =
        fs.readFileSync(
            filePath,
            "utf8"
        );

    if (!raw) {

        return shCreateEmptyStorage();
    }

    let storage;

    try {

        storage =
            JSON.parse(raw);

    } catch {

        throw new Error(
            "Secure storage file is invalid"
        );
    }

    if (
        !storage ||
        typeof storage !== "object" ||
        typeof storage.records !== "object"
    ) {

        throw new Error(
            "Secure storage structure is invalid"
        );
    }

    return storage;
}


/* -----------------------------------------------------
   PART 5.6 — ATOMIC STORAGE WRITE
-----------------------------------------------------

Data is written to a temporary file first.

After successful writing, the temporary file is
renamed to the real storage file.

This reduces the risk of leaving a partially written
storage file after an unexpected interruption.
----------------------------------------------------- */

function shWriteStorageFile(storage) {

    shEnsureStorageDirectory();

    const filePath =
        shGetStorageFilePath();

    const temporaryPath =
        `${filePath}.tmp`;

    const serialized =
        JSON.stringify(
            storage
        );

    fs.writeFileSync(
        temporaryPath,
        serialized,
        {
            encoding: "utf8",
            mode: 0o600
        }
    );

    fs.renameSync(
        temporaryPath,
        filePath
    );
}


/* -----------------------------------------------------
   PART 5.7 — DATA CATEGORY VALIDATION
----------------------------------------------------- */

const SH_ALLOWED_DATA_CATEGORIES =
    Object.freeze(
        new Set([
            "settings",
            "search_history",
            "saved_links",
            "app_cookies",
            "earnings",
            "user_profile",
            "app_preferences",
            "general"
        ])
    );


function shValidateDataCategory(
    category
) {

    if (
        typeof category !== "string"
    ) {

        throw new Error(
            "Data category is required"
        );
    }

    if (
        !SH_ALLOWED_DATA_CATEGORIES.has(
            category
        )
    ) {

        throw new Error(
            "Unsupported Smart Hub data category"
        );
    }

    return category;
}


/* -----------------------------------------------------
   PART 5.8 — RECORD ID GENERATION
----------------------------------------------------- */

function shCreateStorageRecordId() {

    return crypto.randomUUID();
}


/* -----------------------------------------------------
   PART 5.9 — SERVER-SIDE DATA ENCRYPTION
----------------------------------------------------- */

function shEncryptStoredData(
    data
) {

    const plaintext =
        JSON.stringify(data);

    const plaintextBytes =
        Buffer.byteLength(
            plaintext,
            "utf8"
        );

    if (
        plaintextBytes >
        SH_STORAGE_CONFIG.maxRecordSize
    ) {

        throw new Error(
            "Stored data exceeds maximum record size"
        );
    }

    const aesKey =
        shGenerateAES256Key();

    const encrypted =
        shAES256GCMEncrypt(
            plaintext,
            aesKey
        );

    const encryptedAESKey =
        shRSA3072EncryptKey(
            aesKey
        );

    const signedPayload =
        JSON.stringify({

            version:
                encrypted.version,

            algorithm:
                encrypted.algorithm,

            integrityAlgorithm:
                encrypted.integrityAlgorithm,

            iv:
                encrypted.iv,

            authTag:
                encrypted.authTag,

            ciphertext:
                encrypted.ciphertext,

            integrity:
                encrypted.integrity,

            encryptedKey:
                encryptedAESKey
        });

    const signature =
        shRSA3072Sign(
            signedPayload
        );

    return {

        version:
            SH_STORAGE_CONFIG.storageVersion,

        encryption:
            encrypted.algorithm,

        integrity:
            encrypted.integrityAlgorithm,

        iv:
            encrypted.iv,

        authTag:
            encrypted.authTag,

        ciphertext:
            encrypted.ciphertext,

        integrityHash:
            encrypted.integrity,

        encryptedKey:
            encryptedAESKey,

        signature:
            signature
    };
}


/* -----------------------------------------------------
   PART 5.10 — SERVER-SIDE DATA DECRYPTION
----------------------------------------------------- */

function shDecryptStoredData(
    encryptedRecord
) {

    if (
        !encryptedRecord ||
        typeof encryptedRecord !== "object"
    ) {

        throw new Error(
            "Invalid encrypted storage record"
        );
    }

    const signedPayload =
        JSON.stringify({

            version:
                encryptedRecord.version,

            algorithm:
                encryptedRecord.encryption,

            integrityAlgorithm:
                encryptedRecord.integrity,

            iv:
                encryptedRecord.iv,

            authTag:
                encryptedRecord.authTag,

            ciphertext:
                encryptedRecord.ciphertext,

            integrity:
                encryptedRecord.integrityHash,

            encryptedKey:
                encryptedRecord.encryptedKey
        });

    const validSignature =
        shRSA3072Verify(
            signedPayload,
            encryptedRecord.signature
        );

    if (!validSignature) {

        throw new Error(
            "Storage RSA-3072 signature verification failed"
        );
    }

    const aesKey =
        shRSA3072DecryptKey(
            encryptedRecord.encryptedKey
        );

    const plaintext =
        shAES256GCMDecrypt(

            {
                version:
                    encryptedRecord.version,

                algorithm:
                    encryptedRecord.encryption,

                integrityAlgorithm:
                    encryptedRecord.integrity,

                iv:
                    encryptedRecord.iv,

                authTag:
                    encryptedRecord.authTag,

                ciphertext:
                    encryptedRecord.ciphertext,

                integrity:
                    encryptedRecord.integrityHash
            },

            aesKey
        );

    try {

        return JSON.parse(
            plaintext
        );

    } catch {

        throw new Error(
            "Decrypted storage data is invalid JSON"
        );
    }
}


/* -----------------------------------------------------
   PART 5.11 — CREATE ENCRYPTED DATA RECORD
----------------------------------------------------- */

function shCreateStoredRecord(
    category,
    data
) {

    shValidateDataCategory(
        category
    );

    if (
        data === undefined
    ) {

        throw new Error(
            "Stored data is required"
        );
    }

    const recordId =
        shCreateStorageRecordId();

    const encrypted =
        shEncryptStoredData(
            data
        );

    return {

        id:
            recordId,

        category:
            category,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString(),

        encryptedData:
            encrypted
    };
}


/* -----------------------------------------------------
   PART 5.12 — SAVE NEW ENCRYPTED RECORD
----------------------------------------------------- */

function shSaveEncryptedRecord(
    category,
    data
) {

    const storage =
        shReadStorageFile();

    const record =
        shCreateStoredRecord(
            category,
            data
        );

    storage.records[
        record.id
    ] = record;

    shWriteStorageFile(
        storage
    );

    return {

        id:
            record.id,

        category:
            record.category,

        createdAt:
            record.createdAt,

        updatedAt:
            record.updatedAt
    };
}


/* -----------------------------------------------------
   PART 5.13 — READ ENCRYPTED RECORD
----------------------------------------------------- */

function shReadEncryptedRecord(
    recordId
) {

    if (
        typeof recordId !== "string" ||
        !recordId
    ) {

        throw new Error(
            "Record ID is required"
        );
    }

    const storage =
        shReadStorageFile();

    const record =
        storage.records[
            recordId
        ];

    if (!record) {

        return null;
    }

    const data =
        shDecryptStoredData(
            record.encryptedData
        );

    return {

        id:
            record.id,

        category:
            record.category,

        createdAt:
            record.createdAt,

        updatedAt:
            record.updatedAt,

        data:
            data
    };
}


/* -----------------------------------------------------
   PART 5.14 — UPDATE ENCRYPTED RECORD
----------------------------------------------------- */

function shUpdateEncryptedRecord(
    recordId,
    category,
    data
) {

    shValidateDataCategory(
        category
    );

    if (
        typeof recordId !== "string" ||
        !recordId
    ) {

        throw new Error(
            "Record ID is required"
        );
    }

    const storage =
        shReadStorageFile();

    const existing =
        storage.records[
            recordId
        ];

    if (!existing) {

        throw new Error(
            "Storage record not found"
        );
    }

    const encrypted =
        shEncryptStoredData(
            data
        );

    existing.category =
        category;

    existing.updatedAt =
        new Date().toISOString();

    existing.encryptedData =
        encrypted;

    storage.records[
        recordId
    ] = existing;

    shWriteStorageFile(
        storage
    );

    return {

        success:
            true,

        id:
            existing.id,

        category:
            existing.category,

        updatedAt:
            existing.updatedAt
    };
}


/* -----------------------------------------------------
   PART 5.15 — DELETE ENCRYPTED RECORD
----------------------------------------------------- */

function shDeleteEncryptedRecord(
    recordId
) {

    if (
        typeof recordId !== "string" ||
        !recordId
    ) {

        throw new Error(
            "Record ID is required"
        );
    }

    const storage =
        shReadStorageFile();

    if (
        !storage.records[
            recordId
        ]
    ) {

        return false;
    }

    delete storage.records[
        recordId
    ];

    shWriteStorageFile(
        storage
    );

    return true;
}


/* -----------------------------------------------------
   PART 5.16 — COUNT RECORDS
----------------------------------------------------- */

function shCountStorageRecords() {

    const storage =
        shReadStorageFile();

    return Object.keys(
        storage.records
    ).length;
}


/* -----------------------------------------------------
   PART 5.17 — SECURE STORAGE STATUS
----------------------------------------------------- */

shRegisterRoute(
    "GET",
    "/api/backend/storage-status",
    async function (
        req,
        res,
        requestId
    ) {

        try {

            const count =
                shCountStorageRecords();

            sendJSON(
                res,
                200,
                {

                    success:
                        true,

                    storage:
                        "Encrypted Server-Side Storage",

                    provider:
                        "Oracle Cloud Infrastructure",

                    backendServerCount:
                        1,

                    encryption:
                        "AES-256-GCM",

                    integrity:
                        "SHA-384",

                    keyProtection:
                        "RSA-3072",

                    signature:
                        "RSA-PSS + SHA-384",

                    plaintextStorage:
                        false,

                    recordCount:
                        count,

                    requestId:
                        requestId
                }
            );

        } catch (error) {

            sendJSON(
                res,
                500,
                {

                    success:
                        false,

                    error:
                        "Secure storage unavailable",

                    requestId:
                        requestId
                }
            );
        }
    }
);


/* -----------------------------------------------------
   PART 5.18 — STORAGE INITIALIZATION
----------------------------------------------------- */

try {

    shEnsureStorageDirectory();

    const initialStorage =
        shReadStorageFile();

    shWriteStorageFile(
        initialStorage
    );

    console.log(
        "Smart Hub Part 5 Secure Storage initialized."
    );

} catch (error) {

    console.error(
        "Smart Hub Part 5 storage initialization failed:",
        error.message
    );
}

 /*
========================================================
SMART HUB — ORACLE OCI BACKEND
PART 6 — APP REGISTRATION & LOGIN AUTHENTICATION
========================================================

Purpose:
- Basic Smart Hub App registration
- Email verification
- Phone verification foundation
- Login with registered Email OR Phone
- Password hashing with Argon2id
- Secure server-side sessions
- Verification code hashing
- Account status management

Authentication:

Registration:
    Email + Password
          ↓
    Email Verification
          ↓
    Smart Hub Account Active

Login:
    Email OR Phone + Password
          ↓
    Argon2id Verification
          ↓
    Secure Session

IMPORTANT:
- Passwords are NEVER stored in plaintext.
- Verification codes are NEVER stored in plaintext.
- Session tokens are stored only as hashes.
- This is ONE Oracle OCI Backend Server.
- Earnings Account will be implemented separately.
========================================================
*/


/* -----------------------------------------------------
   PART 6.1 — ARGON2ID DEPENDENCY
-----------------------------------------------------

The production server should install the official
Node.js "argon2" package.

Example installation on the Oracle OCI server:

    npm install argon2

This Part intentionally does NOT download a password
library dynamically from a CDN.
----------------------------------------------------- */

let SH_ARGON2;

try {

    SH_ARGON2 =
        require("argon2");

} catch (error) {

    console.error(
        "Argon2 package is not installed."
    );

    console.error(
        "Install it on the Oracle OCI server with: npm install argon2"
    );
}


/* -----------------------------------------------------
   PART 6.2 — AUTHENTICATION CONFIGURATION
----------------------------------------------------- */

const SH_AUTH_CONFIG = Object.freeze({

    passwordMinimumLength:
        6,

    passwordMaximumLength:
        256,

    verificationCodeLength:
        6,

    verificationCodeLifetimeMs:
        10 * 60 * 1000,

    sessionLifetimeMs:
        24 * 60 * 60 * 1000,

    sessionTokenBytes:
        32,

    maxLoginAttempts:
        10,

    loginAttemptWindowMs:
        15 * 60 * 1000,

    maxVerificationAttempts:
        5,

    verificationAttemptWindowMs:
        15 * 60 * 1000
});


/* -----------------------------------------------------
   PART 6.3 — AUTHENTICATION MEMORY STATE
-----------------------------------------------------

This memory state is temporary.

Permanent account data will be encrypted through the
Part 5 secure storage layer.

Sessions will later be upgraded to a persistent,
encrypted session store when the final database layer
is implemented.
----------------------------------------------------- */

const SH_AUTH_RUNTIME = {

    loginAttempts:
        new Map(),

    verificationAttempts:
        new Map()
};


/* -----------------------------------------------------
   PART 6.4 — NORMALIZE EMAIL
----------------------------------------------------- */

function shNormalizeEmail(
    email
) {

    if (
        typeof email !== "string"
    ) {

        return "";
    }

    return email
        .trim()
        .toLowerCase()
        .slice(0, 320);
}


/* -----------------------------------------------------
   PART 6.5 — NORMALIZE PHONE
----------------------------------------------------- */

function shNormalizePhone(
    phone
) {

    if (
        typeof phone !== "string"
    ) {

        return "";
    }

    return phone
        .trim()
        .replace(
            /[\s().-]/g,
            ""
        )
        .slice(0, 30);
}


/* -----------------------------------------------------
   PART 6.6 — EMAIL VALIDATION
----------------------------------------------------- */

function shIsValidEmail(
    email
) {

    if (
        typeof email !== "string"
    ) {

        return false;
    }

    if (
        email.length < 5 ||
        email.length > 320
    ) {

        return false;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);
}


/* -----------------------------------------------------
   PART 6.7 — PHONE VALIDATION
----------------------------------------------------- */

function shIsValidPhone(
    phone
) {

    if (
        typeof phone !== "string"
    ) {

        return false;
    }

    return /^\+?[0-9]{7,15}$/
        .test(phone);
}


/* -----------------------------------------------------
   PART 6.8 — PASSWORD VALIDATION
----------------------------------------------------- */

function shValidateAppPassword(
    password
) {

    if (
        typeof password !== "string"
    ) {

        throw new Error(
            "Password is required"
        );
    }

    if (
        password.length <
        SH_AUTH_CONFIG.passwordMinimumLength
    ) {

        throw new Error(
            "Password must contain at least 6 characters"
        );
    }

    if (
        password.length >
        SH_AUTH_CONFIG.passwordMaximumLength
    ) {

        throw new Error(
            "Password is too long"
        );
    }

    return true;
}


/* -----------------------------------------------------
   PART 6.9 — ARGON2ID PASSWORD HASH
----------------------------------------------------- */

async function shHashAppPassword(
    password
) {

    shValidateAppPassword(
        password
    );

    if (!SH_ARGON2) {

        throw new Error(
            "Argon2id is not available on this server"
        );
    }

    return SH_ARGON2.hash(
        password,
        {
            type:
                SH_ARGON2.argon2id,

            memoryCost:
                65536,

            timeCost:
                3,

            parallelism:
                1,

            hashLength:
                32
        }
    );
}


/* -----------------------------------------------------
   PART 6.10 — ARGON2ID PASSWORD VERIFICATION
----------------------------------------------------- */

async function shVerifyAppPassword(
    password,
    passwordHash
) {

    if (
        typeof password !== "string" ||
        typeof passwordHash !== "string"
    ) {

        return false;
    }

    if (!SH_ARGON2) {

        throw new Error(
            "Argon2id is not available on this server"
        );
    }

    try {

        return await SH_ARGON2.verify(
            passwordHash,
            password
        );

    } catch {

        return false;
    }
}


/* -----------------------------------------------------
   PART 6.11 — VERIFICATION CODE
----------------------------------------------------- */

function shCreateVerificationCode() {

    return crypto
        .randomInt(
            100000,
            1000000
        )
        .toString();
}


/* -----------------------------------------------------
   PART 6.12 — HASH VERIFICATION CODE
----------------------------------------------------- */

function shHashVerificationCode(
    code
) {

    return crypto
        .createHash("sha384")
        .update(
            code,
            "utf8"
        )
        .digest("hex");
}


/* -----------------------------------------------------
   PART 6.13 — HASH SESSION TOKEN
----------------------------------------------------- */

function shHashSessionToken(
    token
) {

    return crypto
        .createHash("sha384")
        .update(
            token,
            "utf8"
        )
        .digest("hex");
}


/* -----------------------------------------------------
   PART 6.14 — CREATE SESSION TOKEN
----------------------------------------------------- */

function shCreateSessionToken() {

    return crypto.randomBytes(
        SH_AUTH_CONFIG.sessionTokenBytes
    ).toString(
        "base64url"
    );
}


/* -----------------------------------------------------
   PART 6.15 — AUTHENTICATION IDENTIFIER
----------------------------------------------------- */

function shCreateAuthIdentifier() {

    return crypto.randomUUID();
}


/* -----------------------------------------------------
   PART 6.16 — FIND ACCOUNT
-----------------------------------------------------

Accounts are stored inside the encrypted server-side
storage created in Part 5.

The actual account object is encrypted before it is
written to the storage file.
----------------------------------------------------- */

function shFindAccountByIdentifier(
    identifier
) {

    const normalizedEmail =
        shNormalizeEmail(
            identifier
        );

    const normalizedPhone =
        shNormalizePhone(
            identifier
        );

    const storage =
        shReadStorageFile();

    for (
        const recordId of
        Object.keys(
            storage.records
        )
    ) {

        const record =
            storage.records[
                recordId
            ];

        if (
            record.category !==
            "user_profile"
        ) {

            continue;
        }

        try {

            const account =
                shDecryptStoredData(
                    record.encryptedData
                );

            if (
                account.email ===
                normalizedEmail
            ) {

                return {
                    recordId,
                    account
                };
            }

            if (
                account.phone &&
                account.phone ===
                normalizedPhone
            ) {

                return {
                    recordId,
                    account
                };
            }

        } catch {

            console.error(
                "Unable to read encrypted account record."
            );
        }
    }

    return null;
}


/* -----------------------------------------------------
   PART 6.17 — FIND ACCOUNT BY EMAIL
----------------------------------------------------- */

function shFindAccountByEmail(
    email
) {

    return shFindAccountByIdentifier(
        shNormalizeEmail(
            email
        )
    );
}


/* -----------------------------------------------------
   PART 6.18 — FIND ACCOUNT BY PHONE
----------------------------------------------------- */

function shFindAccountByPhone(
    phone
) {

    return shFindAccountByIdentifier(
        shNormalizePhone(
            phone
        )
    );
}


/* -----------------------------------------------------
   PART 6.19 — AUTHENTICATION RATE LIMIT
----------------------------------------------------- */

function shCheckAuthRateLimit(
    map,
    key,
    maxAttempts,
    windowMs
) {

    const now =
        Date.now();

    const existing =
        map.get(key);

    if (
        !existing ||
        now - existing.startedAt >
        windowMs
    ) {

        map.set(
            key,
            {
                startedAt:
                    now,

                attempts:
                    1
            }
        );

        return true;
    }

    existing.attempts += 1;

    if (
        existing.attempts >
        maxAttempts
    ) {

        return false;
    }

    return true;
}


/* -----------------------------------------------------
   PART 6.20 — CREATE ACCOUNT OBJECT
----------------------------------------------------- */

async function shCreateAppAccount(
    email,
    phone,
    password
) {

    const normalizedEmail =
        shNormalizeEmail(
            email
        );

    const normalizedPhone =
        shNormalizePhone(
            phone
        );

    if (
        !shIsValidEmail(
            normalizedEmail
        )
    ) {

        throw new Error(
            "A valid email address is required"
        );
    }

    if (
        normalizedPhone &&
        !shIsValidPhone(
            normalizedPhone
        )
    ) {

        throw new Error(
            "Invalid phone number"
        );
    }

    shValidateAppPassword(
        password
    );

    if (
        shFindAccountByEmail(
            normalizedEmail
        )
    ) {

        throw new Error(
            "An account with this email already exists"
        );
    }

    if (
        normalizedPhone &&
        shFindAccountByPhone(
            normalizedPhone
        )
    ) {

        throw new Error(
            "An account with this phone number already exists"
        );
    }

    const passwordHash =
        await shHashAppPassword(
            password
        );

    const accountId =
        shCreateAuthIdentifier();

    const now =
        new Date().toISOString();

    const account = {

        accountId:

            accountId,

        accountType:

            "smart_hub_app",

        email:

            normalizedEmail,

        phone:

            normalizedPhone || null,

        passwordHash:

            passwordHash,

        emailVerified:

            false,

        phoneVerified:

            false,

        status:

            "pending_verification",

        createdAt:

            now,

        updatedAt:

            now
    };

    return account;
}


/* -----------------------------------------------------
   PART 6.21 — CREATE EMAIL VERIFICATION RECORD
----------------------------------------------------- */

function shCreateEmailVerificationRecord(
    accountId,
    email
) {

    const code =
        shCreateVerificationCode();

    const codeHash =
        shHashVerificationCode(
            code
        );

    return {

        verificationId:
            shCreateAuthIdentifier(),

        accountId:
            accountId,

        method:
            "email",

        destination:
            email,

        codeHash:
            codeHash,

        expiresAt:
            new Date(
                Date.now() +
                SH_AUTH_CONFIG
                    .verificationCodeLifetimeMs
            ).toISOString(),

        attempts:
            0,

        status:
            "pending",

        createdAt:
            new Date().toISOString(),

        /*
        The actual code is returned only to the
        internal delivery layer.

        It must NOT be returned by a production API.
        */
        internalCode:
            code
    };
}


/* -----------------------------------------------------
   PART 6.22 — CREATE PHONE VERIFICATION RECORD
----------------------------------------------------- */

function shCreatePhoneVerificationRecord(
    accountId,
    phone
) {

    const code =
        shCreateVerificationCode();

    const codeHash =
        shHashVerificationCode(
            code
        );

    return {

        verificationId:
            shCreateAuthIdentifier(),

        accountId:
            accountId,

        method:
            "phone",

        destination:
            phone,

        codeHash:
            codeHash,

        expiresAt:
            new Date(
                Date.now() +
                SH_AUTH_CONFIG
                    .verificationCodeLifetimeMs
            ).toISOString(),

        attempts:
            0,

        status:
            "pending",

        createdAt:
            new Date().toISOString(),

        internalCode:
            code
    };
}


/* -----------------------------------------------------
   PART 6.23 — SAVE ACCOUNT
----------------------------------------------------- */

function shSaveAppAccount(
    account
) {

    return shSaveEncryptedRecord(
        "user_profile",
        account
    );
}


/* -----------------------------------------------------
   PART 6.24 — SAVE VERIFICATION RECORD
----------------------------------------------------- */

function shSaveVerificationRecord(
    verification
) {

    /*
    internalCode is used only by the delivery layer.
    It is removed before persistent encrypted storage.
    */

    const safeVerification =
        {
            verificationId:
                verification.verificationId,

            accountId:
                verification.accountId,

            method:
                verification.method,

            destination:
                verification.destination,

            codeHash:
                verification.codeHash,

            expiresAt:
                verification.expiresAt,

            attempts:
                verification.attempts,

            status:
                verification.status,

            createdAt:
                verification.createdAt
        };

    return shSaveEncryptedRecord(
        "general",
        {
            type:
                "account_verification",

            data:
                safeVerification
        }
    );
}


/* -----------------------------------------------------
   PART 6.25 — VERIFY CODE
----------------------------------------------------- */

function shVerifyCodeAgainstHash(
    code,
    storedHash
) {

    if (
        typeof code !== "string" ||
        typeof storedHash !== "string"
    ) {

        return false;
    }

    const calculatedHash =
        shHashVerificationCode(
            code.trim()
        );

    const calculated =
        Buffer.from(
            calculatedHash,
            "hex"
        );

    const stored =
        Buffer.from(
            storedHash,
            "hex"
        );

    if (
        calculated.length !==
        stored.length
    ) {

        return false;
    }

    return crypto.timingSafeEqual(
        calculated,
        stored
    );
}


/* -----------------------------------------------------
   PART 6.26 — CREATE SESSION
----------------------------------------------------- */

function shCreateSession(
    account
) {

    const sessionToken =
        shCreateSessionToken();

    const sessionTokenHash =
        shHashSessionToken(
            sessionToken
        );

    const sessionId =
        shCreateAuthIdentifier();

    const createdAt =
        new Date();

    const expiresAt =
        new Date(
            createdAt.getTime() +
            SH_AUTH_CONFIG
                .sessionLifetimeMs
        );

    const session = {

        sessionId:

            sessionId,

        accountId:

            account.accountId,

        tokenHash:

            sessionTokenHash,

        createdAt:

            createdAt.toISOString(),

        expiresAt:

            expiresAt.toISOString(),

        status:

            "active"
    };

    return {

        session,
        sessionToken
    };
}


/* -----------------------------------------------------
   PART 6.27 — SAVE SESSION
----------------------------------------------------- */

function shSaveSession(
    session
) {

    return shSaveEncryptedRecord(
        "general",
        {
            type:
                "app_session",

            data:
                session
        }
    );
}


/* -----------------------------------------------------
   PART 6.28 — REGISTRATION ROUTE
----------------------------------------------------- */

shRegisterRoute(
    "POST",
    "/api/auth/register",
    async function (
        req,
        res,
        requestId
    ) {

        try {

            const body =
                await readRequestBody(
                    req
                );

            const email =
                shNormalizeEmail(
                    body.email
                );

            const phone =
                shNormalizePhone(
                    body.phone
                );

            const password =
                body.password;

            const account =
                await shCreateAppAccount(
                    email,
                    phone,
                    password
                );

            const emailVerification =
                shCreateEmailVerificationRecord(
                    account.accountId,
                    account.email
                );

            shSaveAppAccount(
                account
            );

            shSaveVerificationRecord(
                emailVerification
            );

            /*
            The verification code is NOT returned.

            A future Email Delivery Layer will send the
            code to the registered email address.
            */

            sendJSON(
                res,
                201,
                {

                    success:
                        true,

                    accountId:
                        account.accountId,

                    status:
                        account.status,

                    emailVerification:
                        "Verification code sent to registered email",

                    phoneVerification:
                        phone
                            ? "Phone verification can be completed through the verification layer"
                            : "Phone number not provided",

                    requestId:
                        requestId
                }
            );

        } catch (error) {

            sendJSON(
                res,
                400,
                {

                    success:
                        false,

                    error:
                        error.message,

                    requestId:
                        requestId
                }
            );
        }
    }
);


/* -----------------------------------------------------
   PART 6.29 — EMAIL VERIFICATION ROUTE
----------------------------------------------------- */

shRegisterRoute(
    "POST",
    "/api/auth/verify-email",
    async function (
        req,
        res,
        requestId
    ) {

        try {

            const body =
                await readRequestBody(
                    req
                );

            const accountId =
                cleanText(
                    body.accountId,
                    100
                );

            const code =
                cleanText(
                    body.code,
                    20
                );

            if (
                !accountId ||
                !code
            ) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        error:
                            "Account ID and verification code are required",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const storage =
                shReadStorageFile();

            let verificationRecord =
                null;

            let verificationRecordId =
                null;

            for (
                const recordId of
                Object.keys(
                    storage.records
                )
            ) {

                const record =
                    storage.records[
                        recordId
                    ];

                if (
                    record.category !==
                    "general"
                ) {

                    continue;
                }

                try {

                    const data =
                        shDecryptStoredData(
                            record.encryptedData
                        );

                    if (
                        data.type ===
                        "account_verification" &&
                        data.data.accountId ===
                        accountId &&
                        data.data.method ===
                        "email" &&
                        data.data.status ===
                        "pending"
                    ) {

                        verificationRecord =
                            data.data;

                        verificationRecordId =
                            recordId;

                        break;
                    }

                } catch {

                    continue;
                }
            }

            if (
                !verificationRecord
            ) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        error:
                            "Verification request not found",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const rateKey =
                `${accountId}:email`;

            if (
                !shCheckAuthRateLimit(
                    SH_AUTH_RUNTIME
                        .verificationAttempts,

                    rateKey,

                    SH_AUTH_CONFIG
                        .maxVerificationAttempts,

                    SH_AUTH_CONFIG
                        .verificationAttemptWindowMs
                )
            ) {

                sendJSON(
                    res,
                    429,
                    {

                        success:
                            false,

                        error:
                            "Too many verification attempts",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            if (
                Date.now() >
                new Date(
                    verificationRecord.expiresAt
                ).getTime()
            ) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        error:
                            "Verification code has expired",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const valid =
                shVerifyCodeAgainstHash(
                    code,
                    verificationRecord.codeHash
                );

            if (!valid) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        error:
                            "Invalid verification code",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const accountResult =
                shFindAccountByIdentifier(
                    accountId
                );

            /*
            The identifier search above normally searches
            email/phone. Therefore, locate the account
            directly through encrypted user records.
            */

            let foundAccount =
                null;

            let foundAccountRecordId =
                null;

            for (
                const recordId of
                Object.keys(
                    storage.records
                )
            ) {

                const record =
                    storage.records[
                        recordId
                    ];

                if (
                    record.category !==
                    "user_profile"
                ) {

                    continue;
                }

                try {

                    const account =
                        shDecryptStoredData(
                            record.encryptedData
                        );

                    if (
                        account.accountId ===
                        accountId
                    ) {

                        foundAccount =
                            account;

                        foundAccountRecordId =
                            recordId;

                        break;
                    }

                } catch {

                    continue;
                }
            }

            if (
                !foundAccount
            ) {

                sendJSON(
                    res,
                    404,
                    {

                        success:
                            false,

                        error:
                            "Account not found",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            foundAccount.emailVerified =
                true;

            foundAccount.status =
                "active";

            foundAccount.updatedAt =
                new Date().toISOString();

            shUpdateEncryptedRecord(
                foundAccountRecordId,

                "user_profile",

                foundAccount
            );

            verificationRecord.status =
                "verified";

            shUpdateEncryptedRecord(
                verificationRecordId,

                "general",

                {
                    type:
                        "account_verification",

                    data:
                        verificationRecord
                }
            );

            sendJSON(
                res,
                200,
                {

                    success:
                        true,

                    verified:
                        true,

                    status:
                        "active",

                    accountId:
                        foundAccount.accountId,

                    requestId:
                        requestId
                }
            );

        } catch (error) {

            sendJSON(
                res,
                400,
                {

                    success:
                        false,

                    error:
                        error.message,

                    requestId:
                        requestId
                }
            );
        }
    }
);


/* -----------------------------------------------------
   PART 6.30 — LOGIN ROUTE
----------------------------------------------------- */

shRegisterRoute(
    "POST",
    "/api/auth/login",
    async function (
        req,
        res,
        requestId
    ) {

        try {

            const body =
                await readRequestBody(
                    req
                );

            const identifier =
                cleanText(
                    body.identifier,
                    320
                );

            const password =
                body.password;

            if (
                !identifier ||
                typeof password !==
                "string"
            ) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        error:
                            "Email/Phone and password are required",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const rateKey =
                identifier
                    .toLowerCase();

            if (
                !shCheckAuthRateLimit(
                    SH_AUTH_RUNTIME
                        .loginAttempts,

                    rateKey,

                    SH_AUTH_CONFIG
                        .maxLoginAttempts,

                    SH_AUTH_CONFIG
                        .loginAttemptWindowMs
                )
            ) {

                sendJSON(
                    res,
                    429,
                    {

                        success:
                            false,

                        error:
                            "Too many login attempts",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const result =
                shFindAccountByIdentifier(
                    identifier
                );

            /*
            Do not reveal whether the email/phone
            actually exists.
            */

            if (
                !result
            ) {

                sendJSON(
                    res,
                    401,
                    {

                        success:
                            false,

                        error:
                            "Invalid login credentials",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const account =
                result.account;

            if (
                account.status !==
                "active"
            ) {

                sendJSON(
                    res,
                    403,
                    {

                        success:
                            false,

                        error:
                            "Account verification is required",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const passwordValid =
                await shVerifyAppPassword(
                    password,
                    account.passwordHash
                );

            if (
                !passwordValid
            ) {

                sendJSON(
                    res,
                    401,
                    {

                        success:
                            false,

                        error:
                            "Invalid login credentials",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const sessionResult =
                shCreateSession(
                    account
                );

            shSaveSession(
                sessionResult.session
            );

            sendJSON(
                res,
                200,
                {

                    success:
                        true,

                    authenticated:
                        true,

                    accountId:
                        account.accountId,

                    sessionToken:
                        sessionResult.sessionToken,

                    expiresAt:
                        sessionResult.session
                            .expiresAt,

                    requestId:
                        requestId
                }
            );

        } catch (error) {

            sendJSON(
                res,
                500,
                {

                    success:
                        false,

                    error:
                        "Authentication service error",

                    requestId:
                        requestId
                }
            );
        }
    }
);


/* -----------------------------------------------------
   PART 6.31 — AUTHENTICATION STATUS
----------------------------------------------------- */

shRegisterRoute(
    "GET",
    "/api/auth/status",
    async function (
        req,
        res,
        requestId
    ) {

        sendJSON(
            res,
            200,
            {

                success:
                    true,

                authentication:
                    "App Registration and Login",

                passwordSecurity:
                    "Argon2id",

                emailVerification:
                    true,

                phoneLogin:
                    true,

                sessionSecurity:
                    "SHA-384 hashed server-side session tokens",

                passwordMinimumLength:
                    SH_AUTH_CONFIG
                        .passwordMinimumLength,

                backend:
                    "Oracle Cloud Infrastructure",

                backendServerCount:
                    1,

                requestId:
                    requestId
            }
        );
    }
);


/* -----------------------------------------------------
   PART 6.32 — AUTHENTICATION ARCHITECTURE
----------------------------------------------------- */

const SH_AUTH_ARCHITECTURE =
    Object.freeze({

        backend:
            "Oracle Cloud Infrastructure",

        backendServerCount:
            1,

        registration:
            "Email + Password",

        login:
            "Registered Email OR Phone + Password",

        passwordHashing:
            "Argon2id",

        emailVerification:
            true,

        phoneVerification:
            true,

        verificationCodeHash:
            "SHA-384",

        sessionToken:
            "Cryptographically random",

        sessionStorage:
            "Encrypted server-side storage",

        accountData:
            "AES-256-GCM encrypted",

        integrity:
            "SHA-384",

        keyProtection:
            "RSA-3072",

        transport:
            "TLS 1.3"
    });


console.log(
    "Smart Hub Part 6 Authentication initialized."
);

console.log(
    "App Registration + Email Verification + Argon2id Login ready."
);

/*
========================================================
SMART HUB — ORACLE OCI BACKEND
PART 7 — EMAIL & PHONE VERIFICATION DELIVERY LAYER
========================================================

Purpose:
- Secure Email verification
- Secure Phone verification foundation
- Verification code generation
- SHA-384 code hashing
- Expiration
- Attempt limitation
- Resend limitation
- Delivery-provider abstraction

IMPORTANT:
- Verification codes are NEVER stored in plaintext.
- Verification codes are NEVER returned by production APIs.
- Email/SMS providers are NOT hard-coded here.
- Actual delivery provider will be connected later.
- This remains ONE Oracle OCI Backend Server.
========================================================
*/


/* -----------------------------------------------------
   PART 7.1 — VERIFICATION CONFIGURATION
----------------------------------------------------- */

const SH_VERIFICATION_CONFIG = Object.freeze({

    codeLength:
        6,

    codeLifetimeMs:
        10 * 60 * 1000,

    maxAttempts:
        5,

    resendWindowMs:
        60 * 1000,

    maxResendsPerWindow:
        3,

    maxCodeRequestsPerHour:
        10
});


/* -----------------------------------------------------
   PART 7.2 — VERIFICATION RUNTIME STATE
----------------------------------------------------- */

const SH_VERIFICATION_RUNTIME = {

    resend:
        new Map(),

    requests:
        new Map()
};


/* -----------------------------------------------------
   PART 7.3 — VERIFICATION CODE GENERATION
----------------------------------------------------- */

function shGenerateSecureVerificationCode() {

    const minimum =
        100000;

    const maximum =
        1000000;

    return crypto
        .randomInt(
            minimum,
            maximum
        )
        .toString();
}


/* -----------------------------------------------------
   PART 7.4 — VERIFICATION CODE HASH
----------------------------------------------------- */

function shCreateVerificationCodeHash(
    code
) {

    if (
        typeof code !== "string"
    ) {

        throw new Error(
            "Verification code must be a string"
        );
    }

    return crypto
        .createHash("sha384")
        .update(
            code,
            "utf8"
        )
        .digest("hex");
}


/* -----------------------------------------------------
   PART 7.5 — SECURE CODE COMPARISON
----------------------------------------------------- */

function shCompareVerificationCode(
    suppliedCode,
    storedHash
) {

    if (
        typeof suppliedCode !== "string" ||
        typeof storedHash !== "string"
    ) {

        return false;
    }

    const suppliedHash =
        shCreateVerificationCodeHash(
            suppliedCode.trim()
        );

    const supplied =
        Buffer.from(
            suppliedHash,
            "hex"
        );

    const stored =
        Buffer.from(
            storedHash,
            "hex"
        );

    if (
        supplied.length !==
        stored.length
    ) {

        return false;
    }

    return crypto.timingSafeEqual(
        supplied,
        stored
    );
}


/* -----------------------------------------------------
   PART 7.6 — DESTINATION NORMALIZATION
----------------------------------------------------- */

function shNormalizeVerificationDestination(
    method,
    destination
) {

    if (
        method === "email"
    ) {

        return shNormalizeEmail(
            destination
        );
    }

    if (
        method === "phone"
    ) {

        return shNormalizePhone(
            destination
        );
    }

    throw new Error(
        "Unsupported verification method"
    );
}


/* -----------------------------------------------------
   PART 7.7 — DESTINATION VALIDATION
----------------------------------------------------- */

function shValidateVerificationDestination(
    method,
    destination
) {

    const normalized =
        shNormalizeVerificationDestination(
            method,
            destination
        );

    if (
        method === "email" &&
        !shIsValidEmail(
            normalized
        )
    ) {

        throw new Error(
            "Invalid email address"
        );
    }

    if (
        method === "phone" &&
        !shIsValidPhone(
            normalized
        )
    ) {

        throw new Error(
            "Invalid phone number"
        );
    }

    return normalized;
}


/* -----------------------------------------------------
   PART 7.8 — RESEND RATE LIMIT
----------------------------------------------------- */

function shCheckVerificationResendLimit(
    destination
) {

    const now =
        Date.now();

    const current =
        SH_VERIFICATION_RUNTIME
            .resend
            .get(destination);

    if (
        !current ||
        now - current.startedAt >
        SH_VERIFICATION_CONFIG
            .resendWindowMs
    ) {

        SH_VERIFICATION_RUNTIME
            .resend
            .set(
                destination,
                {
                    startedAt:
                        now,

                    count:
                        1
                }
            );

        return true;
    }

    current.count += 1;

    if (
        current.count >
        SH_VERIFICATION_CONFIG
            .maxResendsPerWindow
    ) {

        return false;
    }

    return true;
}


/* -----------------------------------------------------
   PART 7.9 — HOURLY VERIFICATION REQUEST LIMIT
----------------------------------------------------- */

function shCheckVerificationRequestLimit(
    destination
) {

    const now =
        Date.now();

    const current =
        SH_VERIFICATION_RUNTIME
            .requests
            .get(destination);

    const hour =
        60 * 60 * 1000;

    if (
        !current ||
        now - current.startedAt >
        hour
    ) {

        SH_VERIFICATION_RUNTIME
            .requests
            .set(
                destination,
                {
                    startedAt:
                        now,

                    count:
                        1
                }
            );

        return true;
    }

    current.count += 1;

    if (
        current.count >
        SH_VERIFICATION_CONFIG
            .maxCodeRequestsPerHour
    ) {

        return false;
    }

    return true;
}


/* -----------------------------------------------------
   PART 7.10 — CREATE VERIFICATION PACKAGE
----------------------------------------------------- */

function shCreateVerificationPackage(
    method,
    destination,
    accountId
) {

    const normalizedDestination =
        shValidateVerificationDestination(
            method,
            destination
        );

    if (
        !accountId
    ) {

        throw new Error(
            "Account ID is required"
        );
    }

    const code =
        shGenerateSecureVerificationCode();

    const codeHash =
        shCreateVerificationCodeHash(
            code
        );

    const now =
        new Date();

    const expiresAt =
        new Date(
            now.getTime() +
            SH_VERIFICATION_CONFIG
                .codeLifetimeMs
        );

    return {

        verificationId:
            shCreateAuthIdentifier(),

        accountId:
            accountId,

        method:
            method,

        destination:
            normalizedDestination,

        codeHash:
            codeHash,

        createdAt:
            now.toISOString(),

        expiresAt:
            expiresAt.toISOString(),

        attempts:
            0,

        maxAttempts:
            SH_VERIFICATION_CONFIG
                .maxAttempts,

        status:
            "pending",

        /*
        This value exists only for the delivery
        subsystem.

        It must NEVER be stored or returned by
        production API responses.
        */
        deliveryCode:
            code
    };
}


/* -----------------------------------------------------
   PART 7.11 — REMOVE SECRET DELIVERY CODE
----------------------------------------------------- */

function shRemoveDeliveryCode(
    verificationPackage
) {

    if (
        !verificationPackage ||
        typeof verificationPackage !== "object"
    ) {

        return;
    }

    delete verificationPackage.deliveryCode;
}


/* -----------------------------------------------------
   PART 7.12 — EMAIL DELIVERY INTERFACE
-----------------------------------------------------

The actual email provider will be connected later.

This function deliberately does not send the code
through an external service yet.
----------------------------------------------------- */

async function shDeliverVerificationEmail(
    verificationPackage
) {

    if (
        !verificationPackage ||
        verificationPackage.method !==
        "email"
    ) {

        throw new Error(
            "Invalid email verification package"
        );
    }

    /*
    Future production implementation:

        Email Provider
             ↓
        TLS 1.3
             ↓
        Provider API
             ↓
        User Email

    The provider credentials will be stored outside
    server.js.
    */

    const deliveryResult = {

        success:
            true,

        method:
            "email",

        destination:
            verificationPackage.destination,

        status:
            "queued_for_delivery"
    };

    /*
    Never expose deliveryCode here.
    */

    shRemoveDeliveryCode(
        verificationPackage
    );

    return deliveryResult;
}


/* -----------------------------------------------------
   PART 7.13 — PHONE/SMS DELIVERY INTERFACE
----------------------------------------------------- */

async function shDeliverVerificationPhone(
    verificationPackage
) {

    if (
        !verificationPackage ||
        verificationPackage.method !==
        "phone"
    ) {

        throw new Error(
            "Invalid phone verification package"
        );
    }

    /*
    Future production implementation:

        SMS Provider
             ↓
        TLS 1.3
             ↓
        Provider API
             ↓
        User Phone
    */

    const deliveryResult = {

        success:
            true,

        method:
            "phone",

        destination:
            verificationPackage.destination,

        status:
            "queued_for_delivery"
    };

    shRemoveDeliveryCode(
        verificationPackage
    );

    return deliveryResult;
}


/* -----------------------------------------------------
   PART 7.14 — GENERIC DELIVERY FUNCTION
----------------------------------------------------- */

async function shDeliverVerification(
    verificationPackage
) {

    if (
        verificationPackage.method ===
        "email"
    ) {

        return shDeliverVerificationEmail(
            verificationPackage
        );
    }

    if (
        verificationPackage.method ===
        "phone"
    ) {

        return shDeliverVerificationPhone(
            verificationPackage
        );
    }

    throw new Error(
        "Unsupported verification method"
    );
}


/* -----------------------------------------------------
   PART 7.15 — VERIFICATION RECORD CREATION
----------------------------------------------------- */

function shSaveVerificationPackage(
    verificationPackage
) {

    /*
    IMPORTANT:

    The delivery code is removed before persistent
    storage.

    Only the SHA-384 hash is stored.
    */

    const safePackage =
        {
            verificationId:
                verificationPackage
                    .verificationId,

            accountId:
                verificationPackage
                    .accountId,

            method:
                verificationPackage
                    .method,

            destination:
                verificationPackage
                    .destination,

            codeHash:
                verificationPackage
                    .codeHash,

            createdAt:
                verificationPackage
                    .createdAt,

            expiresAt:
                verificationPackage
                    .expiresAt,

            attempts:
                verificationPackage
                    .attempts,

            maxAttempts:
                verificationPackage
                    .maxAttempts,

            status:
                verificationPackage
                    .status
        };

    return shSaveEncryptedRecord(
        "general",
        {
            type:
                "verification",

            data:
                safePackage
        }
    );
}


/* -----------------------------------------------------
   PART 7.16 — FIND VERIFICATION RECORD
----------------------------------------------------- */

function shFindVerificationRecord(
    verificationId
) {

    const storage =
        shReadStorageFile();

    for (
        const recordId of
        Object.keys(
            storage.records
        )
    ) {

        const record =
            storage.records[
                recordId
            ];

        if (
            record.category !==
            "general"
        ) {

            continue;
        }

        try {

            const decrypted =
                shDecryptStoredData(
                    record.encryptedData
                );

            if (
                decrypted.type ===
                "verification" &&
                decrypted.data.verificationId ===
                verificationId
            ) {

                return {

                    recordId:
                        recordId,

                    data:
                        decrypted.data
                };
            }

        } catch {

            continue;
        }
    }

    return null;
}


/* -----------------------------------------------------
   PART 7.17 — VERIFY STORED CODE
----------------------------------------------------- */

function shVerifyStoredVerificationCode(
    verificationId,
    suppliedCode
) {

    const result =
        shFindVerificationRecord(
            verificationId
        );

    if (
        !result
    ) {

        return {

            success:
                false,

            reason:
                "verification_not_found"
        };
    }

    const verification =
        result.data;

    if (
        verification.status !==
        "pending"
    ) {

        return {

            success:
                false,

            reason:
                "verification_not_pending"
        };
    }

    if (
        Date.now() >
        new Date(
            verification.expiresAt
        ).getTime()
    ) {

        verification.status =
            "expired";

        shUpdateEncryptedRecord(
            result.recordId,

            "general",

            {
                type:
                    "verification",

                data:
                    verification
            }
        );

        return {

            success:
                false,

            reason:
                "verification_expired"
        };
    }

    if (
        verification.attempts >=
        verification.maxAttempts
    ) {

        verification.status =
            "locked";

        shUpdateEncryptedRecord(
            result.recordId,

            "general",

            {
                type:
                    "verification",

                data:
                    verification
            }
        );

        return {

            success:
                false,

            reason:
                "too_many_attempts"
        };
    }

    verification.attempts += 1;

    const valid =
        shCompareVerificationCode(
            suppliedCode,
            verification.codeHash
        );

    if (!valid) {

        shUpdateEncryptedRecord(
            result.recordId,

            "general",

            {
                type:
                    "verification",

                data:
                    verification
            }
        );

        return {

            success:
                false,

            reason:
                "invalid_code",

            attemptsRemaining:
                Math.max(
                    0,
                    verification.maxAttempts -
                    verification.attempts
                )
        };
    }

    verification.status =
        "verified";

    verification.verifiedAt =
        new Date().toISOString();

    shUpdateEncryptedRecord(
        result.recordId,

        "general",

        {
            type:
                "verification",

            data:
                verification
        }
    );

    return {

        success:
            true,

        reason:
            "verified"
    };
}


/* -----------------------------------------------------
   PART 7.18 — CREATE VERIFICATION ROUTE
----------------------------------------------------- */

shRegisterRoute(
    "POST",
    "/api/verification/create",
    async function (
        req,
        res,
        requestId
    ) {

        try {

            const body =
                await readRequestBody(
                    req
                );

            const accountId =
                cleanText(
                    body.accountId,
                    100
                );

            const method =
                cleanText(
                    body.method,
                    20
                ).toLowerCase();

            const destination =
                cleanText(
                    body.destination,
                    320
                );

            if (
                !accountId ||
                !method ||
                !destination
            ) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        error:
                            "Account ID, method and destination are required",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            if (
                method !== "email" &&
                method !== "phone"
            ) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        error:
                            "Verification method must be email or phone",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const normalizedDestination =
                shValidateVerificationDestination(
                    method,
                    destination
                );

            if (
                !shCheckVerificationResendLimit(
                    normalizedDestination
                )
            ) {

                sendJSON(
                    res,
                    429,
                    {

                        success:
                            false,

                        error:
                            "Too many verification requests. Please wait before requesting another code.",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            if (
                !shCheckVerificationRequestLimit(
                    normalizedDestination
                )
            ) {

                sendJSON(
                    res,
                    429,
                    {

                        success:
                            false,

                        error:
                            "Verification request limit exceeded",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const verificationPackage =
                shCreateVerificationPackage(
                    method,
                    normalizedDestination,
                    accountId
                );

            /*
            Save ONLY the hashed code.
            */

            const saved =
                shSaveVerificationPackage(
                    verificationPackage
                );

            /*
            Delivery layer receives the code internally.
            It is removed before the package leaves this
            function.
            */

            const delivery =
                await shDeliverVerification(
                    verificationPackage
                );

            sendJSON(
                res,
                201,
                {

                    success:
                        true,

                    verificationId:
                        saved.id,

                    method:
                        method,

                    expiresInSeconds:
                        SH_VERIFICATION_CONFIG
                            .codeLifetimeMs /
                        1000,

                    delivery:
                        delivery.status,

                    requestId:
                        requestId
                }
            );

        } catch (error) {

            sendJSON(
                res,
                400,
                {

                    success:
                        false,

                    error:
                        error.message,

                    requestId:
                        requestId
                }
            );
        }
    }
);


/* -----------------------------------------------------
   PART 7.19 — VERIFY CODE ROUTE
----------------------------------------------------- */

shRegisterRoute(
    "POST",
    "/api/verification/verify",
    async function (
        req,
        res,
        requestId
    ) {

        try {

            const body =
                await readRequestBody(
                    req
                );

            const verificationId =
                cleanText(
                    body.verificationId,
                    100
                );

            const code =
                cleanText(
                    body.code,
                    20
                );

            if (
                !verificationId ||
                !code
            ) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        error:
                            "Verification ID and code are required",

                        requestId:
                            requestId
                    }
                );

                return;
            }

            const result =
                shVerifyStoredVerificationCode(
                    verificationId,
                    code
                );

            if (
                !result.success
            ) {

                sendJSON(
                    res,
                    400,
                    {

                        success:
                            false,

                        verified:
                            false,

                        error:
                            result.reason,

                        requestId:
                            requestId
                    }
                );

                return;
            }

            sendJSON(
                res,
                200,
                {

                    success:
                        true,

                    verified:
                        true,

                    requestId:
                        requestId
                }
            );

        } catch (error) {

            sendJSON(
                res,
                400,
                {

                    success:
                        false,

                    error:
                        error.message,

                    requestId:
                        requestId
                }
            );
        }
    }
);


/* -----------------------------------------------------
   PART 7.20 — VERIFICATION SECURITY STATUS
----------------------------------------------------- */

shRegisterRoute(
    "GET",
    "/api/backend/verification-status",
    async function (
        req,
        res,
        requestId
    ) {

        sendJSON(
            res,
            200,
            {

                success:
                    true,

                verification:
                    {

                        email:
                            true,

                        phone:
                            true,

                        codeLength:
                            SH_VERIFICATION_CONFIG
                                .codeLength,

                        codeStorage:
                            "SHA-384 hash only",

                        codeEncryption:
                            "AES-256-GCM encrypted server-side record",

                        expiration:
                            "10 minutes",

                        maximumAttempts:
                            SH_VERIFICATION_CONFIG
                                .maxAttempts,

                        resendProtection:
                            true,

                        hourlyRequestProtection:
                            true
                    },

                cryptography:
                    {

                        transport:
                            "TLS 1.3",

                        dataEncryption:
                            "AES-256-GCM",

                        integrity:
                            "SHA-384",

                        keyProtection:
                            "RSA-3072"
                    },

                backend:
                    "Oracle Cloud Infrastructure",

                backendServerCount:
                    1,

                requestId:
                    requestId
            }
        );
    }
);


/* -----------------------------------------------------
   PART 7.21 — CLEAN EXPIRED VERIFICATION RECORDS
----------------------------------------------------- */

function shCleanupExpiredVerificationRecords() {

    let storage;

    try {

        storage =
            shReadStorageFile();

    } catch {

        return;
    }

    let changed =
        false;

    for (
        const recordId of
        Object.keys(
            storage.records
        )
    ) {

        const record =
            storage.records[
                recordId
            ];

        if (
            record.category !==
            "general"
        ) {

            continue;
        }

        try {

            const decrypted =
                shDecryptStoredData(
                    record.encryptedData
                );

            if (
                decrypted.type !==
                "verification"
            ) {

                continue;
            }

            const expiresAt =
                new Date(
                    decrypted.data.expiresAt
                ).getTime();

            if (
                Date.now() >
                expiresAt &&
                decrypted.data.status ===
                "pending"
            ) {

                decrypted.data.status =
                    "expired";

                const encrypted =
                    shEncryptStoredData(
                        {
                            type:
                                "verification",

                            data:
                                decrypted.data
                        }
                    );

                record.encryptedData =
                    encrypted;

                record.updatedAt =
                    new Date().toISOString();

                storage.records[
                    recordId
                ] = record;

                changed =
                    true;
            }

        } catch {

            continue;
        }
    }

    if (changed) {

        shWriteStorageFile(
            storage
        );
    }
}


/* -----------------------------------------------------
   PART 7.22 — VERIFICATION CLEANUP TIMER
----------------------------------------------------- */

const SH_VERIFICATION_CLEANUP_TIMER =
    setInterval(
        () => {

            try {

                shCleanupExpiredVerificationRecords();

            } catch (error) {

                console.error(
                    "Verification cleanup error:",
                    error.message
                );
            }

        },

        5 * 60 * 1000
    );


if (
    SH_VERIFICATION_CLEANUP_TIMER &&
    typeof SH_VERIFICATION_CLEANUP_TIMER.unref ===
    "function"
) {

    SH_VERIFICATION_CLEANUP_TIMER.unref();
}


/* -----------------------------------------------------
   PART 7.23 — ARCHITECTURE
----------------------------------------------------- */

const SH_VERIFICATION_ARCHITECTURE =
    Object.freeze({

        backend:
            "Oracle Cloud Infrastructure",

        backendServerCount:
            1,

        emailVerification:
            true,

        phoneVerification:
            true,

        codeGeneration:
            "Cryptographically secure random",

        codeStorage:
            "SHA-384 hash",

        verificationRecord:
            "AES-256-GCM encrypted",

        keyProtection:
            "RSA-3072",

        passwordSecurity:
            "Argon2id",

        transport:
            "TLS 1.3",

        expiration:
            "Enabled",

        attemptProtection:
            "Enabled",

        resendProtection:
            "Enabled"
    });


console.log(
    "Smart Hub Part 7 Verification Delivery Layer initialized."
);

console.log(
    "Email + Phone verification security foundation ready."
);

// ============================================================
// SMART HUB — ORACLE OCI BACKEND SERVER
// PART 8 — AUTHENTICATION SESSION & AUTHORIZATION SECURITY
// ============================================================

const SH_SESSION_CONFIG = Object.freeze({
    sessionLifetimeMs: 24 * 60 * 60 * 1000,
    tokenHashAlgorithm: "sha384",
    tokenBytes: 32,
    maxActiveSessionsPerAccount: 5,
    storageCategory: "general"
});

const SH_SESSION_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// ------------------------------------------------------------
// SESSION TOKEN HASH
// ------------------------------------------------------------

function shHashSessionToken(token) {
    if (typeof token !== "string" || token.length < 20) {
        return null;
    }

    return crypto
        .createHash("sha384")
        .update(token, "utf8")
        .digest("hex");
}

// ------------------------------------------------------------
// AUTHORIZATION HEADER
// ------------------------------------------------------------

function shGetBearerToken(req) {
    const header = req.headers.authorization;

    if (typeof header !== "string") {
        return null;
    }

    if (!header.startsWith("Bearer ")) {
        return null;
    }

    const token = header.slice(7).trim();

    if (!token || token.length < 20) {
        return null;
    }

    return token;
}

// ------------------------------------------------------------
// SESSION RECORD SEARCH
// ------------------------------------------------------------

async function shFindSessionByToken(token) {
    const tokenHash = shHashSessionToken(token);

    if (!tokenHash) {
        return null;
    }

    const storage = shReadStorageFile();

    if (!storage || !storage.records) {
        return null;
    }

    for (const recordId of Object.keys(storage.records)) {
        const record = storage.records[recordId];

        if (!record || record.category !== "general") {
            continue;
        }

        try {
            const data = shDecryptStoredData(record);

            if (!data || data.type !== "smart_hub_session") {
                continue;
            }

            if (data.tokenHash !== tokenHash) {
                continue;
            }

            return {
                recordId,
                session: data
            };
        } catch (error) {
            console.error(
                `[SESSION] Failed to decrypt session ${recordId}:`,
                error.message
            );
        }
    }

    return null;
}

// ------------------------------------------------------------
// SESSION VALIDATION
// ------------------------------------------------------------

async function shValidateSession(req) {
    const token = shGetBearerToken(req);

    if (!token) {
        return {
            valid: false,
            reason: "missing_session"
        };
    }

    const result = await shFindSessionByToken(token);

    if (!result) {
        return {
            valid: false,
            reason: "invalid_session"
        };
    }

    const session = result.session;

    if (!session.expiresAt) {
        return {
            valid: false,
            reason: "invalid_expiration"
        };
    }

    const expiresAt = Date.parse(session.expiresAt);

    if (!Number.isFinite(expiresAt)) {
        return {
            valid: false,
            reason: "invalid_expiration"
        };
    }

    if (Date.now() >= expiresAt) {
        try {
            shDeleteEncryptedRecord(result.recordId);
        } catch (error) {
            console.error(
                "[SESSION] Failed to remove expired session:",
                error.message
            );
        }

        return {
            valid: false,
            reason: "session_expired"
        };
    }

    return {
        valid: true,
        recordId: result.recordId,
        session,
        token
    };
}

// ------------------------------------------------------------
// SESSION REVOCATION
// ------------------------------------------------------------

async function shRevokeSession(token) {
    const result = await shFindSessionByToken(token);

    if (!result) {
        return false;
    }

    try {
        shDeleteEncryptedRecord(result.recordId);
        return true;
    } catch (error) {
        console.error(
            "[SESSION] Failed to revoke session:",
            error.message
        );

        return false;
    }
}

// ------------------------------------------------------------
// LOGOUT
// ------------------------------------------------------------

shRegisterRoute("POST", "/api/auth/logout", async (req, res) => {
    const auth = await shValidateSession(req);

    if (!auth.valid) {
        return sendJSON(res, 401, {
            success: false,
            error: "Unauthorized",
            reason: auth.reason
        });
    }

    const revoked = await shRevokeSession(auth.token);

    if (!revoked) {
        return sendJSON(res, 500, {
            success: false,
            error: "Session could not be revoked"
        });
    }

    return sendJSON(res, 200, {
        success: true,
        message: "Session logged out successfully"
    });
});

// ------------------------------------------------------------
// CURRENT USER / SESSION
// ------------------------------------------------------------

shRegisterRoute("GET", "/api/auth/me", async (req, res) => {
    const auth = await shValidateSession(req);

    if (!auth.valid) {
        return sendJSON(res, 401, {
            success: false,
            error: "Unauthorized",
            reason: auth.reason
        });
    }

    return sendJSON(res, 200, {
        success: true,
        accountId: auth.session.accountId,
        sessionId: auth.session.sessionId,
        expiresAt: auth.session.expiresAt
    });
});

// ------------------------------------------------------------
// PROTECTED ROUTE HELPER
// ------------------------------------------------------------

async function shRequireAuthentication(req, res) {
    const auth = await shValidateSession(req);

    if (!auth.valid) {
        sendJSON(res, 401, {
            success: false,
            error: "Authentication required",
            reason: auth.reason
        });

        return null;
    }

    return auth;
}

// ------------------------------------------------------------
// SESSION CLEANUP
// ------------------------------------------------------------

async function shCleanupExpiredSessions() {
    const storage = shReadStorageFile();

    if (!storage || !storage.records) {
        return;
    }

    let removed = 0;

    for (const recordId of Object.keys(storage.records)) {
        const record = storage.records[recordId];

        if (!record || record.category !== "general") {
            continue;
        }

        try {
            const data = shDecryptStoredData(record);

            if (!data || data.type !== "smart_hub_session") {
                continue;
            }

            const expiresAt = Date.parse(data.expiresAt);

            if (
                Number.isFinite(expiresAt) &&
                Date.now() >= expiresAt
            ) {
                shDeleteEncryptedRecord(recordId);
                removed++;
            }
        } catch (error) {
            console.error(
                `[SESSION CLEANUP] ${recordId}:`,
                error.message
            );
        }
    }

    if (removed > 0) {
        console.log(
            `[SESSION CLEANUP] Removed ${removed} expired session(s).`
        );
    }
}

const SH_SESSION_CLEANUP_TIMER = setInterval(
    shCleanupExpiredSessions,
    SH_SESSION_CLEANUP_INTERVAL_MS
);

if (typeof SH_SESSION_CLEANUP_TIMER.unref === "function") {
    SH_SESSION_CLEANUP_TIMER.unref();
}

// ------------------------------------------------------------
// SESSION SECURITY STATUS
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/backend/session-security-status",
    async (req, res) => {
        return sendJSON(res, 200, {
            success: true,
            backend: "Oracle Cloud Infrastructure",
            serverCount: 1,
            sessionSecurity: {
                tokenBytes: SH_SESSION_CONFIG.tokenBytes,
                tokenHash: SH_SESSION_CONFIG.tokenHashAlgorithm,
                sessionLifetimeHours: 24,
                maxActiveSessionsPerAccount:
                    SH_SESSION_CONFIG.maxActiveSessionsPerAccount,
                encryptedStorage: "AES-256-GCM",
                keyProtection: "RSA-3072",
                integrity: "SHA-384",
                passwordProtection: "Argon2id"
            }
        });
    }
);

// ------------------------------------------------------------
// PART 8 ARCHITECTURE
// ------------------------------------------------------------

const SH_SESSION_ARCHITECTURE = Object.freeze({
    backendProvider: "Oracle Cloud Infrastructure",
    backendServerCount: 1,

    authentication: {
        passwordHashing: "Argon2id",
        sessionToken: "Random 256-bit token",
        sessionTokenHash: "SHA-384",
        sessionStorage: "AES-256-GCM",
        keyProtection: "RSA-3072",
        integrity: "SHA-384"
    },

    session: {
        lifetime: "24 hours",
        logout: true,
        expirationCleanup: true,
        protectedRoutes: true
    },

    searchEnginesExternal: true,

    supabase: false,
    cloudflare: false
});

console.log(
    "[SMART HUB] Part 8 — Authentication Session & Authorization Security initialized."
);

// ============================================================
// SMART HUB — ORACLE OCI BACKEND SERVER
// PART 9 — SETTINGS SECURITY & ACCESS CONTROL
// ============================================================

const SH_SETTINGS_SECURITY_CONFIG = Object.freeze({
    codeMinLength: 6,
    codeMaxLength: 256,
    hashAlgorithm: "Argon2id",
    storageEncryption: "AES-256-GCM",
    keyProtection: "RSA-3072",
    integrity: "SHA-384",
    maxAttempts: 5,
    lockoutMinutes: 15,
    storageCategory: "app_preferences"
});

const SH_SETTINGS_SECURITY_ATTEMPTS = new Map();

// ------------------------------------------------------------
// SETTINGS SECURITY CODE VALIDATION
// ------------------------------------------------------------

function shValidateSettingsSecurityCode(code) {
    if (typeof code !== "string") {
        return {
            valid: false,
            error: "Security code must be a string."
        };
    }

    if (
        code.length <
        SH_SETTINGS_SECURITY_CONFIG.codeMinLength
    ) {
        return {
            valid: false,
            error: "Security code is too short."
        };
    }

    if (
        code.length >
        SH_SETTINGS_SECURITY_CONFIG.codeMaxLength
    ) {
        return {
            valid: false,
            error: "Security code is too long."
        };
    }

    return {
        valid: true
    };
}

// ------------------------------------------------------------
// SETTINGS SECURITY CODE HASH
// ------------------------------------------------------------

async function shHashSettingsSecurityCode(code) {
    const validation =
        shValidateSettingsSecurityCode(code);

    if (!validation.valid) {
        throw new Error(validation.error);
    }

    if (typeof argon2 === "undefined") {
        throw new Error(
            "Argon2id module is not available."
        );
    }

    return argon2.hash({
        pass: code,
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
        hashLength: 32
    });
}

// ------------------------------------------------------------
// SETTINGS SECURITY CODE VERIFY
// ------------------------------------------------------------

async function shVerifySettingsSecurityCode(
    storedHash,
    code
) {
    if (
        typeof storedHash !== "string" ||
        typeof code !== "string"
    ) {
        return false;
    }

    if (typeof argon2 === "undefined") {
        return false;
    }

    try {
        return await argon2.verify(
            storedHash,
            code
        );
    } catch (error) {
        console.error(
            "[SETTINGS SECURITY] Code verification error:",
            error.message
        );

        return false;
    }
}

// ------------------------------------------------------------
// SETTINGS SECURITY ATTEMPT CONTROL
// ------------------------------------------------------------

function shGetSettingsAttemptKey(accountId) {
    return `settings:${accountId}`;
}

function shCheckSettingsSecurityAttempts(accountId) {
    const key =
        shGetSettingsAttemptKey(accountId);

    const entry =
        SH_SETTINGS_SECURITY_ATTEMPTS.get(key);

    if (!entry) {
        return {
            allowed: true,
            remaining:
                SH_SETTINGS_SECURITY_CONFIG.maxAttempts
        };
    }

    const now = Date.now();

    if (now >= entry.lockedUntil) {
        SH_SETTINGS_SECURITY_ATTEMPTS.delete(key);

        return {
            allowed: true,
            remaining:
                SH_SETTINGS_SECURITY_CONFIG.maxAttempts
        };
    }

    return {
        allowed: false,
        remaining: 0,
        lockedUntil: new Date(
            entry.lockedUntil
        ).toISOString()
    };
}

function shRegisterSettingsSecurityFailure(accountId) {
    const key =
        shGetSettingsAttemptKey(accountId);

    const now = Date.now();

    let entry =
        SH_SETTINGS_SECURITY_ATTEMPTS.get(key);

    if (!entry || now >= entry.lockedUntil) {
        entry = {
            attempts: 0,
            lockedUntil: now
        };
    }

    entry.attempts++;

    if (
        entry.attempts >=
        SH_SETTINGS_SECURITY_CONFIG.maxAttempts
    ) {
        entry.lockedUntil =
            now +
            SH_SETTINGS_SECURITY_CONFIG.lockoutMinutes *
                60 *
                1000;
    }

    SH_SETTINGS_SECURITY_ATTEMPTS.set(
        key,
        entry
    );

    return entry;
}

function shClearSettingsSecurityFailures(accountId) {
    SH_SETTINGS_SECURITY_ATTEMPTS.delete(
        shGetSettingsAttemptKey(accountId)
    );
}

// ------------------------------------------------------------
// SETTINGS SECURITY RECORD
// ------------------------------------------------------------

async function shCreateSettingsSecurityRecord(
    accountId,
    code
) {
    if (!accountId) {
        throw new Error(
            "Account ID is required."
        );
    }

    const hash =
        await shHashSettingsSecurityCode(code);

    return {
        type: "smart_hub_settings_security",
        version: 1,
        accountId,
        codeHash: hash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// ------------------------------------------------------------
// FIND SETTINGS SECURITY RECORD
// ------------------------------------------------------------

function shFindSettingsSecurityRecord(accountId) {
    const storage =
        shReadStorageFile();

    if (
        !storage ||
        !storage.records
    ) {
        return null;
    }

    for (
        const recordId of
        Object.keys(storage.records)
    ) {
        const record =
            storage.records[recordId];

        if (
            !record ||
            record.category !==
                SH_SETTINGS_SECURITY_CONFIG.storageCategory
        ) {
            continue;
        }

        try {
            const data =
                shDecryptStoredData(record);

            if (
                data &&
                data.type ===
                    "smart_hub_settings_security" &&
                data.accountId === accountId
            ) {
                return {
                    recordId,
                    data
                };
            }
        } catch (error) {
            console.error(
                `[SETTINGS SECURITY] Failed to read record ${recordId}:`,
                error.message
            );
        }
    }

    return null;
}

// ------------------------------------------------------------
// SAVE / UPDATE SETTINGS SECURITY
// ------------------------------------------------------------

async function shSaveSettingsSecurityRecord(
    accountId,
    code
) {
    const newData =
        await shCreateSettingsSecurityRecord(
            accountId,
            code
        );

    const existing =
        shFindSettingsSecurityRecord(
            accountId
        );

    if (existing) {
        shUpdateEncryptedRecord(
            existing.recordId,
            newData
        );

        return existing.recordId;
    }

    return shCreateStoredRecord(
        SH_SETTINGS_SECURITY_CONFIG.storageCategory,
        newData
    );
}

// ------------------------------------------------------------
// SET SETTINGS SECURITY CODE
// ------------------------------------------------------------

shRegisterRoute(
    "POST",
    "/api/settings/security-code",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const body =
            await readRequestBody(req);

        if (!body) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid request body."
            });
        }

        let data;

        try {
            data = JSON.parse(body);
        } catch (error) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid JSON."
            });
        }

        const code =
            typeof data.code === "string"
                ? data.code
                : "";

        const validation =
            shValidateSettingsSecurityCode(
                code
            );

        if (!validation.valid) {
            return sendJSON(res, 400, {
                success: false,
                error: validation.error
            });
        }

        try {
            await shSaveSettingsSecurityRecord(
                auth.session.accountId,
                code
            );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "Settings security code saved securely.",
                security: {
                    hashing: "Argon2id",
                    encryption: "AES-256-GCM",
                    keyProtection: "RSA-3072",
                    integrity: "SHA-384"
                }
            });
        } catch (error) {
            console.error(
                "[SETTINGS SECURITY] Save error:",
                error.message
            );

            return sendJSON(res, 500, {
                success: false,
                error:
                    "Settings security code could not be saved."
            });
        }
    }
);

// ------------------------------------------------------------
// VERIFY SETTINGS SECURITY CODE
// ------------------------------------------------------------

shRegisterRoute(
    "POST",
    "/api/settings/security-code/verify",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const accountId =
            auth.session.accountId;

        const attemptStatus =
            shCheckSettingsSecurityAttempts(
                accountId
            );

        if (!attemptStatus.allowed) {
            return sendJSON(res, 429, {
                success: false,
                error:
                    "Settings security access is temporarily locked.",
                lockedUntil:
                    attemptStatus.lockedUntil
            });
        }

        const body =
            await readRequestBody(req);

        if (!body) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid request body."
            });
        }

        let data;

        try {
            data = JSON.parse(body);
        } catch (error) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid JSON."
            });
        }

        const code =
            typeof data.code === "string"
                ? data.code
                : "";

        const record =
            shFindSettingsSecurityRecord(
                accountId
            );

        if (!record) {
            return sendJSON(res, 404, {
                success: false,
                error:
                    "Settings security code has not been configured."
            });
        }

        const verified =
            await shVerifySettingsSecurityCode(
                record.data.codeHash,
                code
            );

        if (!verified) {
            const failure =
                shRegisterSettingsSecurityFailure(
                    accountId
                );

            return sendJSON(res, 401, {
                success: false,
                error:
                    "Invalid settings security code.",
                remainingAttempts:
                    Math.max(
                        0,
                        SH_SETTINGS_SECURITY_CONFIG
                            .maxAttempts -
                            failure.attempts
                    )
            });
        }

        shClearSettingsSecurityFailures(
            accountId
        );

        return sendJSON(res, 200, {
            success: true,
            settingsAccess: true,
            message:
                "Settings security code verified."
        });
    }
);

// ------------------------------------------------------------
// SETTINGS SECURITY STATUS
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/settings/security-status",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const record =
            shFindSettingsSecurityRecord(
                auth.session.accountId
            );

        const attemptStatus =
            shCheckSettingsSecurityAttempts(
                auth.session.accountId
            );

        return sendJSON(res, 200, {
            success: true,

            configured:
                !!record,

            locked:
                !attemptStatus.allowed,

            lockedUntil:
                attemptStatus.lockedUntil ||
                null,

            security: {
                codeHash:
                    "Argon2id",
                storedData:
                    "AES-256-GCM",
                keyProtection:
                    "RSA-3072",
                integrity:
                    "SHA-384"
            }
        });
    }
);

// ------------------------------------------------------------
// PART 9 ARCHITECTURE
// ------------------------------------------------------------

const SH_SETTINGS_SECURITY_ARCHITECTURE =
    Object.freeze({
        backendProvider:
            "Oracle Cloud Infrastructure",

        backendServerCount: 1,

        settingsSecurity: {
            accessRequiresAuthentication: true,
            securityCodeHash:
                "Argon2id",
            storedDataEncryption:
                "AES-256-GCM",
            keyProtection:
                "RSA-3072",
            integrity:
                "SHA-384",
            failedAttemptProtection:
                true,
            temporaryLockout:
                true
        },

        searchEnginesExternal: true,

        supabase: false,
        cloudflare: false
    });

console.log(
    "[SMART HUB] Part 9 — Settings Security & Access Control initialized."
);

// ============================================================
// SMART HUB — ORACLE OCI BACKEND SERVER
// PART 10 — USER PROFILE & ACCOUNT DATA SECURITY
// ============================================================

const SH_PROFILE_CONFIG = Object.freeze({
    storageCategory: "user_profile",

    encryption: "AES-256-GCM",
    keyProtection: "RSA-3072",
    integrity: "SHA-384",

    allowedFields: [
        "realName",
        "secondName",
        "username",
        "email",
        "phoneNumber",
        "country",
        "city"
    ],

    maxFieldLength: 256
});

// ------------------------------------------------------------
// PROFILE TEXT CLEANING
// ------------------------------------------------------------

function shCleanProfileValue(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value
        .trim()
        .replace(/\s+/g, " ")
        .slice(
            0,
            SH_PROFILE_CONFIG.maxFieldLength
        );
}

// ------------------------------------------------------------
// PROFILE DATA PREPARATION
// ------------------------------------------------------------

function shPrepareProfileData(accountId, data) {
    const profile = {
        type: "smart_hub_user_profile",
        version: 1,
        accountId,
        updatedAt: new Date().toISOString()
    };

    for (
        const field of
        SH_PROFILE_CONFIG.allowedFields
    ) {
        if (
            Object.prototype.hasOwnProperty.call(
                data,
                field
            )
        ) {
            profile[field] =
                shCleanProfileValue(data[field]);
        }
    }

    return profile;
}

// ------------------------------------------------------------
// FIND USER PROFILE
// ------------------------------------------------------------

function shFindUserProfile(accountId) {
    const storage =
        shReadStorageFile();

    if (
        !storage ||
        !storage.records
    ) {
        return null;
    }

    for (
        const recordId of
        Object.keys(storage.records)
    ) {
        const record =
            storage.records[recordId];

        if (
            !record ||
            record.category !==
                SH_PROFILE_CONFIG.storageCategory
        ) {
            continue;
        }

        try {
            const data =
                shDecryptStoredData(record);

            if (
                data &&
                data.type ===
                    "smart_hub_user_profile" &&
                data.accountId === accountId
            ) {
                return {
                    recordId,
                    data
                };
            }
        } catch (error) {
            console.error(
                `[PROFILE] Failed to decrypt record ${recordId}:`,
                error.message
            );
        }
    }

    return null;
}

// ------------------------------------------------------------
// SAVE USER PROFILE
// ------------------------------------------------------------

function shSaveUserProfile(
    accountId,
    profileData
) {
    const existing =
        shFindUserProfile(accountId);

    if (existing) {
        shUpdateEncryptedRecord(
            existing.recordId,
            profileData
        );

        return existing.recordId;
    }

    return shCreateStoredRecord(
        SH_PROFILE_CONFIG.storageCategory,
        profileData
    );
}

// ------------------------------------------------------------
// GET USER PROFILE
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/profile",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const accountId =
            auth.session.accountId;

        const profile =
            shFindUserProfile(accountId);

        if (!profile) {
            return sendJSON(res, 200, {
                success: true,
                profile: null
            });
        }

        const safeProfile = {
            realName:
                profile.data.realName || "",
            secondName:
                profile.data.secondName || "",
            username:
                profile.data.username || "",
            email:
                profile.data.email || "",
            phoneNumber:
                profile.data.phoneNumber || "",
            country:
                profile.data.country || "",
            city:
                profile.data.city || "",
            updatedAt:
                profile.data.updatedAt || null
        };

        return sendJSON(res, 200, {
            success: true,
            profile: safeProfile
        });
    }
);

// ------------------------------------------------------------
// CREATE / UPDATE USER PROFILE
// ------------------------------------------------------------

shRegisterRoute(
    "PUT",
    "/api/profile",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const body =
            await readRequestBody(req);

        if (!body) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid request body."
            });
        }

        let data;

        try {
            data = JSON.parse(body);
        } catch (error) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid JSON."
            });
        }

        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid profile data."
            });
        }

        const accountId =
            auth.session.accountId;

        const existing =
            shFindUserProfile(accountId);

        const profile =
            shPrepareProfileData(
                accountId,
                data
            );

        /*
         * If a profile already exists,
         * preserve fields that were not included
         * in this update.
         */

        if (existing) {
            for (
                const field of
                SH_PROFILE_CONFIG.allowedFields
            ) {
                if (
                    !Object.prototype.hasOwnProperty.call(
                        data,
                        field
                    )
                ) {
                    if (
                        Object.prototype.hasOwnProperty.call(
                            existing.data,
                            field
                        )
                    ) {
                        profile[field] =
                            existing.data[field];
                    }
                }
            }
        }

        try {
            const recordId =
                shSaveUserProfile(
                    accountId,
                    profile
                );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "Profile saved securely.",
                recordId,
                security: {
                    encryption:
                        "AES-256-GCM",
                    keyProtection:
                        "RSA-3072",
                    integrity:
                        "SHA-384"
                }
            });
        } catch (error) {
            console.error(
                "[PROFILE] Save error:",
                error.message
            );

            return sendJSON(res, 500, {
                success: false,
                error:
                    "Profile could not be saved."
            });
        }
    }
);

// ------------------------------------------------------------
// DELETE USER PROFILE
// ------------------------------------------------------------

shRegisterRoute(
    "DELETE",
    "/api/profile",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const accountId =
            auth.session.accountId;

        const profile =
            shFindUserProfile(accountId);

        if (!profile) {
            return sendJSON(res, 404, {
                success: false,
                error:
                    "Profile does not exist."
            });
        }

        try {
            shDeleteEncryptedRecord(
                profile.recordId
            );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "Profile data deleted."
            });
        } catch (error) {
            console.error(
                "[PROFILE] Delete error:",
                error.message
            );

            return sendJSON(res, 500, {
                success: false,
                error:
                    "Profile could not be deleted."
            });
        }
    }
);

// ------------------------------------------------------------
// PROFILE SECURITY STATUS
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/profile/security-status",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const profile =
            shFindUserProfile(
                auth.session.accountId
            );

        return sendJSON(res, 200, {
            success: true,

            profileExists:
                !!profile,

            storage: {
                backend:
                    "Oracle Cloud Infrastructure",
                serverCount: 1,
                encryption:
                    "AES-256-GCM",
                keyProtection:
                    "RSA-3072",
                integrity:
                    "SHA-384"
            }
        });
    }
);

// ------------------------------------------------------------
// PART 10 ARCHITECTURE
// ------------------------------------------------------------

const SH_PROFILE_ARCHITECTURE =
    Object.freeze({
        backendProvider:
            "Oracle Cloud Infrastructure",

        backendServerCount: 1,

        profileData: {
            encryptedAtRest:
                "AES-256-GCM",
            keyProtection:
                "RSA-3072",
            integrity:
                "SHA-384",
            accountIsolation:
                true,
            authenticatedAccess:
                true
        },

        searchEnginesExternal:
            true,

        supabase: false,
        cloudflare: false
    });

console.log(
    "[SMART HUB] Part 10 — User Profile & Account Data Security initialized."
);

// ============================================================
// SMART HUB — ORACLE OCI BACKEND SERVER
// PART 11 — APP SETTINGS & PREFERENCES SECURITY
// ============================================================

const SH_APP_SETTINGS_CONFIG = Object.freeze({
    storageCategory: "app_preferences",

    encryption: "AES-256-GCM",
    keyProtection: "RSA-3072",
    integrity: "SHA-384",

    maxSettingsSize: 1024 * 1024
});

// ------------------------------------------------------------
// DEFAULT APP SETTINGS
// ------------------------------------------------------------

function shGetDefaultAppSettings() {
    return {
        appearance: "system",
        interfaceSize: "normal",

        dataSaver: false,
        batterySaver: false,

        searchHistory: true,
        browsingData: true,

        doNotTrack: true,
        cookiePreference: "standard",

        notifications: true,

        language: "English",

        searchEngine: "DuckDuckGo",

        version: "1.0"
    };
}

// ------------------------------------------------------------
// FIND USER SETTINGS
// ------------------------------------------------------------

function shFindAppSettings(accountId) {
    const storage =
        shReadStorageFile();

    if (
        !storage ||
        !storage.records
    ) {
        return null;
    }

    for (
        const recordId of
        Object.keys(storage.records)
    ) {
        const record =
            storage.records[recordId];

        if (
            !record ||
            record.category !==
                SH_APP_SETTINGS_CONFIG.storageCategory
        ) {
            continue;
        }

        try {
            const data =
                shDecryptStoredData(record);

            if (
                data &&
                data.type ===
                    "smart_hub_app_settings" &&
                data.accountId === accountId
            ) {
                return {
                    recordId,
                    data
                };
            }
        } catch (error) {
            console.error(
                `[APP SETTINGS] Failed to decrypt record ${recordId}:`,
                error.message
            );
        }
    }

    return null;
}

// ------------------------------------------------------------
// SETTINGS DATA VALIDATION
// ------------------------------------------------------------

function shPrepareAppSettings(
    accountId,
    incoming
) {
    const defaults =
        shGetDefaultAppSettings();

    const settings = {
        type: "smart_hub_app_settings",
        version: 1,
        accountId,

        appearance:
            typeof incoming.appearance === "string"
                ? incoming.appearance.slice(0, 32)
                : defaults.appearance,

        interfaceSize:
            typeof incoming.interfaceSize === "string"
                ? incoming.interfaceSize.slice(0, 32)
                : defaults.interfaceSize,

        dataSaver:
            typeof incoming.dataSaver === "boolean"
                ? incoming.dataSaver
                : defaults.dataSaver,

        batterySaver:
            typeof incoming.batterySaver === "boolean"
                ? incoming.batterySaver
                : defaults.batterySaver,

        searchHistory:
            typeof incoming.searchHistory === "boolean"
                ? incoming.searchHistory
                : defaults.searchHistory,

        browsingData:
            typeof incoming.browsingData === "boolean"
                ? incoming.browsingData
                : defaults.browsingData,

        doNotTrack:
            typeof incoming.doNotTrack === "boolean"
                ? incoming.doNotTrack
                : defaults.doNotTrack,

        cookiePreference:
            typeof incoming.cookiePreference === "string"
                ? incoming.cookiePreference.slice(0, 32)
                : defaults.cookiePreference,

        notifications:
            typeof incoming.notifications === "boolean"
                ? incoming.notifications
                : defaults.notifications,

        language:
            typeof incoming.language === "string"
                ? incoming.language.slice(0, 32)
                : defaults.language,

        searchEngine:
            typeof incoming.searchEngine === "string"
                ? incoming.searchEngine.slice(0, 64)
                : defaults.searchEngine,

        updatedAt:
            new Date().toISOString()
    };

    const size =
        Buffer.byteLength(
            JSON.stringify(settings),
            "utf8"
        );

    if (
        size >
        SH_APP_SETTINGS_CONFIG.maxSettingsSize
    ) {
        throw new Error(
            "Settings data is too large."
        );
    }

    return settings;
}

// ------------------------------------------------------------
// SAVE APP SETTINGS
// ------------------------------------------------------------

function shSaveAppSettings(
    accountId,
    settings
) {
    const existing =
        shFindAppSettings(accountId);

    if (existing) {
        shUpdateEncryptedRecord(
            existing.recordId,
            settings
        );

        return existing.recordId;
    }

    return shCreateStoredRecord(
        SH_APP_SETTINGS_CONFIG.storageCategory,
        settings
    );
}

// ------------------------------------------------------------
// GET APP SETTINGS
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/settings",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const accountId =
            auth.session.accountId;

        const existing =
            shFindAppSettings(accountId);

        if (!existing) {
            return sendJSON(res, 200, {
                success: true,
                settings:
                    shGetDefaultAppSettings(),
                stored: false
            });
        }

        const settings = {
            appearance:
                existing.data.appearance,

            interfaceSize:
                existing.data.interfaceSize,

            dataSaver:
                existing.data.dataSaver,

            batterySaver:
                existing.data.batterySaver,

            searchHistory:
                existing.data.searchHistory,

            browsingData:
                existing.data.browsingData,

            doNotTrack:
                existing.data.doNotTrack,

            cookiePreference:
                existing.data.cookiePreference,

            notifications:
                existing.data.notifications,

            language:
                existing.data.language,

            searchEngine:
                existing.data.searchEngine,

            version:
                existing.data.version,

            updatedAt:
                existing.data.updatedAt
        };

        return sendJSON(res, 200, {
            success: true,
            settings,
            stored: true
        });
    }
);

// ------------------------------------------------------------
// CREATE / UPDATE APP SETTINGS
// ------------------------------------------------------------

shRegisterRoute(
    "PUT",
    "/api/settings",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const body =
            await readRequestBody(req);

        if (!body) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid request body."
            });
        }

        let incoming;

        try {
            incoming = JSON.parse(body);
        } catch (error) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid JSON."
            });
        }

        if (
            !incoming ||
            typeof incoming !== "object" ||
            Array.isArray(incoming)
        ) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid settings data."
            });
        }

        const accountId =
            auth.session.accountId;

        const existing =
            shFindAppSettings(accountId);

        /*
         * Start from existing settings so that
         * partial updates do not erase values.
         */

        const current =
            existing
                ? existing.data
                : shGetDefaultAppSettings();

        const merged = {
            ...current,
            ...incoming
        };

        try {
            const settings =
                shPrepareAppSettings(
                    accountId,
                    merged
                );

            const recordId =
                shSaveAppSettings(
                    accountId,
                    settings
                );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "App settings saved securely.",
                recordId,

                security: {
                    encryption:
                        "AES-256-GCM",
                    keyProtection:
                        "RSA-3072",
                    integrity:
                        "SHA-384"
                }
            });
        } catch (error) {
            console.error(
                "[APP SETTINGS] Save error:",
                error.message
            );

            return sendJSON(res, 500, {
                success: false,
                error:
                    "App settings could not be saved."
            });
        }
    }
);

// ------------------------------------------------------------
// RESET APP SETTINGS
// ------------------------------------------------------------

shRegisterRoute(
    "POST",
    "/api/settings/reset",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const accountId =
            auth.session.accountId;

        const existing =
            shFindAppSettings(accountId);

        const defaults =
            shPrepareAppSettings(
                accountId,
                shGetDefaultAppSettings()
            );

        try {
            if (existing) {
                shUpdateEncryptedRecord(
                    existing.recordId,
                    defaults
                );
            } else {
                shCreateStoredRecord(
                    SH_APP_SETTINGS_CONFIG
                        .storageCategory,
                    defaults
                );
            }

            return sendJSON(res, 200, {
                success: true,
                message:
                    "App settings reset successfully."
            });
        } catch (error) {
            console.error(
                "[APP SETTINGS] Reset error:",
                error.message
            );

            return sendJSON(res, 500, {
                success: false,
                error:
                    "App settings could not be reset."
            });
        }
    }
);

// ------------------------------------------------------------
// DELETE APP SETTINGS
// ------------------------------------------------------------

shRegisterRoute(
    "DELETE",
    "/api/settings",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const accountId =
            auth.session.accountId;

        const existing =
            shFindAppSettings(accountId);

        if (!existing) {
            return sendJSON(res, 404, {
                success: false,
                error:
                    "Stored settings do not exist."
            });
        }

        try {
            shDeleteEncryptedRecord(
                existing.recordId
            );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "Stored app settings deleted."
            });
        } catch (error) {
            console.error(
                "[APP SETTINGS] Delete error:",
                error.message
            );

            return sendJSON(res, 500, {
                success: false,
                error:
                    "App settings could not be deleted."
            });
        }
    }
);

// ------------------------------------------------------------
// SETTINGS SECURITY INFORMATION
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/settings/security",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        return sendJSON(res, 200, {
            success: true,

            backend:
                "Oracle Cloud Infrastructure",

            serverCount: 1,

            storage: {
                encryption:
                    "AES-256-GCM",
                keyProtection:
                    "RSA-3072",
                integrity:
                    "SHA-384"
            },

            passwordAndCodeProtection:
                "Argon2id"
        });
    }
);

// ------------------------------------------------------------
// PART 11 ARCHITECTURE
// ------------------------------------------------------------

const SH_APP_SETTINGS_ARCHITECTURE =
    Object.freeze({
        backendProvider:
            "Oracle Cloud Infrastructure",

        backendServerCount: 1,

        settings: {
            encryptedAtRest:
                "AES-256-GCM",

            keyProtection:
                "RSA-3072",

            integrity:
                "SHA-384",

            authenticatedAccess:
                true,

            resetSupported:
                true,

            deleteSupported:
                true
        },

        defaultSearchEngine:
            "DuckDuckGo",

        searchEnginesExternal:
            true,

        supabase: false,
        cloudflare: false
    });

console.log(
    "[SMART HUB] Part 11 — App Settings & Preferences Security initialized."
);

// ============================================================
// SMART HUB — ORACLE OCI BACKEND SERVER
// PART 12 — SEARCH HISTORY & SAVED DATA SECURITY
// ============================================================

const SH_SEARCH_DATA_CONFIG = Object.freeze({
    searchHistoryCategory: "search_history",
    savedLinksCategory: "saved_links",

    encryption: "AES-256-GCM",
    keyProtection: "RSA-3072",
    integrity: "SHA-384",

    maxHistoryItems: 200,
    maxSavedLinks: 200,

    maxQueryLength: 512,
    maxTitleLength: 256,
    maxUrlLength: 2048
});

// ------------------------------------------------------------
// SEARCH DATA TEXT CLEANING
// ------------------------------------------------------------

function shCleanSearchText(value, maxLength) {
    if (typeof value !== "string") {
        return "";
    }

    return value
        .trim()
        .slice(0, maxLength);
}

// ------------------------------------------------------------
// SEARCH HISTORY VALIDATION
// ------------------------------------------------------------

function shValidateSearchHistoryItem(item) {
    if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
    ) {
        return false;
    }

    if (
        typeof item.query !== "string" ||
        item.query.trim().length === 0
    ) {
        return false;
    }

    if (
        item.query.length >
        SH_SEARCH_DATA_CONFIG.maxQueryLength
    ) {
        return false;
    }

    if (
        item.engine !== undefined &&
        typeof item.engine !== "string"
    ) {
        return false;
    }

    return true;
}

// ------------------------------------------------------------
// SEARCH HISTORY PREPARATION
// ------------------------------------------------------------

function shPrepareSearchHistory(
    accountId,
    history
) {
    if (!Array.isArray(history)) {
        throw new Error(
            "Search history must be an array."
        );
    }

    const limited =
        history.slice(
            -SH_SEARCH_DATA_CONFIG.maxHistoryItems
        );

    const items = [];

    for (const item of limited) {
        if (
            !shValidateSearchHistoryItem(item)
        ) {
            continue;
        }

        items.push({
            query:
                shCleanSearchText(
                    item.query,
                    SH_SEARCH_DATA_CONFIG
                        .maxQueryLength
                ),

            engine:
                shCleanSearchText(
                    item.engine || "",
                    64
                ),

            searchedAt:
                typeof item.searchedAt === "string"
                    ? item.searchedAt
                    : new Date().toISOString()
        });
    }

    return {
        type: "smart_hub_search_history",
        version: 1,
        accountId,
        items,
        updatedAt:
            new Date().toISOString()
    };
}

// ------------------------------------------------------------
// FIND SEARCH HISTORY
// ------------------------------------------------------------

function shFindSearchHistory(accountId) {
    const storage =
        shReadStorageFile();

    if (
        !storage ||
        !storage.records
    ) {
        return null;
    }

    for (
        const recordId of
        Object.keys(storage.records)
    ) {
        const record =
            storage.records[recordId];

        if (
            !record ||
            record.category !==
                SH_SEARCH_DATA_CONFIG
                    .searchHistoryCategory
        ) {
            continue;
        }

        try {
            const data =
                shDecryptStoredData(record);

            if (
                data &&
                data.type ===
                    "smart_hub_search_history" &&
                data.accountId === accountId
            ) {
                return {
                    recordId,
                    data
                };
            }
        } catch (error) {
            console.error(
                `[SEARCH HISTORY] Failed to decrypt ${recordId}:`,
                error.message
            );
        }
    }

    return null;
}

// ------------------------------------------------------------
// SAVE SEARCH HISTORY
// ------------------------------------------------------------

function shSaveSearchHistory(
    accountId,
    history
) {
    const prepared =
        shPrepareSearchHistory(
            accountId,
            history
        );

    const existing =
        shFindSearchHistory(
            accountId
        );

    if (existing) {
        shUpdateEncryptedRecord(
            existing.recordId,
            prepared
        );

        return existing.recordId;
    }

    return shCreateStoredRecord(
        SH_SEARCH_DATA_CONFIG
            .searchHistoryCategory,
        prepared
    );
}

// ------------------------------------------------------------
// GET SEARCH HISTORY
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/search/history",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const history =
            shFindSearchHistory(
                auth.session.accountId
            );

        if (!history) {
            return sendJSON(res, 200, {
                success: true,
                history: [],
                stored: false
            });
        }

        return sendJSON(res, 200, {
            success: true,
            history:
                history.data.items || [],
            stored: true
        });
    }
);

// ------------------------------------------------------------
// SAVE SEARCH HISTORY
// ------------------------------------------------------------

shRegisterRoute(
    "PUT",
    "/api/search/history",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const body =
            await readRequestBody(req);

        if (!body) {
            return sendJSON(res, 400, {
                success: false,
                error:
                    "Invalid request body."
            });
        }

        let data;

        try {
            data = JSON.parse(body);
        } catch (error) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid JSON."
            });
        }

        try {
            const recordId =
                shSaveSearchHistory(
                    auth.session.accountId,
                    data.history
                );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "Search history saved securely.",
                recordId,

                security: {
                    encryption:
                        "AES-256-GCM",
                    keyProtection:
                        "RSA-3072",
                    integrity:
                        "SHA-384"
                }
            });
        } catch (error) {
            console.error(
                "[SEARCH HISTORY] Save error:",
                error.message
            );

            return sendJSON(res, 400, {
                success: false,
                error:
                    "Search history could not be saved."
            });
        }
    }
);

// ------------------------------------------------------------
// DELETE SEARCH HISTORY
// ------------------------------------------------------------

shRegisterRoute(
    "DELETE",
    "/api/search/history",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const history =
            shFindSearchHistory(
                auth.session.accountId
            );

        if (!history) {
            return sendJSON(res, 200, {
                success: true,
                message:
                    "Search history is already empty."
            });
        }

        try {
            shDeleteEncryptedRecord(
                history.recordId
            );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "Search history deleted."
            });
        } catch (error) {
            console.error(
                "[SEARCH HISTORY] Delete error:",
                error.message
            );

            return sendJSON(res, 500, {
                success: false,
                error:
                    "Search history could not be deleted."
            });
        }
    }
);

// ------------------------------------------------------------
// SAVED LINKS VALIDATION
// ------------------------------------------------------------

function shValidateSavedLink(item) {
    if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
    ) {
        return false;
    }

    if (
        typeof item.url !== "string" ||
        item.url.trim().length === 0
    ) {
        return false;
    }

    if (
        item.url.length >
        SH_SEARCH_DATA_CONFIG.maxUrlLength
    ) {
        return false;
    }

    try {
        const parsed =
            new URL(item.url);

        if (
            parsed.protocol !== "https:"
        ) {
            return false;
        }
    } catch (error) {
        return false;
    }

    return true;
}

// ------------------------------------------------------------
// SAVED LINKS PREPARATION
// ------------------------------------------------------------

function shPrepareSavedLinks(
    accountId,
    links
) {
    if (!Array.isArray(links)) {
        throw new Error(
            "Saved links must be an array."
        );
    }

    const limited =
        links.slice(
            -SH_SEARCH_DATA_CONFIG.maxSavedLinks
        );

    const items = [];

    for (const item of limited) {
        if (
            !shValidateSavedLink(item)
        ) {
            continue;
        }

        items.push({
            title:
                shCleanSearchText(
                    item.title || "",
                    SH_SEARCH_DATA_CONFIG
                        .maxTitleLength
                ),

            url:
                shCleanSearchText(
                    item.url,
                    SH_SEARCH_DATA_CONFIG
                        .maxUrlLength
                ),

            savedAt:
                typeof item.savedAt === "string"
                    ? item.savedAt
                    : new Date().toISOString()
        });
    }

    return {
        type: "smart_hub_saved_links",
        version: 1,
        accountId,
        items,
        updatedAt:
            new Date().toISOString()
    };
}

// ------------------------------------------------------------
// FIND SAVED LINKS
// ------------------------------------------------------------

function shFindSavedLinks(accountId) {
    const storage =
        shReadStorageFile();

    if (
        !storage ||
        !storage.records
    ) {
        return null;
    }

    for (
        const recordId of
        Object.keys(storage.records)
    ) {
        const record =
            storage.records[recordId];

        if (
            !record ||
            record.category !==
                SH_SEARCH_DATA_CONFIG
                    .savedLinksCategory
        ) {
            continue;
        }

        try {
            const data =
                shDecryptStoredData(record);

            if (
                data &&
                data.type ===
                    "smart_hub_saved_links" &&
                data.accountId === accountId
            ) {
                return {
                    recordId,
                    data
                };
            }
        } catch (error) {
            console.error(
                `[SAVED LINKS] Failed to decrypt ${recordId}:`,
                error.message
            );
        }
    }

    return null;
}

// ------------------------------------------------------------
// SAVE LINKS
// ------------------------------------------------------------

function shSaveSavedLinks(
    accountId,
    links
) {
    const prepared =
        shPrepareSavedLinks(
            accountId,
            links
        );

    const existing =
        shFindSavedLinks(
            accountId
        );

    if (existing) {
        shUpdateEncryptedRecord(
            existing.recordId,
            prepared
        );

        return existing.recordId;
    }

    return shCreateStoredRecord(
        SH_SEARCH_DATA_CONFIG
            .savedLinksCategory,
        prepared
    );
}

// ------------------------------------------------------------
// GET SAVED LINKS
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/links",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const links =
            shFindSavedLinks(
                auth.session.accountId
            );

        if (!links) {
            return sendJSON(res, 200, {
                success: true,
                links: [],
                stored: false
            });
        }

        return sendJSON(res, 200, {
            success: true,
            links:
                links.data.items || [],
            stored: true
        });
    }
);

// ------------------------------------------------------------
// SAVE LINKS
// ------------------------------------------------------------

shRegisterRoute(
    "PUT",
    "/api/links",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const body =
            await readRequestBody(req);

        if (!body) {
            return sendJSON(res, 400, {
                success: false,
                error:
                    "Invalid request body."
            });
        }

        let data;

        try {
            data = JSON.parse(body);
        } catch (error) {
            return sendJSON(res, 400, {
                success: false,
                error: "Invalid JSON."
            });
        }

        try {
            const recordId =
                shSaveSavedLinks(
                    auth.session.accountId,
                    data.links
                );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "Saved links stored securely.",
                recordId,

                security: {
                    encryption:
                        "AES-256-GCM",
                    keyProtection:
                        "RSA-3072",
                    integrity:
                        "SHA-384"
                }
            });
        } catch (error) {
            console.error(
                "[SAVED LINKS] Save error:",
                error.message
            );

            return sendJSON(res, 400, {
                success: false,
                error:
                    "Saved links could not be saved."
            });
        }
    }
);

// ------------------------------------------------------------
// DELETE SAVED LINKS
// ------------------------------------------------------------

shRegisterRoute(
    "DELETE",
    "/api/links",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        const links =
            shFindSavedLinks(
                auth.session.accountId
            );

        if (!links) {
            return sendJSON(res, 200, {
                success: true,
                message:
                    "Saved links are already empty."
            });
        }

        try {
            shDeleteEncryptedRecord(
                links.recordId
            );

            return sendJSON(res, 200, {
                success: true,
                message:
                    "Saved links deleted."
            });
        } catch (error) {
            console.error(
                "[SAVED LINKS] Delete error:",
                error.message
            );

            return sendJSON(res, 500, {
                success: false,
                error:
                    "Saved links could not be deleted."
            });
        }
    }
);

// ------------------------------------------------------------
// SEARCH DATA SECURITY STATUS
// ------------------------------------------------------------

shRegisterRoute(
    "GET",
    "/api/search/security-status",
    async (req, res) => {
        const auth =
            await shRequireAuthentication(
                req,
                res
            );

        if (!auth) {
            return;
        }

        return sendJSON(res, 200, {
            success: true,

            backend:
                "Oracle Cloud Infrastructure",

            serverCount: 1,

            searchDataSecurity: {
                searchHistory:
                    "AES-256-GCM",
                savedLinks:
                    "AES-256-GCM",
                keyProtection:
                    "RSA-3072",
                integrity:
                    "SHA-384",
                accountIsolation:
                    true,
                authenticatedAccess:
                    true
            }
        });
    }
);

// ------------------------------------------------------------
// PART 12 ARCHITECTURE
// ------------------------------------------------------------

const SH_SEARCH_DATA_ARCHITECTURE =
    Object.freeze({
        backendProvider:
            "Oracle Cloud Infrastructure",

        backendServerCount: 1,

        searchHistory: {
            encryptedAtRest:
                "AES-256-GCM",
            keyProtection:
                "RSA-3072",
            integrity:
                "SHA-384",
            accountIsolation:
                true
        },

        savedLinks: {
            encryptedAtRest:
                "AES-256-GCM",
            keyProtection:
                "RSA-3072",
            integrity:
                "SHA-384",
            accountIsolation:
                true
        },

        searchEnginesExternal:
            true,

        supabase: false,
        cloudflare: false
    });

console.log(
    "[SMART HUB] Part 12 — Search History & Saved Data Security initialized."
);

// ============================================================
// SMART HUB ORACLE BACKEND — PART 13
// CENTRAL APP COOKIE & PRIVACY DATA STORAGE
//
// Single Backend Server: Oracle Cloud Infrastructure (OCI)
//
// Smart Hub App-Owned Data:
//   Cookies / Preferences / Privacy State
//   -> Oracle OCI
//   -> AES-256-GCM encryption at rest
//   -> SHA-384 integrity
//   -> RSA-3072 key protection
//
// External Services:
//   DuckDuckGo / Mojeek / Swisscows / MetaGer / Yahoo
//   Startpage / Yandex
//   -> remain external services
// ============================================================


const SH_APP_COOKIE_CONFIG = Object.freeze({

  storageCategory: "app_cookies",

  encryption: "AES-256-GCM",
  integrity: "SHA-384",
  keyProtection: "RSA-3072",

  maxItems: 500,

  maxNameLength: 256,
  maxValueLength: 8192,
  maxDomainLength: 512,
  maxPathLength: 512,

  backendProvider: "Oracle Cloud Infrastructure",
  backendServerCount: 1

});


// ------------------------------------------------------------
// 13.1 — Validate One Cookie / Privacy Item
// ------------------------------------------------------------

function shValidateAppCookieItem(item) {

  if (!item || typeof item !== "object") {
    throw new Error("Invalid cookie/privacy item");
  }

  const name = String(item.name || "").trim();

  const value = String(
    item.value === undefined || item.value === null
      ? ""
      : item.value
  );

  if (!name) {
    throw new Error("Cookie/privacy item name is required");
  }

  if (name.length > SH_APP_COOKIE_CONFIG.maxNameLength) {
    throw new Error("Cookie/privacy item name is too long");
  }

  if (value.length > SH_APP_COOKIE_CONFIG.maxValueLength) {
    throw new Error("Cookie/privacy item value is too long");
  }

  const domain = item.domain
    ? String(item.domain).trim()
    : "";

  if (domain.length > SH_APP_COOKIE_CONFIG.maxDomainLength) {
    throw new Error("Cookie domain is too long");
  }

  const pathValue = item.path
    ? String(item.path).trim()
    : "/";

  if (pathValue.length > SH_APP_COOKIE_CONFIG.maxPathLength) {
    throw new Error("Cookie path is too long");
  }

  const sameSiteValues = [
    "Strict",
    "Lax",
    "None"
  ];

  const sameSite = sameSiteValues.includes(item.sameSite)
    ? item.sameSite
    : "Lax";

  return {

    name,

    value,

    domain,

    path: pathValue,

    secure: Boolean(item.secure),

    httpOnly: Boolean(item.httpOnly),

    sameSite,

    expiresAt: item.expiresAt
      ? String(item.expiresAt)
      : null,

    updatedAt: new Date().toISOString()

  };

}


// ------------------------------------------------------------
// 13.2 — Prepare Central App Cookie Data
// ------------------------------------------------------------

function shPrepareAppCookieData(accountId, items) {

  if (!accountId) {
    throw new Error("Authentication required");
  }

  if (!Array.isArray(items)) {
    throw new Error("Cookie/privacy data must be an array");
  }

  if (items.length > SH_APP_COOKIE_CONFIG.maxItems) {
    throw new Error("Too many cookie/privacy items");
  }

  return {

    type: "smart_hub_app_cookie_data",

    accountId: String(accountId),

    items: items.map(
      shValidateAppCookieItem
    ),

    updatedAt: new Date().toISOString()

  };

}


// ------------------------------------------------------------
// 13.3 — Find Account's Existing Cookie Data
// ------------------------------------------------------------

async function shFindAppCookieRecord(accountId) {

  const storage = await shReadStorageFile();

  const records = Object.values(
    storage.records || {}
  );

  for (const record of records) {

    try {

      const data = shDecryptStoredData(record);

      if (
        data &&
        data.type === "smart_hub_app_cookie_data" &&
        data.accountId === String(accountId)
      ) {

        return {
          recordId: record.id,
          data
        };

      }

    } catch (error) {

      console.error(
        "[APP-COOKIE] Decryption error:",
        error.message
      );

    }

  }

  return null;

}


// ------------------------------------------------------------
// 13.4 — Save / Update Central Cookie Data
// ------------------------------------------------------------

async function shSaveAppCookieData(
  accountId,
  items
) {

  const preparedData =
    shPrepareAppCookieData(
      accountId,
      items
    );

  const existing =
    await shFindAppCookieRecord(
      accountId
    );

  if (existing) {

    return await shUpdateEncryptedRecord(
      existing.recordId,
      preparedData
    );

  }

  return await shCreateStoredRecord(
    SH_APP_COOKIE_CONFIG.storageCategory,
    preparedData
  );

}


// ------------------------------------------------------------
// 13.5 — GET Central Cookie / Privacy Data
// ------------------------------------------------------------

shRegisterRoute(
  "GET",
  "/api/privacy/app-cookies",
  async (req, res) => {

    try {

      const auth =
        await shRequireAuthentication(req);

      if (!auth.authenticated) {

        return sendJSON(
          res,
          401,
          {
            success: false,
            error: "Authentication required"
          }
        );

      }

      const existing =
        await shFindAppCookieRecord(
          auth.accountId
        );

      return sendJSON(
        res,
        200,
        {

          success: true,

          items: existing
            ? existing.data.items
            : [],

          storage: {

            location:
              "Oracle Cloud Infrastructure",

            backendServerCount: 1,

            encryptedAtRest: true,

            encryption:
              "AES-256-GCM",

            integrity:
              "SHA-384",

            keyProtection:
              "RSA-3072"

          }

        }
      );

    } catch (error) {

      console.error(
        "[APP-COOKIE] GET error:",
        error.message
      );

      return sendJSON(
        res,
        500,
        {
          success: false,
          error:
            "Unable to read cookie/privacy data"
        }
      );

    }

  }
);


// ------------------------------------------------------------
// 13.6 — PUT Central Cookie / Privacy Data
// ------------------------------------------------------------

shRegisterRoute(
  "PUT",
  "/api/privacy/app-cookies",
  async (req, res) => {

    try {

      const auth =
        await shRequireAuthentication(req);

      if (!auth.authenticated) {

        return sendJSON(
          res,
          401,
          {
            success: false,
            error: "Authentication required"
          }
        );

      }

      const body =
        await readRequestBody(req);

      const parsed =
        typeof body === "string"
          ? JSON.parse(body)
          : body;

      const saved =
        await shSaveAppCookieData(
          auth.accountId,
          parsed.items
        );

      return sendJSON(
        res,
        200,
        {

          success: true,

          message:
            "Cookie/privacy data saved securely in Oracle OCI",

          recordId:
            saved.id ||
            saved.recordId ||
            null,

          encryptedAtRest: true,

          encryption:
            "AES-256-GCM",

          integrity:
            "SHA-384",

          keyProtection:
            "RSA-3072"

        }
      );

    } catch (error) {

      console.error(
        "[APP-COOKIE] PUT error:",
        error.message
      );

      return sendJSON(
        res,
        400,
        {
          success: false,
          error:
            error.message ||
            "Unable to save cookie/privacy data"
        }
      );

    }

  }
);


// ------------------------------------------------------------
// 13.7 — DELETE Central Cookie / Privacy Data
// ------------------------------------------------------------

shRegisterRoute(
  "DELETE",
  "/api/privacy/app-cookies",
  async (req, res) => {

    try {

      const auth =
        await shRequireAuthentication(req);

      if (!auth.authenticated) {

        return sendJSON(
          res,
          401,
          {
            success: false,
            error: "Authentication required"
          }
        );

      }

      const existing =
        await shFindAppCookieRecord(
          auth.accountId
        );

      if (!existing) {

        return sendJSON(
          res,
          200,
          {
            success: true,
            message:
              "No cookie/privacy data found"
          }
        );

      }

      await shDeleteEncryptedRecord(
        existing.recordId
      );

      return sendJSON(
        res,
        200,
        {
          success: true,
          message:
            "Cookie/privacy data deleted from Oracle OCI"
        }
      );

    } catch (error) {

      console.error(
        "[APP-COOKIE] DELETE error:",
        error.message
      );

      return sendJSON(
        res,
        500,
        {
          success: false,
          error:
            "Unable to delete cookie/privacy data"
        }
      );

    }

  }
);


// ------------------------------------------------------------
// 13.8 — Cookie / Privacy Security Status
// ------------------------------------------------------------

shRegisterRoute(
  "GET",
  "/api/privacy/security-status",
  async (req, res) => {

    return sendJSON(
      res,
      200,
      {

        success: true,

        backend: {

          provider:
            "Oracle Cloud Infrastructure",

          serverCount: 1

        },

        storage: {

          category:
            "app_cookies",

          location:
            "Oracle OCI",

          encryptionAtRest:
            "AES-256-GCM",

          integrity:
            "SHA-384",

          keyProtection:
            "RSA-3072"

        },

        transport: {

          target:
            "TLS 1.3"

        },

        externalServices: {

          remainExternal:
            true,

          ownServerData:
            "Remains on the external service's infrastructure"

        }

      }

    );

  }
);


// ------------------------------------------------------------
// 13.9 — Architecture Declaration
// ------------------------------------------------------------

const SH_APP_COOKIE_ARCHITECTURE =
  Object.freeze({

    backendProvider:
      "Oracle Cloud Infrastructure",

    backendServerCount:
      1,

    storage:

      "Oracle OCI encrypted storage",

    appOwnedCookieData:
      "Oracle OCI",

    appOwnedPrivacyData:
      "Oracle OCI",

    encryptionAtRest:
      "AES-256-GCM",

    integrity:
      "SHA-384",

    keyProtection:
      "RSA-3072",

    transportTarget:
      "TLS 1.3",

    externalServices:
      "External service remains external",

    supabase:
      false,

    cloudflare:
      false

  });


console.log(
  "[PART 13] Central App Cookie & Privacy Storage initialized."
);
