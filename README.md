# TIINYRPC #
This module is designed to establish an rpc server that can accept json or beson(json-like binary format which can encode raw binary data) as request payload.

## Install ##
```bash
npm install tiinyrpc
```

## Usage ##
### Server ###
```javascript
const TiinyRPC = require('tiinyrpc');

// Create a server instance
const MAX_PAYLOAD_SIZE = ; // 10MB
const server = TRPC.Server.init({
	max_body: MAX_PAYLOAD_SIZE,
	audit:(req, p)=>new Promise((res)=>{
		console.log("Audit1:", req.headers, p.call);
		setTimeout(()=>res(true), 2000)
	})
})
.handle({
	'hi': (name:string)=>{
		return `Hi! ${name}!`;
	}
})
.scope({
	audit:(req, p)=>{
		console.log("Audit2:", req.headers, p.call);
		return false;
	}
})
.handle('no', ()=>{
	return `You'll never reach here...!`;
})
.handle('echo', ()=>{
	return `You'll never reach here...!`;
})
.scope({audit:null})
.unhandle('echo')
.handle({
	echo: (data:any)=>{
		return data;
	}
});

server.listen({host:'127.0.0.1', port:3036})
.then((r)=>console.log("Server is not listening...", r));
```




### Client ###
```javascript
const TiinyRPC = require('tiinyrpc');

const user_identifier = 'fdsafdsafdsafdsafdsafdasfdas';
const base_client = TiinyRPC.Client.init({
	url:'http://127.0.0.1:1234',
	timeout:3_000,
	headers:{
		'X-User-Identifier': user_identifier
	}
});

base_client.invoke('syncfunc', 'arg1', 'arg2', 'arg3').then(async(result)=>{
	console.log(result);
}).catch((error)=>console.error(error));
```