/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import http from 'http';
import events from 'events';
import type net from 'net';
import { ErrorCode, Stage } from './consts.js';
interface SyncCall {
    (...args: any[]): any;
}
interface AsyncCall {
    (...args: any[]): Promise<any>;
}
export interface CallMap {
    [func: string]: SyncCall | AsyncCall;
}
interface ServerSocketListenOptions {
    port: number;
    host?: string;
}
interface ServerPathListenOptions {
    path: string;
}
export declare type ServerListenOptions = ServerSocketListenOptions | ServerPathListenOptions;
export declare type RequestPreprocessor = {
    (req: http.IncomingMessage, payload: TRPCRequest): true | any | Promise<true | any>;
};
export interface ServerInitOptions {
    audit?: RequestPreprocessor;
    max_body?: number;
}
export interface TRPCRequest {
    rpc: "1.0";
    id: string | number;
    call: string;
    args: any[];
}
export interface TRPCSuccResp {
    rpc: "1.0";
    id: string | number;
    ret?: any;
}
export interface TRPCErrorResp {
    rpc: "1.0";
    id?: string | number;
    error: {
        stage: typeof Stage[keyof typeof Stage];
        code: string | typeof ErrorCode[keyof typeof ErrorCode];
        message: string;
        detail?: {};
    };
}
export declare class Server extends events.EventEmitter {
    static init(callmap: CallMap, options?: ServerInitOptions): Server;
    constructor(callmap: CallMap, options?: ServerInitOptions);
    get is_listening(): boolean;
    insert(call: string, handler: SyncCall | AsyncCall): this;
    remove(call: string): this;
    listen(options: ServerListenOptions): Promise<string | net.AddressInfo>;
    release(): Promise<void>;
}
export {};
