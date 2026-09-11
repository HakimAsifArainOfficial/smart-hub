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
