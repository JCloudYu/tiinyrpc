"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const http = require("http");
const events = require("events");
const beson = require("beson");
const Consts = require("./consts.js");
const { ErrorCode, Stage } = Consts;
;
;
;
;
;
;
;
;
const _Server = new WeakMap();
class Server extends events.EventEmitter {
    constructor(callmap, options) {
        super();
        const server = http.createServer();
        _Server.set(this, {
            callmap, server,
            max_body: options.max_body || 0
        });
        BindServerEvents.call(this, server);
    }
    listen(options) {
        const server = _Server.get(this).server;
        return new Promise((res, rej) => {
            server.once('error', rej);
            // Unix socket
            if ('path' in options) {
                _Server.get(this).server.listen(options.path, success);
                return;
            }
            if (options.host) {
                _Server.get(this).server.listen(options.port, options.host, success);
            }
            else {
                _Server.get(this).server.listen(options.port, success);
            }
            function success() {
                server.off('error', rej);
                return res(server.address());
            }
        });
    }
}
exports.Server = Server;
;
function BindServerEvents(server) {
    const __Server = _Server.get(this);
    server.on('request', (req, res) => {
        Promise.resolve().then(async () => {
            const result = await ReadAll(req, __Server.max_body);
            // Check method
            if (req.method !== "POST") {
                WriteResponse(res, 405, "application/json", {
                    rpc: "1.0",
                    error: {
                        stage: Stage.PAYLOAD_PARSER,
                        code: ErrorCode.UNSUPPORTED_METHOD,
                        message: "This server accepts only POST method!",
                        detail: { method: req.method }
                    }
                });
                return;
            }
            // Check size
            if (!Buffer.isBuffer(result)) {
                WriteResponse(res, 400, "application/json", {
                    rpc: "1.0",
                    error: {
                        stage: Stage.PAYLOAD_PARSER,
                        code: ErrorCode.PAYLOAD_IS_TOO_LARGE,
                        message: "Your request payload is too large!",
                        detail: {
                            payload: result.total_size,
                            limit: __Server.max_body
                        }
                    }
                });
                return;
            }
            // Parse content according to Content-Type header
            let payload, mime;
            {
                const raw_content_type = req.headers['Content-Type'] || '';
                const content_type = parseContentTypeHeader(Array.isArray(raw_content_type) ? raw_content_type[0] : raw_content_type);
                if (content_type.mime === "application/json") {
                    mime = content_type.mime;
                    try {
                        payload = JSON.parse(result.toString('utf8'));
                    }
                    catch (e) {
                        WriteResponse(res, 400, "application/json", {
                            rpc: "1.0",
                            error: {
                                stage: Stage.PAYLOAD_PARSER,
                                code: ErrorCode.INVALID_PAYLOAD_FORMAT,
                                message: "Provided body content is not a valid JSON!"
                            }
                        });
                        return;
                    }
                }
                else if (content_type.mime === "application/beson") {
                    mime = content_type.mime;
                    payload = beson.Deserialize(result);
                    if (payload === undefined) {
                        WriteResponse(res, 400, "application/json", {
                            rpc: "1.0",
                            error: {
                                stage: Stage.PAYLOAD_PARSER,
                                code: ErrorCode.INVALID_PAYLOAD_FORMAT,
                                message: "Provided body content is not a valid BESON!"
                            }
                        });
                        return;
                    }
                }
                else {
                    WriteResponse(res, 400, "application/json", {
                        rpc: "1.0",
                        error: {
                            stage: Stage.PAYLOAD_PARSER,
                            code: ErrorCode.INVALID_PAYLOAD_FORMAT,
                            message: "Unspported payload mime type!"
                        }
                    });
                    return;
                }
            }
            // Check if body is an object
            if (Object(payload) !== payload) {
                WriteResponse(res, 400, "application/json", {
                    rpc: "1.0",
                    error: {
                        stage: Stage.PAYLOAD_PARSER,
                        code: ErrorCode.INVALID_PAYLOAD_FORMAT,
                        message: "Unspported payload mime type!",
                        detail: { type: typeof payload }
                    }
                });
                return;
            }
            // Check request structure
            {
                const errors = [];
                if (payload.rpc !== "1.0") {
                    errors.push('Invalid rpc protocol');
                }
                if (typeof payload.id !== "string" || typeof payload.id !== "number") {
                    errors.push('Invalid request id');
                }
                if (!payload.call || typeof payload.call !== "string") {
                    errors.push('Invald call name');
                }
                if (!Array.isArray(payload.args)) {
                    errors.push('Invalid argument list');
                }
                if (errors.length > 0) {
                    WriteResponse(res, 400, "application/json", {
                        rpc: "1.0",
                        error: {
                            stage: Stage.PAYLOAD_PARSER,
                            code: ErrorCode.INVALID_PAYLOAD_FORMAT,
                            message: "Your payload content is invalid!",
                            detail: errors
                        }
                    });
                }
            }
            const func = __Server.callmap[payload.call];
            if (typeof func !== "function") {
                WriteResponse(res, 404, mime, {
                    rpc: "1.0",
                    error: {
                        stage: Stage.CALL_EXEC,
                        code: ErrorCode.CALL_NOT_FOUND,
                        message: "Target call is not found!",
                        detail: { call: payload.call }
                    }
                });
                return;
            }
            try {
                const result = await func(...payload.args);
                WriteResponse(res, 200, mime, {
                    rpc: "1.0",
                    id: payload.id,
                    ret: result
                });
            }
            catch (e) {
                console.error(`Received error when executing \`${payload.call}\`!`, e);
                const err = e;
                if (err instanceof Error) {
                    WriteResponse(res, 500, mime, {
                        rpc: "1.0",
                        id: payload.id,
                        error: {
                            stage: Stage.CALL_EXEC,
                            code: err.code || ErrorCode.CALL_EXEC_ERROR,
                            message: err.message,
                            detail: err.detail
                        }
                    });
                    return;
                }
                else {
                    WriteResponse(res, 500, mime, {
                        rpc: "1.0",
                        id: payload.id,
                        error: {
                            stage: Stage.CALL_EXEC,
                            code: ErrorCode.CALL_EXEC_ERROR,
                            message: 'Unknown exception has be caught!',
                            detail: err
                        }
                    });
                    return;
                }
            }
        })
            .catch((e) => {
            console.error("Received error in outter most scope!", e);
            WriteResponse(res, 500, "application/json", {
                rpc: "1.0",
                error: {
                    stage: Stage.UNKNOWN,
                    code: e.code || ErrorCode.UNEXPECTED_ERROR,
                    message: e.message
                }
            });
        });
    })
        .on('error', (e) => this.emit('error', e));
}
function ReadAll(req, max_body = 0) {
    return new Promise((res, rej) => {
        const chunks = [];
        let data_length = 0;
        req
            .on('data', (chunk) => {
            data_length += chunk.length;
            if (max_body > 0 && data_length >= max_body)
                return;
            chunks.push(chunk);
        })
            .on('end', () => {
            const remained = Buffer.concat(chunks);
            if (data_length !== remained.length) {
                return res({ remained, total_size: data_length });
            }
            else {
                return res(remained);
            }
        })
            .on('error', rej);
    });
}
function parseContentTypeHeader(contentTypeHeader) {
    const parts = contentTypeHeader.split(";");
    const mime = (parts[0] || '').trim();
    const attributes = {};
    for (let i = 1; i < parts.length; i++) {
        const attribute = parts[i].trim();
        const [name, value] = attribute.split("=");
        attributes[name.trim()] = value ? value.trim() : true;
    }
    return { mime, attributes };
}
function WriteResponse(res, status, mime, body) {
    res.writeHead(status, { "Content-Type": mime });
    if (mime === "application/json") {
        res.end(JSON.stringify(body));
    }
    else {
        res.end(beson.Serialize(body));
    }
}
