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
const MAX_PAYLOAD_SIZE = 10*1024*1024; // 10MB
const server = TiinyRPC.Server.init({
	asyncfunc: async function(){
		return new Promise((res)=>setTimeout(()=>res(true), 5000));
	},
	syncfunc: function() {
		return true;
	}
}, {max_body:MAX_PAYLOAD_SIZE});

server.listen({host:'0.0.0.0', port:1234})
.then((r)=>console.log("Server is not listening...", r));
```