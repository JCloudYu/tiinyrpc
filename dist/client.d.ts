/// <reference types="node" />
import http from 'http';
export interface ClientInitOptions {
    url: string;
    timeout?: number;
    headers?: http.OutgoingHttpHeaders;
}
export declare class Client {
    static init(options: ClientInitOptions): Client;
    constructor(options: ClientInitOptions);
    get timeout(): number;
    set timeout(v: number);
    get headers(): http.OutgoingHttpHeaders;
    mutate(overwrites: Omit<ClientInitOptions, 'url'>): Client;
    invoke<ReturnType = any>(call: string, ...args: any[]): Promise<ReturnType>;
}
