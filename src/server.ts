import http from 'http';
import events from 'events';
import beson from 'beson';
import type net from 'net';
import {ErrorCode, Stage} from './consts.js';



interface SyncCall {(...args:any[]):any};
interface AsyncCall {(...args:any[]):Promise<any>};
export type CallHandler = SyncCall|AsyncCall;
export interface CallMap {[func:string]:CallHandler};

interface ServerSocketListenOptions {port:number; host?:string;};
interface ServerPathListenOptions {path:string;};
export type ServerListenOptions = ServerSocketListenOptions | ServerPathListenOptions;

export type RequestPreprocessor = {(req:http.IncomingMessage, payload:TRPCRequest):true|any|Promise<true|any>};
export interface ServerScopeOptions {
	audit?:RequestPreprocessor|null;
}
export type ServerInitOptions = ServerScopeOptions & {max_body?:number};
export interface TRPCRequest {
	rpc:"1.0",
	id:string|number;
	call:string;
	args:any[]
};
export interface TRPCSuccResp {
	rpc:"1.0",
	id:string|number;
	ret?:any;
};
export interface TRPCErrorResp {
	rpc:"1.0",
	id?:string|number;
	error: {
		stage:typeof Stage[keyof typeof Stage];
		code: string|typeof ErrorCode[keyof typeof ErrorCode];
		message:string;
		detail?:{};
	}
};


interface InvokeMap {[func:string]: {
	handler:CallHandler;
	auditor:RequestPreprocessor|null;
}}
interface ServerSession {
	callmap:InvokeMap;
	max_body:number;
	server:http.Server;
}

interface ServerInstPrivates {
	session:ServerSession|null;
	audit:RequestPreprocessor|null;
}
const _ServerInst:WeakMap<Server, ServerInstPrivates> = new WeakMap();
export class Server extends events.EventEmitter {
	static init(options?:ServerInitOptions):Server {
		const server = new Server();
		const session:ServerSession = {
			callmap: {},
			max_body: options?.max_body||0,
			server:http.createServer()
		}
		_ServerInst.set(server, Object.assign(
			{session:null, max_body:0, audit:null}, 
			options, 
			{session}
		));

		BindMessageProcessor.call(server);
		return server;
	}
	get max_body() { return _ServerInst.get(this)!.session!.max_body; }
	set max_body(size:number) {
		if ( typeof size !== "number" || !Number.isFinite(size) || Number.isNaN(size) ) {
			throw new Error("Property max_body must be a finite number!");
		}
		
		_ServerInst.get(this)!.session!.max_body = size;
	}

	get is_listening() { return _ServerInst.get(this)!.session!.server.listening; }
	scope(options:ServerScopeOptions):Server {
		const instance = new Server();
		_ServerInst.set(instance, Object.assign({
			session:null, audit:null
		}, options, {session:_ServerInst.get(this)!.session}));
		return instance;
	}

	handle(callmap:CallMap):Server;
	handle(func:string, handler:CallHandler):Server;
	handle(callmap:string|CallMap, handler?:CallHandler):Server {
		if ( typeof callmap === "string" ) {
			callmap = {[callmap]:handler!};
		}
		
		const _inst = _ServerInst.get(this)!;
		const regmap = _inst.session!.callmap;
		for(const func in callmap) {
			if ( regmap[func] ) {
				throw Object.assign(new Error(`Call '${func} has been registered already!'`), {
					code:ErrorCode.CALL_EXISTS,
					detail:{func}
				});
			}



			const handler = callmap[func];
			const handler_type = typeof handler;
			if ( handler_type !== "function" ) {
				throw Object.assign(new Error(`Given handler expects function, got ${handler_type}!`),{
					code:ErrorCode.INVALID_HANDLER_TYPE,
					detail:{func}
				});
			}



			regmap[func] = { handler, auditor:_inst.audit };
		}
		
		return this;
	}

	unhandle(func:string):Server {
		const _inst = _ServerInst.get(this)!;
		const regmap = _inst.session!.callmap;
		delete regmap[func];
		return this;
	}

	listen(options:ServerListenOptions):Promise<string|net.AddressInfo> {
		return new Promise((res, rej)=>{
			const server = _ServerInst.get(this)!.session!.server;
			server.once('error', rej);

			// Unix socket
			if ( 'path' in options ) {
				server.listen(options.path, success);
				return;
			}



			if ( options.host ) {
				server.listen(options.port, options.host, success);
			}
			else {
				server.listen(options.port, success);
			}

			function success() {
				server.off('error', rej);
				return res(server.address()!);
			}
		});
	}

	release():Promise<void> {
		return new Promise((res, rej)=>{
			_ServerInst.get(this)!.session!.server.close((err)=>err?rej(err):res());
		});
	}
}



function BindMessageProcessor(this:Server) {
	const __Server = _ServerInst.get(this)!;
	const Session = __Server.session!;
	__Server.session!.server.on('request', (req, res)=>{
		Promise.resolve().then(async()=>{
			const result = await ReadAll(req, Session.max_body);

			// Check method
			if ( req.method !== "POST" ) {
				WriteResponse(res, 405, "application/json", {
					rpc:"1.0",
					error: {
						stage: Stage.PAYLOAD_PARSER,
						code: ErrorCode.UNSUPPORTED_METHOD,
						message: "This server accepts only POST method!",
						detail: { method:req.method }
					}
				});
				return;
			}

			// Check size
			if ( !Buffer.isBuffer(result) ) {
				WriteResponse(res, 400, "application/json", {
					rpc:"1.0",
					error: {
						stage: Stage.PAYLOAD_PARSER,
						code: ErrorCode.PAYLOAD_IS_TOO_LARGE,
						message: "Your request payload is too large!",
						detail: {
							payload: result.total_size,
							limit: Session.max_body
						}
					}
				});
				return;
			}


			// Parse content according to Content-Type header
			let payload:TRPCRequest, mime:'application/json'|'application/beson';
			{
				const raw_content_type = req.headers['content-type']||'';
				const content_type = parseContentTypeHeader(Array.isArray(raw_content_type)?raw_content_type[0]:raw_content_type);
				if ( content_type.mime === "application/json" ) {
					mime = content_type.mime;

					try {
						payload = JSON.parse(result.toString('utf8'));
					}
					catch(e) {
						WriteResponse(res, 400, "application/json", {
							rpc:"1.0",
							error: {
								stage: Stage.PAYLOAD_PARSER,
								code: ErrorCode.INVALID_PAYLOAD_FORMAT,
								message: "Provided body content is not a valid JSON!"
							}
						});
						return;
					}
				}
				else
				if ( content_type.mime === "application/beson" ) {
					mime = content_type.mime;

					payload = beson.Deserialize(result);
					if ( payload === undefined ) {
						WriteResponse(res, 400, "application/json", {
							rpc:"1.0",
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
						rpc:"1.0",
						error: {
							stage:Stage.PAYLOAD_PARSER,
							code: ErrorCode.INVALID_PAYLOAD_FORMAT,
							message: "Unspported payload mime type!"
						}
					});
					return;
				}
			}

			// Check if body is an object
			if ( Object(payload) !== payload ) {
				WriteResponse(res, 400, "application/json", {
					rpc:"1.0",
					error: {
						stage:Stage.PAYLOAD_PARSER,
						code: ErrorCode.INVALID_PAYLOAD_FORMAT,
						message: "Unspported payload mime type!",
						detail: {type:typeof payload}
					}
				});
				return;
			}

			// Check request structure
			{
				const errors:string[] = [];
				if ( payload.rpc !== "1.0" ) {
					errors.push('Invalid rpc protocol');
				}

				if ( typeof payload.id !== "string" && typeof payload.id !== "number" ) {
					errors.push('Invalid request id');
				}

				if ( !payload.call || typeof payload.call !== "string" ) {
					errors.push('Invald call name');
				}

				if ( !Array.isArray(payload.args) ) {
					errors.push('Invalid argument list');
				}

				if ( errors.length > 0 ) {
					WriteResponse(res, 400, "application/json", {
						rpc:"1.0",
						error: {
							stage:Stage.PAYLOAD_PARSER,
							code: ErrorCode.INVALID_PAYLOAD_FORMAT,
							message: "Your payload content is invalid!",
							detail: errors
						}
					});
					return;
				}
			}






			const call_info = Session.callmap[payload.call];
			if ( !call_info ) {
				WriteResponse(res, 404, mime, {
					rpc:"1.0",
					error: {
						stage: Stage.CALL_EXEC,
						code: ErrorCode.CALL_NOT_FOUND,
						message: "Target call is not found!",
						detail: {call:payload.call}
					}
				});
				return;
			}

			

			const auditor = call_info.auditor;
			if ( typeof auditor === "function" ) {
				const is_go = await auditor(req, payload);
				if ( is_go !== true ) {
					WriteResponse(res, 403, mime, {
						rpc:"1.0",
						error: {
							stage:Stage.CALL_AUDIT,
							code: ErrorCode.INVALID_PAYLOAD_FORMAT,
							message: "You're not allowed to perform this operation!",
							detail: { info:is_go }
						}
					});
					return;
				}
			}


			

			try {
				const result = await call_info.handler.call(null, ...payload.args);
				WriteResponse(res, 200, mime, {
					rpc:"1.0",
					id:payload.id,
					ret:result
				});
			}
			catch(e) {
				console.error(`Received error when executing \`${payload.call}\`!`, e);
				const err = e as Error&{code?:string; detail?:any};
				if ( err instanceof Error ) {
					WriteResponse(res, 500, mime, {
						rpc:"1.0",
						id: payload.id,
						error: {
							stage: Stage.CALL_EXEC,
							code: err.code||ErrorCode.CALL_EXEC_ERROR,
							message: err.message,
							detail: err.detail
						}
					});
					return;
				}
				else {
					WriteResponse(res, 500, mime, {
						rpc:"1.0",
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
		.catch((e:Error&{code?:string})=>{
			console.error("Received error in outter most scope!", e);
			WriteResponse(res, 500, "application/json", {
				rpc:"1.0",
				error: {
					stage: Stage.UNKNOWN,
					code: e.code||ErrorCode.UNEXPECTED_ERROR,
					message: e.message
				}
			});
		});
	});
}
function ReadAll(req:http.IncomingMessage, max_body:number=0):Promise<Buffer|{remained:Buffer, total_size:number;}> {
	return new Promise((res, rej)=>{
		const chunks:Buffer[] = [];
		let data_length = 0;
		req
		.on('data', (chunk)=>{
			data_length += chunk.length;
			if ( max_body>0 && data_length>=max_body ) return;

			chunks.push(chunk);
		})
		.on('end', ()=>{
			const remained = Buffer.concat(chunks);
			if ( data_length !== remained.length ) {
				return res({remained, total_size:data_length});
			}
			else {
				return res(remained);
			}
		})
		.on('error', rej);
	});
}
function parseContentTypeHeader(contentTypeHeader: string) {
	const parts = contentTypeHeader.split(";");
	const mime = (parts[0] || '').trim();
	const attributes: { [key: string]: string | boolean } = {};
	for (let i = 1; i < parts.length; i++) {
		const attribute = parts[i].trim();
		const [name, value] = attribute.split("=");
		attributes[name.trim()] = value ? value.trim() : true;
	}
	return { mime, attributes };
}
function WriteResponse(res:http.ServerResponse, status:number, mime:'application/json'|'application/beson', body:TRPCSuccResp|TRPCErrorResp) {
	res.writeHead(status, {"Content-Type": mime});
	if ( mime === "application/json" ) {
		res.end(JSON.stringify(body));
	}
	else {
		res.end(beson.Serialize(body));
	}
}
