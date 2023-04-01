import http from 'http';
import https from 'https';
import {TrimId} from "./trimid.js";


const DEFAULT_TIMEOUT = 5_000;


export interface ClientInitOptions {
	url:string;
	timeout?:number;
	headers?:http.OutgoingHttpHeaders;
};



interface ClientPrivates {timeout:number; url:string; headers:http.OutgoingHttpHeaders;};
const _Client:WeakMap<Client, ClientPrivates> = new WeakMap();

export class Client {
	static init(options:ClientInitOptions):Client { return new Client(options); }

	constructor(options:ClientInitOptions) {
		_Client.set(this, {
			url:options.url,
			timeout:typeof options.timeout === "number" ? options.timeout : DEFAULT_TIMEOUT,
			headers: Object.assign({}, options.headers)
		});
	}

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
		const {headers, timeout, url} = _Client.get(this)!;
		return TRPCCall<ReturnType>({headers, timeout, url}, call, args);
	}
}




interface ReqInfo { url?:string; headers?:http.OutgoingHttpHeaders; timeout?:number; }
function TRPCCall<ReturnType=any>(url:string, call:string, args:any[]):Promise<ReturnType>;
function TRPCCall<ReturnType=any>(info:ReqInfo, call:string, args:any[]):Promise<ReturnType>
function TRPCCall<ReturnType=any>(arg1:string|ReqInfo, call:string, args:any[]):Promise<ReturnType> {
	let timeout:number, headers:http.OutgoingHttpHeaders, url:string;
	if ( typeof arg1 === "string" ) {
		url = arg1;
		headers = {};
		timeout = 0;
	}
	else {
		if ( typeof arg1.url !== "string" || !arg1.url ) { throw new Error("Field url is required!"); }

		url = arg1.url;
		timeout = arg1.timeout||0;
		headers = arg1.headers||{};
	}

	return new Promise<ReturnType>((resolve, reject)=>{
		const _http = url.substring(0, 6) === 'https:' ? https : http;
		const _headers = {...headers};
		delete _headers['content-type'];
		delete _headers['Content-Type'];
		_headers['Content-Type'] = 'application/json';
		

		const body = Buffer.from(JSON.stringify({rpc:"1.0", id:TrimId(), call, args}));
		
		const req = _http.request(url, {method:'POST', headers:_headers}, (res)=>{
			const chunks:Buffer[] = [];
			const status_code = res.statusCode!;
			
			res
			.on('data', c=>chunks.push(c))
			.on('error', err=>reject(err))
			.on('end', ()=>{
				const raw_data = Buffer.concat(chunks);
				let utfdata:string|undefined = undefined;
				let jsondata:any|undefined = undefined;
				
				try { utfdata = raw_data.toString('utf8'); } catch(e) {}
				if ( utfdata !== undefined ) {
					try { jsondata = JSON.parse(utfdata); } catch(e) {}
				}
				
				
				if ( jsondata === undefined || Object(jsondata) !== jsondata ) {
					return reject(Object.assign(new Error("Unable to resolve response body content!"), {
						code: 'error#incorrect-response-format' as const,
						status: status_code,
						data: jsondata||utfdata||raw_data
					}));
				}

				if ( jsondata.error !== undefined ) {
					return reject(Object.assign(new Error(jsondata.error.message), jsondata.error, {
						status: status_code,
						is_remote: true
					}));
				}
				
				return resolve(jsondata.ret);
			});
		})
		.on('error', (err)=>reject(err))
		.on('timeout', function(this:http.ClientRequest) { this.destroy(); });

		if ( timeout > 0 ) { req.setTimeout(timeout); }
		req.end(body);
	});
}