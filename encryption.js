(function () {
  "use strict";

  const SmartHubEncryption = {

    async deriveKey(pin, salt) {
      const encoder = new TextEncoder();

      const material = await crypto.subtle.importKey(
        "raw",
        encoder.encode(pin),
        "PBKDF2",
        false,
        ["deriveKey"]
      );

      return crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 310000,
          hash: "SHA-256"
        },
        material,
        {
          name: "AES-GCM",
          length: 256
        },
        false,
        ["encrypt", "decrypt"]
      );
    },

    async encrypt(data, pin) {
      const encoder = new TextEncoder();

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const key = await this.deriveKey(pin, salt);

      const encrypted = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        encoder.encode(JSON.stringify(data))
      );

      return {
        algorithm: "AES-256-GCM",
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
      };
    },

    async decrypt(package, pin) {
      const decoder = new TextDecoder();

      const salt = new Uint8Array(package.salt);
      const iv = new Uint8Array(package.iv);
      const encrypted = new Uint8Array(package.data);

      const key = await this.deriveKey(pin, salt);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        encrypted
      );

      return JSON.parse(decoder.decode(decrypted));
    },

    async initialize() {
      await new Promise(resolve => setTimeout(resolve, 700));

      if (!window.crypto || !window.crypto.subtle) {
        throw new Error("Web Crypto API is not available.");
      }

      return true;
    }
  };

  window.SmartHubEncryption = SmartHubEncryption;

  window.addEventListener("load", async function () {
    try {
      await SmartHubEncryption.initialize();
      document.documentElement.classList.add("encryption-ready");
      console.log("Smart Hub encryption initialized.");
    } catch (error) {
      console.error("Smart Hub encryption initialization failed:", error);
    }
  });

})();
