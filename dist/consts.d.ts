declare const _default: {
    ErrorCode: Readonly<{
        readonly UNSUPPORTED_METHOD: "rpc#unsupported-method";
        readonly PAYLOAD_IS_TOO_LARGE: "rpc#payload-is-too-large";
        readonly INVALID_PAYLOAD_FORMAT: "rpc#invalid-payload-format";
        readonly CALL_NOT_FOUND: "rpc#call-not-found";
        readonly CALL_EXEC_ERROR: "rpc#call-exec-error";
        readonly UNEXPECTED_ERROR: "rpc#unexpected-error";
    }>;
    Stage: Readonly<{
        readonly PAYLOAD_PARSER: "stage#payload-parser";
        readonly CALL_EXEC: "stage#call-exec";
        readonly UNKNOWN: "stage#unknown";
    }>;
};
export = _default;
