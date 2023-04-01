import * as TRPC from '../index.js';

Promise.resolve().then(async()=>{
	const server = TRPC.Server.init({
		hi:(name:string)=>{
			return `Hi! ${name}!`;
		},
		no:()=>{
			return `You'll never reach here...!`;
		}
	}, {max_body:1024 * 1024, audit:(req, p)=>new Promise((res)=>{
		setTimeout(()=>{
			console.log(req.headers);
			res(p.call === "hi" ? true : {a:1, b:2, c:3});
		}, 2000)
		return true;
	})});
	
	
	const info = await server.listen({host:'127.0.0.1', port:3036});
	console.log(info);




	const client = TRPC.Client.init({url:'http://127.0.0.1:3036', timeout:0})
	setTimeout(()=>{
		Promise.resolve().then(async()=>{
			await client.invoke('hi', "JCloudYu").then(async(r)=>{
				console.log(r);
			});
		
			await client.invoke('no').then(async(r)=>{
				console.log(r);
			}).catch((e)=>console.error(e));
						
			await server.release();
		});
	}, 1000);
});