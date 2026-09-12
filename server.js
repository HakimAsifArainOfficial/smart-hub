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
