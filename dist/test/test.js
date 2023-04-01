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
        max_body: 2 * 1024 * 1024,
        audit: (req, p) => new Promise((res) => {
            console.log("Audit1:", req.headers, p.call);
            setTimeout(() => res(true), 2000);
        })
    })
        .handle({
        'hi': (name) => {
            return `Hi! ${name}!`;
        }
    })
        .scope({
        audit: (req, p) => {
            console.log("Audit2:", req.headers, p.call);
            return false;
        }
    })
        .handle('no', () => {
        return `You'll never reach here...!`;
    })
        .handle('echo', () => {
        return `You'll never reach here...!`;
    })
        .scope({ audit: null })
        .unhandle('echo')
        .handle({
        echo: (data) => {
            return data;
        }
    });
    const info = await server.listen({ host: '127.0.0.1', port: 3036 });
    console.log(info);
    const client = TRPC.Client.init({ url: 'http://127.0.0.1:3036', timeout: 0 });
    setTimeout(() => {
        Promise.resolve().then(async () => {
            await client.invoke('hi', "JCloudYu").then(async (r) => {
                console.log("Success(hi):", r);
            }).catch((e) => console.error("Error(hi):", e));
            console.log("");
            await client.invoke('no').then(async (r) => {
                console.log("Success(no):", r);
            }).catch((e) => console.error("Error(no):", e));
            console.log("");
            await client.invoke('echo', { a: 1, b: 2, c: 3 }).then(async (r) => {
                console.log("Success(echo,json):", r);
            }).catch((e) => console.error("Error(echo,json):", e));
            console.log("");
            await client.mutate({ use_beson: true }).invoke('echo', {
                a: 1, b: 2, c: 3, d: new Uint8Array((new Uint32Array([17830144])).buffer)
            }).then(async (r) => {
                console.log("Success(echo,beson):", r);
            }).catch((e) => console.error("Error(echo,beson):", e));
            await server.release();
        });
    }, 1000);
});
