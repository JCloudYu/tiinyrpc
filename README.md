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
const server = TiinyRPC.Server.init({
	asyncfunc: async function(){
		return new Promise((res)=>setTimeout(()=>res(true), 5000));
	},
	syncfunc: function() {
		return true;
	}
}, {
	// max body size is 10 MB
	max_body:10*1024*1024,

	// request auditing function
	audit: function(req, p) {
		// This function allows developers to access additional info 
		// such as headers or ips

		// Return true to accept the request, reject otherwise
		return true;
	}
});

server.listen({host:'0.0.0.0', port:1234})
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