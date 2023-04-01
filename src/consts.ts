export const ErrorCode = Object.freeze({
	// General error
	UNKOWN_ERROR: 'error#unkown-error',

	// Remote error
	UNSUPPORTED_METHOD: "rpc#unsupported-method",
	PAYLOAD_IS_TOO_LARGE: "rpc#payload-is-too-large",
	INVALID_PAYLOAD_FORMAT: 'rpc#invalid-payload-format',
	CALL_NOT_FOUND: 'rpc#call-not-found',
	CALL_EXEC_ERROR: 'rpc#call-exec-error',
	UNEXPECTED_ERROR: "rpc#unexpected-error",

	// Server error
	CALL_EXISTS: 'server#call-exists',
	INVALID_HANDLER_TYPE: 'server#invalid-handler-type',
	
	// Client error
	UNSUPPORTED_RESPONSE_TYPE: 'client#unsupported-response-type',
	INCORRECT_RESPONSE_FORMAT: 'client#incorrect-response-format'
} as const);
export const Stage = Object.freeze({
	PAYLOAD_PARSER: 'stage#payload-parser',
	CALL_AUDIT: 'stage#call-audit',
	CALL_EXEC: 'stage#call-exec',
	UNKNOWN: 'stage#unknown'
} as const);