export declare const ErrorCode: Readonly<{
    readonly UNKOWN_ERROR: "error#unkown-error";
    readonly UNSUPPORTED_METHOD: "rpc#unsupported-method";
    readonly PAYLOAD_IS_TOO_LARGE: "rpc#payload-is-too-large";
    readonly INVALID_PAYLOAD_FORMAT: "rpc#invalid-payload-format";
    readonly CALL_NOT_FOUND: "rpc#call-not-found";
    readonly CALL_EXEC_ERROR: "rpc#call-exec-error";
    readonly UNEXPECTED_ERROR: "rpc#unexpected-error";
    readonly CALL_EXISTS: "server#call-exists";
    readonly INVALID_HANDLER_TYPE: "server#invalid-handler-type";
    readonly UNSUPPORTED_RESPONSE_TYPE: "client#unsupported-response-type";
    readonly INCORRECT_RESPONSE_FORMAT: "client#incorrect-response-format";
}>;
export declare const Stage: Readonly<{
    readonly PAYLOAD_PARSER: "stage#payload-parser";
    readonly CALL_AUDIT: "stage#call-audit";
    readonly CALL_EXEC: "stage#call-exec";
    readonly UNKNOWN: "stage#unknown";
}>;
