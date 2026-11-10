# SAMBA developer guide

SAMBA has independent consensus and native balances. EVM RPC uses chain ID 7357111, currency SAMBA (18 decimals), and local URL http://127.0.0.1:8545. Add this custom network in an EVM-compatible wallet such as MetaMask; never import a production wallet into a development application. Connecting an external wallet has not been manually certified in this environment. The included browser wallet uses ethers and password-encrypted JSON keystores.

```js
import { JsonRpcProvider, Wallet, ContractFactory, parseEther } from 'ethers';
const provider = new JsonRpcProvider('http://127.0.0.1:8545', 7357111);
// Load a development key only from your own local secret mechanism.
const signer = new Wallet(process.env.SAMBA_DEV_PRIVATE_KEY, provider);
const tx = await signer.sendTransaction({to: recipient, value: parseEther('1'), chainId: 7357111});
const receipt = await tx.wait();
console.log(receipt.hash, receipt.blockNumber);
```

Do not commit `.env` or keys. `npm run compile` compiles `contracts/Counter.sol` with pinned solc and Paris bytecode targeting. `npm run integration` assumes all four nodes and the gateway are already running and executes the real deploy-and-write test. It exports only a local faucet test key into test-process memory; it never logs the key. The result is `evidence/integration.json`.

Other developers can deploy Solidity ERC-20 tokens *on SAMBA* using normal contract tooling. Those would be application tokens; SAMBA itself is native and has no ERC-20 deployment. Contract permissioning is permissionless in this private genesis. Gas, account nonces, chain replay protection, receipts and event logs are provided by upstream EVM modules.

The explorer searches block numbers, transaction hashes and account addresses, displays balances and nonce, recent blocks and live consensus validators. Full search/receipt data comes from real RPC. Wallet history is explicitly bounded to the most recent 200 blocks; no full archival address index is claimed. A transaction hash search shows the receipt status field (1 success / 0 failure).

Public RPC, TLS domain, Internet faucet, decentralized validator onboarding and a persistent public explorer URL are **not deployed**. The private gateway deliberately rejects arbitrary Host/Origin headers. Do not remove this check to publish the dev server; design a hardened public deployment separately.
