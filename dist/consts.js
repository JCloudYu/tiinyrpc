"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stage = exports.ErrorCode = void 0;
exports.ErrorCode = Object.freeze({
    UNSUPPORTED_METHOD: "rpc#unsupported-method",
    PAYLOAD_IS_TOO_LARGE: "rpc#payload-is-too-large",
    INVALID_PAYLOAD_FORMAT: 'rpc#invalid-payload-format',
    CALL_NOT_FOUND: 'rpc#call-not-found',
    CALL_EXEC_ERROR: 'rpc#call-exec-error',
    UNEXPECTED_ERROR: "rpc#unexpected-error"
});
exports.Stage = Object.freeze({
    PAYLOAD_PARSER: 'stage#payload-parser',
    CALL_AUDIT: 'stage#call-audit',
    CALL_EXEC: 'stage#call-exec',
    UNKNOWN: 'stage#unknown'
});
