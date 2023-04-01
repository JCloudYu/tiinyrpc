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
export declare type CallHandler = SyncCall | AsyncCall;
export interface CallMap {
    [func: string]: CallHandler;
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
export interface ServerScopeOptions {
    audit?: RequestPreprocessor | null;
}
export declare type ServerInitOptions = ServerScopeOptions & {
    max_body?: number;
};
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
    static init(options?: ServerInitOptions): Server;
    get max_body(): number;
    set max_body(size: number);
    get is_listening(): boolean;
    scope(options: ServerScopeOptions): Server;
    handle(callmap: CallMap): Server;
    handle(func: string, handler: CallHandler): Server;
    unhandle(func: string): Server;
    listen(options: ServerListenOptions): Promise<string | net.AddressInfo>;
    release(): Promise<void>;
}
export {};
