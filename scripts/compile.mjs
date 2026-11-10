import fs from 'node:fs';
import solc from 'solc';
import {build} from 'esbuild';
const input={language:'Solidity',sources:{'Counter.sol':{content:fs.readFileSync('contracts/Counter.sol','utf8')}},settings:{evmVersion:'paris',optimizer:{enabled:true,runs:200},outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
const out=JSON.parse(solc.compile(JSON.stringify(input)));
if(out.errors?.some(e=>e.severity==='error'))throw Error('Solidity compile failed');
fs.writeFileSync('contracts/Counter.json',JSON.stringify(out.contracts['Counter.sol'].Counter,null,2)+'\n');
await build({stdin:{contents:'export * from "ethers";',resolveDir:process.cwd()},bundle:true,format:'esm',minify:true,outfile:'apps/portal/ethers.js'});
console.log('Compiled Counter and bundled wallet library');
