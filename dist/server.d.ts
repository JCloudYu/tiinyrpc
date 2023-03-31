/// <reference types="node" />
/// <reference types="node" />
import events = require('events');
import type net = require('net');
declare const ErrorCode: Readonly<{
    readonly UNSUPPORTED_METHOD: "rpc#unsupported-method";
    readonly PAYLOAD_IS_TOO_LARGE: "rpc#payload-is-too-large";
    readonly INVALID_PAYLOAD_FORMAT: "rpc#invalid-payload-format";
    readonly CALL_NOT_FOUND: "rpc#call-not-found";
    readonly CALL_EXEC_ERROR: "rpc#call-exec-error";
    readonly UNEXPECTED_ERROR: "rpc#unexpected-error";
}>, Stage: Readonly<{
    readonly PAYLOAD_PARSER: "stage#payload-parser";
    readonly CALL_EXEC: "stage#call-exec";
    readonly UNKNOWN: "stage#unknown";
}>;
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
export interface ServerInitOptions {
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
export default class Server extends events.EventEmitter {
    static init(callmap: CallMap, options?: ServerInitOptions): Server;
    constructor(callmap: CallMap, options?: ServerInitOptions);
    insert(call: string, handler: SyncCall | AsyncCall): this;
    remove(call: string): this;
    listen(options: ServerListenOptions): Promise<string | net.AddressInfo>;
}
export {};
