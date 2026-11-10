import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {JsonRpcProvider,Wallet,ContractFactory,parseEther,formatEther,keccak256,decodeRlp,encodeRlp} from 'ethers';
const CHAIN=7357111;
const providers=Array.from({length:4},(_,i)=>new JsonRpcProvider('http://127.0.0.1:'+(8545+i*10),CHAIN,{staticNetwork:true,batchMaxCount:1,cacheTimeout:-1}));
const p=providers[0],report={startedAt:new Date().toISOString(),chainId:CHAIN,tests:[],transactions:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,timeout=90000){const end=Date.now()+timeout;let error;while(Date.now()<end){try{const x=await fn();if(x)return x;}catch(e){error=e;}await pause(500);}throw Error('Condition timed out'+(error?' ('+error.code+')':''));}
async function test(name,fn){const start=Date.now();await fn();report.tests.push({name,status:'passed',durationMs:Date.now()-start});console.log('PASS '+name);}
async function rpc(method,params=[],node=0){return providers[node].send(method,params);}
async function receipt(hash){return wait(async()=>{const r=await p.getTransactionReceipt(hash);return r&&r;});}
async function rejectRaw(raw){let rejected=false;try{await rpc('eth_sendRawTransaction',[raw]);}catch{rejected=true;}assert(rejected,'invalid transaction must be rejected');}
function key(name){const raw=execFileSync('bin/evmd',['keys','unsafe-export-eth-key',name,'--home','.devnet/node0','--keyring-backend','test'],{encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();assert(/^[0-9A-Fa-f]{64}$/.test(raw));return new Wallet('0x'+raw,p);}
function control(action,node){execFileSync('python3',['scripts/devnet.py',action,String(node)],{stdio:'pipe'});}
async function comet(node,route){const r=await fetch(`http://127.0.0.1:${26657+node*10}/${route}`,{signal:AbortSignal.timeout(3000)});return (await r.json()).result;}
try{
 await test('four real nodes produce blocks and report independent chain ID',async()=>{
  const initial=await wait(async()=>{try{return (await p.getBlockNumber())+1;}catch{return false;}},120000);
  await wait(async()=>{const heights=await Promise.all(providers.map(x=>x.getBlockNumber()));return heights.every(h=>h>=Math.max(3,initial+2));},120000);
  for(let i=0;i<4;i++)assert.equal(BigInt(await rpc('eth_chainId',[],i)),BigInt(CHAIN));
  const genesis=fs.readFileSync('.devnet/node0/config/genesis.json');
  for(let i=1;i<4;i++)assert(genesis.equals(fs.readFileSync(`.devnet/node${i}/config/genesis.json`)));
  report.genesisHash=keccak256(genesis);report.validatorCount=(await comet(0,'validators')).total;assert.equal(report.validatorCount,'4');
 });
 const faucet=key('faucet'),receiver=Wallet.createRandom().connect(p);
 const gasPrice=BigInt(await rpc('eth_gasPrice'));
 const base={chainId:CHAIN,type:0,gasLimit:21000,gasPrice};
 await test('signed native transfer charges fee and records receipt across nodes',async()=>{
  const before=await p.getBalance(faucet.address),nonce=await p.getTransactionCount(faucet.address);
  const raw=await faucet.signTransaction({...base,to:receiver.address,value:parseEther('2'),nonce});
  const hash=await rpc('eth_sendRawTransaction',[raw]);const r=await receipt(hash);assert.equal(r.status,1);
  assert.equal(await p.getBalance(receiver.address),parseEther('2'));
  assert.equal(before-await p.getBalance(faucet.address),parseEther('2')+r.fee);
  await wait(async()=>{const receipts=await Promise.all(providers.map(n=>n.getTransactionReceipt(hash)));return receipts.every(x=>x&&x.blockHash===r.blockHash);});
  report.transactions.push({kind:'native-transfer',hash,blockNumber:r.blockNumber,blockHash:r.blockHash,fee:r.fee.toString()});
 });
 await test('wrong-chain replay, unsigned payload, and insufficient balance are rejected',async()=>{
  const nonce=await p.getTransactionCount(faucet.address);
  await rejectRaw(await faucet.signTransaction({...base,chainId:CHAIN+1,to:receiver.address,value:1n,nonce}));
  await rejectRaw('0xdeadbeef');
  const forged=decodeRlp(await faucet.signTransaction({...base,to:receiver.address,value:1n,nonce}));forged[7]='0x';await rejectRaw(encodeRlp(forged));
  const empty=Wallet.createRandom();await rejectRaw(await empty.signTransaction({...base,to:receiver.address,value:parseEther('1'),nonce:0}));
 });
 await test('nonce reuse and competing double spend cannot execute twice',async()=>{
  const nonce=await p.getTransactionCount(faucet.address),before=await p.getBalance(receiver.address);
  const raw=await faucet.signTransaction({...base,to:receiver.address,value:parseEther('1'),nonce});
  const hash=await rpc('eth_sendRawTransaction',[raw]);await receipt(hash);
  await rejectRaw(raw);
  await rejectRaw(await faucet.signTransaction({...base,to:Wallet.createRandom().address,value:parseEther('1'),nonce}));
  assert.equal(await p.getBalance(receiver.address),before+parseEther('1'));
  report.transactions.push({kind:'nonce-test-transfer',hash});
 });
 await test('Solidity deployment, state mutation, logs and receipt',async()=>{
  const artifact=JSON.parse(fs.readFileSync('contracts/Counter.json'));
  const factory=new ContractFactory(artifact.abi,'0x'+artifact.evm.bytecode.object,receiver);
  const contract=await factory.deploy({gasPrice});await contract.waitForDeployment();
  assert.notEqual(await p.getCode(await contract.getAddress()),'0x');
  const tx=await contract.set(42,{gasPrice});const r=await tx.wait();assert.equal(r.status,1);assert.equal(await contract.value(),42n);assert.equal(r.logs.length,1);
  report.contract=await contract.getAddress();report.transactions.push({kind:'contract-deploy',hash:contract.deploymentTransaction().hash},{kind:'contract-call',hash:tx.hash,blockNumber:r.blockNumber});
 });
 await test('encrypted wallet keystore roundtrip and wrong-password rejection',async()=>{
  const encrypted=await receiver.encrypt('only-a-test-password-7357111');assert(!encrypted.includes(receiver.privateKey.slice(2)));
  const reopened=await Wallet.fromEncryptedJson(encrypted,'only-a-test-password-7357111');assert.equal(reopened.address,receiver.address);
  await assert.rejects(Wallet.fromEncryptedJson(encrypted,'wrong-password'));
 });
 await test('gateway explorer, RPC validation and persistent faucet rate limit',async()=>{
  await wait(async()=>{const r=await fetch('http://127.0.0.1:8080/network');return r.ok;});
  const html=await (await fetch('http://127.0.0.1:8080/')).text();assert(html.includes('SAMBA'));
  const bad=await fetch('http://127.0.0.1:8080/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',method:'personal_unlockAccount',params:[],id:1})});assert.equal(bad.status,400);
  const address=Wallet.createRandom().address;
  const request=()=>fetch('http://127.0.0.1:8080/faucet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address})});
  const claim=await request(),data=await claim.json();assert.equal(claim.status,200,JSON.stringify(data));await receipt(data.hash);assert.equal(await p.getBalance(address),parseEther('10'));
  const duplicate=await request();assert.equal(duplicate.status,400);assert.match((await duplicate.json()).error,/One request/);
  report.transactions.push({kind:'faucet',hash:data.hash});
 });
 await test('one validator outage retains greater than two-thirds quorum',async()=>{
  control('stop',3);const h=await p.getBlockNumber();await wait(async()=>await p.getBlockNumber()>=h+3);
 });
 await test('loss of two validators halts finalization; recovery resumes consensus',async()=>{
  control('stop',2);await pause(3500);const before=await p.getBlockNumber();await pause(7000);assert.equal(await p.getBlockNumber(),before);
  report.quorumHaltHeight=before;control('start',2);await wait(async()=>await p.getBlockNumber()>before,90000);
 });
 await test('offline validator catches up with matching block hash',async()=>{
  control('start',3);const target=await p.getBlockNumber();
  await wait(async()=>await providers[3].getBlockNumber()>=target,90000);
  const blocks=await Promise.all(providers.map(x=>x.getBlock(target)));assert(blocks.every(b=>b.hash===blocks[0].hash));
  report.synchronizedHeight=target;report.synchronizedBlockHash=blocks[0].hash;
 });
 report.finalHeights=await Promise.all(providers.map(x=>x.getBlockNumber()));
 report.totalSupply=JSON.parse(execFileSync('bin/evmd',['query','bank','total-supply','--node','tcp://127.0.0.1:26657','--output','json'],{encoding:'utf8',stdio:['pipe','pipe','pipe']}));
 fs.writeFileSync('evidence/network-status.ndjson',execFileSync('python3',['scripts/devnet.py','status'],{encoding:'utf8'}));
 report.completedAt=new Date().toISOString();report.status='passed';
}catch(e){report.status='failed';report.failure={message:e.error?.message||e.shortMessage||e.message,code:e.code};console.error('FAIL',report.failure);process.exitCode=1;}
finally{fs.writeFileSync('evidence/integration.json',JSON.stringify(report,null,2)+'\n');for(const x of providers)x.destroy();}
