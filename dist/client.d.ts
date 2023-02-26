/// <reference types="node" />
import http = require('http');
interface ReqInfo {
    headers?: http.OutgoingHttpHeaders;
    timeout?: number;
}
declare function Request<ReturnType = any>(info: ReqInfo, url: string, call: string, ...args: any[]): Promise<ReturnType>;
declare function Request<ReturnType = any>(url: string, call: string, ...args: any[]): Promise<ReturnType>;
export = Request;
