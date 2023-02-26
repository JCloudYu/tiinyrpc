"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const srv = require("../server.js");
const req = require("../client.js");
Promise.resolve().then(async () => {
    const { Server } = srv;
    const server = new Server({
        hi: (name) => {
            return `Hi! ${name}!`;
        }
    }, { max_body: 1024 * 1024 });
    const info = await server.listen({ host: '127.0.0.1', port: 3036 });
    console.log(info);
    setTimeout(() => {
        req({ timeout: 5000 }, 'http://127.0.0.1:3036', 'hi', "JCloudYu").then(async (r) => {
            console.log(r);
        });
    }, 1000);
});
