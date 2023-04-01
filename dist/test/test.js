"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const TRPC = __importStar(require("../index.js"));
Promise.resolve().then(async () => {
    const server = TRPC.Server.init({
        hi: (name) => {
            return `Hi! ${name}!`;
        },
        no: () => {
            return `You'll never reach here...!`;
        }
    }, { max_body: 1024 * 1024, audit: (req, p) => new Promise((res) => {
            setTimeout(() => {
                console.log(req.headers);
                res(p.call === "hi" ? true : { a: 1, b: 2, c: 3 });
            }, 2000);
            return true;
        }) });
    const info = await server.listen({ host: '127.0.0.1', port: 3036 });
    console.log(info);
    const client = TRPC.Client.init({ url: 'http://127.0.0.1:3036', timeout: 0 });
    setTimeout(() => {
        Promise.resolve().then(async () => {
            await client.invoke('hi', "JCloudYu").then(async (r) => {
                console.log(r);
            });
            await client.invoke('no').then(async (r) => {
                console.log(r);
            }).catch((e) => console.error(e));
            await server.release();
        });
    }, 1000);
});
