/// <reference types="node" />
import http from 'http';
export interface ClientInitOptions {
    url: string;
    use_beson?: boolean;
    timeout?: number;
    headers?: http.OutgoingHttpHeaders;
}
export declare class Client {
    static init(options: ClientInitOptions): Client;
    constructor(options: ClientInitOptions);
    get use_beson(): boolean;
    set use_beson(v: boolean);
    get timeout(): number;
    set timeout(v: number);
    get headers(): http.OutgoingHttpHeaders;
    mutate(overwrites: Omit<ClientInitOptions, 'url'>): Client;
    invoke<ReturnType = any>(call: string, ...args: any[]): Promise<ReturnType>;
}
