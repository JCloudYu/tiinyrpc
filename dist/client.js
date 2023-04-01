"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const beson_1 = __importDefault(require("beson"));
const trimid_js_1 = require("./trimid.js");
const consts_js_1 = require("./consts.js");
const DEFAULT_TIMEOUT = 5000;
;
;
const _Client = new WeakMap();
class Client {
    static init(options) { return new Client(options); }
    constructor(options) {
        _Client.set(this, {
            use_beson: !!options.use_beson,
            url: options.url,
            timeout: typeof options.timeout === "number" ? options.timeout : DEFAULT_TIMEOUT,
            headers: Object.assign({}, options.headers)
        });
    }
    get use_beson() { return _Client.get(this).use_beson; }
    set use_beson(v) { _Client.get(this).use_beson = !!v; }
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
        const { use_beson, headers, timeout, url } = _Client.get(this);
        return TRPCCall({ use_beson, headers, timeout, url }, call, args);
    }
}
exports.Client = Client;
function TRPCCall(arg1, call, args) {
    let use_beson, timeout, headers, url;
    if (typeof arg1 === "string") {
        url = arg1;
        headers = {};
        timeout = 0;
        use_beson = false;
    }
    else {
        if (typeof arg1.url !== "string" || !arg1.url) {
            throw new Error("Field url is required!");
        }
        url = arg1.url;
        timeout = arg1.timeout || 0;
        headers = arg1.headers || {};
        use_beson = !!arg1.use_beson;
    }
    return new Promise((resolve, reject) => {
        const _http = url.substring(0, 6) === 'https:' ? https_1.default : http_1.default;
        const _headers = { ...headers };
        delete _headers['content-type'];
        delete _headers['Content-Type'];
        let body;
        if (use_beson) {
            _headers['Content-Type'] = 'application/beson';
            body = Buffer.from(beson_1.default.Serialize({ rpc: "1.0", id: (0, trimid_js_1.TrimId)(), call, args }));
        }
        else {
            _headers['Content-Type'] = 'application/json';
            body = Buffer.from(JSON.stringify({ rpc: "1.0", id: (0, trimid_js_1.TrimId)(), call, args }));
        }
        const req = _http.request(url, { method: 'POST', headers: _headers }, (res) => {
            const chunks = [];
            const status_code = res.statusCode;
            res
                .on('data', c => chunks.push(c))
                .on('error', err => reject(err))
                .on('end', () => {
                const raw_data = Buffer.concat(chunks);
                let utfdata = undefined;
                let parsed_data = undefined;
                const result_ctnt_type = res.headers['content-type'] || '';
                const divider = result_ctnt_type.indexOf(';');
                const content_type = result_ctnt_type.substring(0, divider < 0 ? result_ctnt_type.length : divider);
                if (content_type === "application/json") {
                    try {
                        utfdata = raw_data.toString('utf8');
                    }
                    catch (e) { }
                    if (utfdata !== undefined) {
                        try {
                            parsed_data = JSON.parse(utfdata);
                        }
                        catch (e) { }
                    }
                }
                else if (content_type === "application/beson") {
                    parsed_data = beson_1.default.Deserialize(raw_data);
                }
                else {
                    return reject(Object.assign(new Error("Unsupported mime type returned from remote server!"), {
                        code: consts_js_1.ErrorCode.UNSUPPORTED_RESPONSE_TYPE,
                        detail: { mime: content_type }
                    }));
                }
                if (parsed_data === undefined || Object(parsed_data) !== parsed_data) {
                    return reject(Object.assign(new Error("Unable to resolve response body content!"), {
                        code: consts_js_1.ErrorCode.INCORRECT_RESPONSE_FORMAT,
                        status: status_code,
                        data: parsed_data || utfdata || raw_data
                    }));
                }
                if (parsed_data.error !== undefined) {
                    return reject(Object.assign(new Error(parsed_data.error.message), { code: consts_js_1.ErrorCode.UNKOWN_ERROR }, parsed_data.error, {
                        status: status_code,
                        is_remote: true
                    }));
                }
                return resolve(parsed_data.ret);
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
