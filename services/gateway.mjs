import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {JsonRpcProvider, Wallet, NonceManager, parseEther} from 'ethers';
import {CHAIN_ID,validateRpc,validAddress} from './guards.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.SAMBA_PORT || 8080);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid port');
const rpc='http://127.0.0.1:8545';
const provider=new JsonRpcProvider(rpc,CHAIN_ID,{staticNetwork:true});
const db=new DatabaseSync(path.resolve(root,process.env.SAMBA_FAUCET_DB || '.devnet/faucet.sqlite'));
db.exec('CREATE TABLE IF NOT EXISTS claims (ip TEXT, address TEXT, ts INTEGER)');
let signer;
function faucetSigner(){
  if (!signer){
    // The CLI output is held only in process memory; never log it or send it to clients.
    let key=execFileSync(path.join(root,'bin/evmd'),['keys','unsafe-export-eth-key','faucet','--home',path.join(root,'.devnet/node0'),'--keyring-backend','test'],{input:'y\n',encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
    signer=new NonceManager(new Wallet(key.startsWith('0x')?key:'0x'+key,provider)); key='';
  }
  return signer;
}
let queue=Promise.resolve();
async function claim(ip,address){
  const now=Date.now(),since=now-3600000;
  if(db.prepare('SELECT count(*) AS n FROM claims WHERE ts>? AND (ip=? OR address=?)').get(since,ip,address).n>0) throw Error('One request per address and IP per hour');
  if(db.prepare('SELECT count(*) AS n FROM claims WHERE ts>?').get(since).n>=20) throw Error('Hourly faucet limit reached');
  const chain=await provider.send('eth_chainId',[]); if(BigInt(chain)!==BigInt(CHAIN_ID)) throw Error('Chain mismatch');
  const wallet=faucetSigner();
  let tx;
  try { tx=await wallet.sendTransaction({to:address,value:parseEther('10'),gasLimit:21000,gasPrice:await provider.send('eth_gasPrice',[])}); }
  catch(e){wallet.reset();throw Error('Faucet transfer failed');}
  db.prepare('INSERT INTO claims VALUES (?,?,?)').run(ip,address,now);
  return {hash:tx.hash,amount:'10',symbol:'SAMBA'};
}
const calls=new Map();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'};
function reply(res,status,data){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));}
async function read(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>131072)throw Error('Request too large');}return JSON.parse(s);}
const server=http.createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  const ip=req.socket.remoteAddress;
  const host=req.headers.host;
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host)) return reply(res,403,{error:'Invalid host'});
  if(req.headers.origin && ![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin))return reply(res,403,{error:'Origin rejected'});
  const minute=Math.floor(Date.now()/60000), previous=calls.get(ip);
  const count=previous?.minute===minute?previous.count+1:1;calls.set(ip,{minute,count});
  if(count>600)return reply(res,429,{error:'Rate limit'});
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.method==='POST' && url.pathname==='/rpc'){
      const body=validateRpc(await read(req));
      const upstream=await fetch(rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      return reply(res,200,await upstream.json());
    }
    if(req.method==='POST' && url.pathname==='/faucet'){
      const {address}=await read(req);const target=validAddress(address);
      const work=queue.then(()=>claim(ip,target));queue=work.catch(()=>{});
      return reply(res,200,await work);
    }
    if(req.method==='GET' && url.pathname==='/network'){
      const [s,v]=await Promise.all(['status','validators'].map(async name=>{
        const r=await fetch('http://127.0.0.1:26657/'+name,{signal:AbortSignal.timeout(5000)});return (await r.json()).result;
      }));
      return reply(res,200,{chainId:CHAIN_ID,name:'SAMBA',symbol:'SAMBA',status:s,validators:v});
    }
    if(req.method!=='GET')return reply(res,405,{error:'Method not allowed'});
    const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/ethers.js':'ethers.js'};
    const filename=files[url.pathname];if(!filename)return reply(res,404,{error:'Not found'});
    const file=path.join(root,'apps/portal',filename);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]});fs.createReadStream(file).pipe(res);
  }catch(e){reply(res,400,{error:e.message.startsWith('One request')||e.message==='Hourly faucet limit reached'?e.message:'Request failed; verify the local network is running'});}
});
server.requestTimeout=20000;server.headersTimeout=10000;
server.listen(port,'127.0.0.1',()=>console.log(`SAMBA portal: http://127.0.0.1:${port} (private devnet only)`));
