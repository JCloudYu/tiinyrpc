import * as TRPC from '../index.js';

Promise.resolve().then(async()=>{
	const server = TRPC.Server.init({
		max_body: 2 * 1024 * 1024,
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


	
	const info = await server.listen({host:'127.0.0.1', port:3036});
	console.log(info);




	const client = TRPC.Client.init({url:'http://127.0.0.1:3036', timeout:0})
	setTimeout(()=>{
		Promise.resolve().then(async()=>{
			await client.invoke('hi', "JCloudYu").then(async(r)=>{
				console.log("Success(hi):", r);
			}).catch((e)=>console.error("Error(hi):", e));
			console.log("");
			await client.invoke('no').then(async(r)=>{
				console.log("Success(no):", r);
			}).catch((e)=>console.error("Error(no):", e));
			console.log("");
			await client.invoke('echo', {a:1, b:2, c:3}).then(async(r)=>{
				console.log("Success(echo,json):", r);
			}).catch((e)=>console.error("Error(echo,json):", e));
			console.log("");
			await client.mutate({use_beson:true}).invoke('echo', {
				a:1, b:2, c:3, d:new Uint8Array((new Uint32Array([0x01_10_11_00])).buffer)
			}).then(async(r)=>{
				console.log("Success(echo,beson):", r);
			}).catch((e)=>console.error("Error(echo,beson):", e));
						
			await server.release();
		});
	}, 1000);
});