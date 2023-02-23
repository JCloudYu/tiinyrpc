export = {
	ErrorCode: Object.freeze({
		UNSUPPORTED_METHOD: "rpc#unsupported-method",
		PAYLOAD_IS_TOO_LARGE: "rpc#payload-is-too-large",
		INVALID_PAYLOAD_FORMAT: 'rpc#invalid-payload-format',
		CALL_NOT_FOUND: 'rpc#call-not-found',
		CALL_EXEC_ERROR: 'rpc#call-exec-error',
		UNEXPECTED_ERROR: "rpc#unexpected-error"
	} as const),
	Stage: Object.freeze({
		PAYLOAD_PARSER: 'stage#payload-parser',
		CALL_EXEC: 'stage#call-exec',
		UNKNOWN: 'stage#unknown'
	} as const)
};