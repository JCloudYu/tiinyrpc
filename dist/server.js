"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const http_1 = __importDefault(require("http"));
const events_1 = __importDefault(require("events"));
const beson_1 = __importDefault(require("beson"));
const consts_js_1 = require("./consts.js");
;
;
;
;
;
;
;
;
const _Server = new WeakMap();
class Server extends events_1.default.EventEmitter {
    static init(callmap, options) {
        return new Server(callmap, options);
    }
    constructor(callmap, options) {
        super();
        options = (options && Object(options) === options) ? options : {};
        if (options.audit !== undefined && typeof options.audit !== "function") {
            throw new TypeError("Input preprocess field must be a function!");
        }
        const server = http_1.default.createServer();
        _Server.set(this, {
            callmap, server,
            max_body: options.max_body || 0,
            auditor: options.audit || DefaultPreprocessor
        });
        BindServerEvents.call(this, server);
    }
    get is_listening() { return _Server.get(this).server.listening; }
    insert(call, handler) {
        _Server.get(this).callmap[call] = handler;
        return this;
    }
    remove(call) {
        delete _Server.get(this).callmap[call];
        return this;
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
    release() {
        return new Promise((res, rej) => {
            _Server.get(this).server.close((err) => err ? rej(err) : res());
        });
    }
}
exports.Server = Server;
;
function DefaultPreprocessor() { }
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
                        stage: consts_js_1.Stage.PAYLOAD_PARSER,
                        code: consts_js_1.ErrorCode.UNSUPPORTED_METHOD,
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
                        stage: consts_js_1.Stage.PAYLOAD_PARSER,
                        code: consts_js_1.ErrorCode.PAYLOAD_IS_TOO_LARGE,
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
                const raw_content_type = req.headers['content-type'] || '';
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
                                stage: consts_js_1.Stage.PAYLOAD_PARSER,
                                code: consts_js_1.ErrorCode.INVALID_PAYLOAD_FORMAT,
                                message: "Provided body content is not a valid JSON!"
                            }
                        });
                        return;
                    }
                }
                else if (content_type.mime === "application/beson") {
                    mime = content_type.mime;
                    payload = beson_1.default.Deserialize(result);
                    if (payload === undefined) {
                        WriteResponse(res, 400, "application/json", {
                            rpc: "1.0",
                            error: {
                                stage: consts_js_1.Stage.PAYLOAD_PARSER,
                                code: consts_js_1.ErrorCode.INVALID_PAYLOAD_FORMAT,
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
                            stage: consts_js_1.Stage.PAYLOAD_PARSER,
                            code: consts_js_1.ErrorCode.INVALID_PAYLOAD_FORMAT,
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
                        stage: consts_js_1.Stage.PAYLOAD_PARSER,
                        code: consts_js_1.ErrorCode.INVALID_PAYLOAD_FORMAT,
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
                if (typeof payload.id !== "string" && typeof payload.id !== "number") {
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
                            stage: consts_js_1.Stage.PAYLOAD_PARSER,
                            code: consts_js_1.ErrorCode.INVALID_PAYLOAD_FORMAT,
                            message: "Your payload content is invalid!",
                            detail: errors
                        }
                    });
                    return;
                }
            }
            const auditor = __Server.auditor;
            const is_go = await auditor(req, payload);
            if (is_go !== true) {
                WriteResponse(res, 403, mime, {
                    rpc: "1.0",
                    error: {
                        stage: consts_js_1.Stage.CALL_AUDIT,
                        code: consts_js_1.ErrorCode.INVALID_PAYLOAD_FORMAT,
                        message: "You're not allowed to perform this operation!",
                        detail: { info: is_go }
                    }
                });
                return;
            }
            const func = __Server.callmap[payload.call];
            if (typeof func !== "function") {
                WriteResponse(res, 404, mime, {
                    rpc: "1.0",
                    error: {
                        stage: consts_js_1.Stage.CALL_EXEC,
                        code: consts_js_1.ErrorCode.CALL_NOT_FOUND,
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
                            stage: consts_js_1.Stage.CALL_EXEC,
                            code: err.code || consts_js_1.ErrorCode.CALL_EXEC_ERROR,
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
                            stage: consts_js_1.Stage.CALL_EXEC,
                            code: consts_js_1.ErrorCode.CALL_EXEC_ERROR,
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
                    stage: consts_js_1.Stage.UNKNOWN,
                    code: e.code || consts_js_1.ErrorCode.UNEXPECTED_ERROR,
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
        res.end(beson_1.default.Serialize(body));
    }
}
