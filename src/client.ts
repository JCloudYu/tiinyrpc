import http from 'http';
import https from 'https';
import beson from "beson";
import {TrimId} from "./trimid.js";
import { ErrorCode } from './consts.js';


const DEFAULT_TIMEOUT = 5_000;


export interface ClientInitOptions {
	url:string;
	use_beson?:boolean;
	timeout?:number;
	headers?:http.OutgoingHttpHeaders;
};



interface ClientPrivates {use_beson:boolean; timeout:number; url:string; headers:http.OutgoingHttpHeaders;};
const _Client:WeakMap<Client, ClientPrivates> = new WeakMap();

export class Client {
	static init(options:ClientInitOptions):Client { return new Client(options); }

	constructor(options:ClientInitOptions) {
		_Client.set(this, {
			use_beson: !!options.use_beson,
			url:options.url,
			timeout:typeof options.timeout === "number" ? options.timeout : DEFAULT_TIMEOUT,
			headers: Object.assign({}, options.headers)
		});
	}
	get use_beson() { return _Client.get(this)!.use_beson; }
	set use_beson(v:boolean) { _Client.get(this)!.use_beson = !!v; }
	get timeout() { return _Client.get(this)!.timeout; }
	set timeout(v:number) {
		if ( typeof v !== "number") 
			throw new TypeError("Property timeout only accept integers!"); 
		_Client.get(this)!.timeout = v; 
	}
	get headers() { return _Client.get(this)!.headers; }

	mutate(overwrites:Omit<ClientInitOptions, 'url'>):Client {
		const curr = _Client.get(this)!;
		const new_client = new Client({url:''});
		Object.assign(_Client.get(new_client)!, overwrites, {url:curr.url});
		return new_client;
	}

	invoke<ReturnType=any>(call:string, ...args:any[]):Promise<ReturnType> {
		const {use_beson, headers, timeout, url} = _Client.get(this)!;
		return TRPCCall<ReturnType>({use_beson, headers, timeout, url}, call, args);
	}
}




interface ReqInfo { use_beson?:boolean; url?:string; headers?:http.OutgoingHttpHeaders; timeout?:number; }
function TRPCCall<ReturnType=any>(url:string, call:string, args:any[]):Promise<ReturnType>;
function TRPCCall<ReturnType=any>(info:ReqInfo, call:string, args:any[]):Promise<ReturnType>
function TRPCCall<ReturnType=any>(arg1:string|ReqInfo, call:string, args:any[]):Promise<ReturnType> {
	let use_beson:boolean, timeout:number, headers:http.OutgoingHttpHeaders, url:string;
	if ( typeof arg1 === "string" ) {
		url = arg1;
		headers = {};
		timeout = 0;
		use_beson = false;
	}
	else {
		if ( typeof arg1.url !== "string" || !arg1.url ) { throw new Error("Field url is required!"); }

		url = arg1.url;
		timeout = arg1.timeout||0;
		headers = arg1.headers||{};
		use_beson = !!arg1.use_beson;
	}

	return new Promise<ReturnType>((resolve, reject)=>{
		const _http = url.substring(0, 6) === 'https:' ? https : http;
		const _headers = {...headers};
		delete _headers['content-type'];
		delete _headers['Content-Type'];

		let body:any;
		
		if ( use_beson ) {
			_headers['Content-Type'] = 'application/beson';
			body = Buffer.from(beson.Serialize({rpc:"1.0", id:TrimId(), call, args}));
		}
		else {
			_headers['Content-Type'] = 'application/json';
			body = Buffer.from(JSON.stringify({rpc:"1.0", id:TrimId(), call, args}));
		}
		
		const req = _http.request(url, {method:'POST', headers:_headers}, (res)=>{
			const chunks:Buffer[] = [];
			const status_code = res.statusCode!;
			
			res
			.on('data', c=>chunks.push(c))
			.on('error', err=>reject(err))
			.on('end', ()=>{
				const raw_data = Buffer.concat(chunks);
				let utfdata:string|undefined = undefined;
				let parsed_data:any|undefined = undefined;
				
				const result_ctnt_type = res.headers['content-type']||'';
				const divider = result_ctnt_type.indexOf(';');
				const content_type = result_ctnt_type.substring(0, divider < 0 ? result_ctnt_type.length : divider);
				if ( content_type === "application/json" ) {
					try { utfdata = raw_data.toString('utf8'); } catch(e) {}
					if ( utfdata !== undefined ) {
						try { parsed_data = JSON.parse(utfdata); } catch(e) {}
					}
				}
				else
				if ( content_type === "application/beson" ) {
					parsed_data = beson.Deserialize(raw_data);
				}
				else {
					return reject(Object.assign(new Error("Unsupported mime type returned from remote server!"), {
						code: ErrorCode.UNSUPPORTED_RESPONSE_TYPE,
						detail: { mime:content_type }
					}))
				}
				
				
				if ( parsed_data === undefined || Object(parsed_data) !== parsed_data ) {
					return reject(Object.assign(new Error("Unable to resolve response body content!"), {
						code: ErrorCode.INCORRECT_RESPONSE_FORMAT,
						status: status_code,
						data: parsed_data||utfdata||raw_data
					}));
				}

				if ( parsed_data.error !== undefined ) {
					return reject(Object.assign(new Error(parsed_data.error.message), 
						{code:ErrorCode.UNKOWN_ERROR},
						 parsed_data.error, 
						 {
							status: status_code,
							is_remote: true
						}
					));
				}
				
				return resolve(parsed_data.ret);
			});
		})
		.on('error', (err)=>reject(err))
		.on('timeout', function(this:http.ClientRequest) { this.destroy(); });

		if ( timeout > 0 ) { req.setTimeout(timeout); }
		req.end(body);
	});
}