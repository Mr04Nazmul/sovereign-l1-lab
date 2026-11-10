import {isAddress} from 'ethers';
export const CHAIN_ID = 7357111;
export const methods = new Set(['eth_chainId','eth_blockNumber','eth_getBalance','eth_getTransactionCount','eth_getBlockByNumber','eth_getBlockByHash','eth_getTransactionByHash','eth_getTransactionReceipt','eth_sendRawTransaction','eth_call','eth_estimateGas','eth_gasPrice','eth_getCode','net_version','web3_clientVersion']);
export function validateRpc(body) {
  if (!body || Array.isArray(body) || body.jsonrpc !== '2.0' || !methods.has(body.method) || !Array.isArray(body.params) || body.params.length > 4) throw Error('Unsupported RPC request');
  if (JSON.stringify(body).length > 131072) throw Error('Request too large');
  if (body.id !== undefined && typeof body.id !== 'string' && typeof body.id !== 'number') throw Error('Invalid RPC id');
  if (body.method === 'eth_sendRawTransaction' && (!/^0x[0-9a-f]+$/i.test(body.params[0] || '') || body.params[0].length > 65536)) throw Error('Invalid signed transaction');
  if (['eth_getBalance','eth_getCode','eth_getTransactionCount'].includes(body.method) && !isAddress(body.params[0] || '')) throw Error('Invalid address');
  if (['eth_getTransactionByHash','eth_getTransactionReceipt','eth_getBlockByHash'].includes(body.method) && !/^0x[0-9a-f]{64}$/i.test(body.params[0] || '')) throw Error('Invalid hash');
  return body;
}
export function validAddress(s) { if (!isAddress(s || '')) throw Error('Invalid address'); return s.toLowerCase(); }
