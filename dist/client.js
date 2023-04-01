"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const trimid_js_1 = require("./trimid.js");
const DEFAULT_TIMEOUT = 5000;
;
;
const _Client = new WeakMap();
class Client {
    static init(options) { return new Client(options); }
    constructor(options) {
        _Client.set(this, {
            url: options.url,
            timeout: typeof options.timeout === "number" ? options.timeout : DEFAULT_TIMEOUT,
            headers: Object.assign({}, options.headers)
        });
    }
    get timeout() { return _Client.get(this).timeout; }
    set timeout(v) {
        if (typeof v !== "number")
            throw new TypeError("Property timeout only accept integers!");
        _Client.get(this).timeout = v;
    }
    get headers() { return _Client.get(this).headers; }
    mutate(overwrites) {
        const curr = _Client.get(this);
        const new_client = new Client({ url: '' });
        Object.assign(_Client.get(new_client), overwrites, { url: curr.url });
        return new_client;
    }
    invoke(call, ...args) {
        const { headers, timeout, url } = _Client.get(this);
        return TRPCCall({ headers, timeout, url }, call, args);
    }
}
exports.Client = Client;
function TRPCCall(arg1, call, args) {
    let timeout, headers, url;
    if (typeof arg1 === "string") {
        url = arg1;
        headers = {};
        timeout = 0;
    }
    else {
        if (typeof arg1.url !== "string" || !arg1.url) {
            throw new Error("Field url is required!");
        }
        url = arg1.url;
        timeout = arg1.timeout || 0;
        headers = arg1.headers || {};
    }
    return new Promise((resolve, reject) => {
        const _http = url.substring(0, 6) === 'https:' ? https_1.default : http_1.default;
        const _headers = { ...headers };
        delete _headers['content-type'];
        delete _headers['Content-Type'];
        _headers['Content-Type'] = 'application/json';
        const body = Buffer.from(JSON.stringify({ rpc: "1.0", id: (0, trimid_js_1.TrimId)(), call, args }));
        const req = _http.request(url, { method: 'POST', headers: _headers }, (res) => {
            const chunks = [];
            const status_code = res.statusCode;
            res
                .on('data', c => chunks.push(c))
                .on('error', err => reject(err))
                .on('end', () => {
                const raw_data = Buffer.concat(chunks);
                let utfdata = undefined;
                let jsondata = undefined;
                try {
                    utfdata = raw_data.toString('utf8');
                }
                catch (e) { }
                if (utfdata !== undefined) {
                    try {
                        jsondata = JSON.parse(utfdata);
                    }
                    catch (e) { }
                }
                if (jsondata === undefined || Object(jsondata) !== jsondata) {
                    return reject(Object.assign(new Error("Unable to resolve response body content!"), {
                        code: 'error#incorrect-response-format',
                        status: status_code,
                        data: jsondata || utfdata || raw_data
                    }));
                }
                if (jsondata.error !== undefined) {
                    return reject(Object.assign(new Error(jsondata.error.message), jsondata.error, {
                        status: status_code,
                        is_remote: true
                    }));
                }
                return resolve(jsondata.ret);
            });
        })
            .on('error', (err) => reject(err))
            .on('timeout', function () { this.destroy(); });
        if (timeout > 0) {
            req.setTimeout(timeout);
        }
        req.end(body);
    });
}
