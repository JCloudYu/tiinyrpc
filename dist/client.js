"use strict";
const TrimId = require("./trimid.js");
const http = require("http");
const https = require("https");
function Request(arg1, arg2, ...args) {
    let timeout, headers, url, call;
    if (typeof arg1 === "string") {
        url = arg1;
        call = arg2;
    }
    else {
        timeout = arg1.timeout || 0;
        headers = arg1.headers || {};
        url = arg2;
        call = args.shift();
    }
    return new Promise((resolve, reject) => {
        const _http = url.substring(0, 6) === 'https:' ? https : http;
        const _headers = { ...headers };
        delete _headers['content-type'];
        delete _headers['Content-Type'];
        _headers['Content-Type'] = 'application/json';
        const body = Buffer.from(JSON.stringify({ rpc: "1.0", id: TrimId(), call, args }));
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
module.exports = Request;
