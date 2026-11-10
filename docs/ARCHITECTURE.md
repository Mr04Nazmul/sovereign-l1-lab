# SAMBA architecture and technology decision

Research checked 2026-11-10. This is a sovereign development chain: it has no Ethereum/Sepolia execution or settlement dependency. The EVM runs within its Cosmos SDK application. Other chains are not required for block finality.

| Component | Architecture, maintenance and license | Decision |
|---|---|---|
| Cosmos SDK | Modular sovereign application, bank/auth/staking/distribution/slashing/governance; core Apache-2.0, enterprise components may differ. Active Cosmos Labs development. | Native ledger and PoS application. |
| Cosmos EVM | Ethereum transactions, Solidity and JSON-RPC integrated into Cosmos SDK; Apache-2.0 framework, dependencies include LGPL geth code. Active but upstream README explicitly says v0.x is not stable until audit/stability work is complete. | Most direct path to independent PoS EVM devnet. Pin v0.7.4 commit `ba66d3106a52f84b1c1ede8d9683c2df98d742ef`. |
| CometBFT | Apache-2.0 Byzantine fault tolerant P2P, proposal/vote/commit, synchronization; stake-weighted validator set supplied by SDK. Active upstream. | Established consensus implementation, not newly invented consensus. |
| Polkadot SDK | Standalone solochains possible; runtime FRAME/pallet primitives mostly Apache-2.0; client GPL-3.0 with classpath exception. Active Parity development. EVM requires additional compatibility integration. Parachain settlement would not meet this project's independence requirement. | Viable alternative, higher integration surface for this EVM brief. |
| Ethereum execution clients (geth) | Mature EVM execution/P2P but modern Ethereum PoS also requires a consensus client; execution client alone is not a complete independent PoS chain. geth libraries LGPL-3.0, binaries GPL-3.0. | Use the compatible geth dependency already integrated by Cosmos EVM. |
| Besu QBFT | Maintained EVM client, Apache-2.0; easy four-validator network, QBFT is proof of authority rather than staking-based PoS. | Did not substitute PoA for requested PoS. |
| ethers / solc | Established signing/JSON-RPC/encrypted-keystore library and Solidity compiler. Exact npm lock, audited dependencies. | Browser wallet, tests and contract toolchain. |

## Source provenance

Build scripts fetch and verify an exact upstream commit into ignored `.vendor/cosmos-evm`. The node is the upstream `evmd` application configured as SAMBA, not a new unaudited consensus rewrite. The monorepo contains SAMBA's genesis generator, process management, gateway, portal, contract and integration tests. `evmd` remains the binary name intentionally. All upstream copyright and license notices remain in the fetched source. Original monorepo orchestration is Apache-2.0; see LICENSE and THIRD_PARTY.md.

Upstream's example multi-validator generator includes public demo mnemonics. SAMBA deliberately does not use that generator: each `init` makes new validator keys and a separate faucet account. No fixed private keys are tracked.

## Execution path

An ethers wallet signs locally with secp256k1. The EIP-155 transaction names chain ID 7357111, nonce, native value and gas. Ethereum JSON-RPC submits to the Cosmos EVM mempool. CometBFT reaches a greater-than-two-thirds stake commit, and the SDK applies auth/bank/staking/EVM state changes. The EVM indexer serves receipts and block/transaction history. Native SAMBA is an SDK bank denomination (`asamba`, 18 decimals), not an ERC-20 issuance. No bridge is necessary.

Four processes have separate keys, databases, ABCI/EVM application instances, RPC endpoints and P2P ports. They share one host and operator: this proves multi-process consensus, not geographic or operator decentralization. All listen addresses are loopback. Peering allows duplicate IPs only for this local harness.

## Security boundary

The local gateway exposes a fixed RPC method allowlist, body size/time limits, strict host/origin checks and no key management RPC. Browser accounts never send a seed/private key to it. The faucet alone signs server-side from a separate funded test key. Its hourly address/IP quota is in SQLite, with a global 20/hour cap and serialized sends. This is not adequate Internet Sybil protection; public deployment requires a revised threat model, CAPTCHA/proof-of-work or authenticated quotas, a dedicated signing service, TLS and a reverse proxy.

State sync snapshots, distributed validator operators, public networking, production wallet recovery UX, exhaustive protocol adversarial tests and an independently audited release are not implemented or certified here.

## Primary references

- https://github.com/cosmos/evm/tree/v0.7.4
- https://github.com/cosmos/evm/blob/v0.7.4/LICENSE
- https://github.com/cosmos/evm/blob/v0.7.4/NOTICE
- https://github.com/cosmos/cosmos-sdk
- https://github.com/cometbft/cometbft
- https://github.com/paritytech/polkadot-sdk/blob/master/substrate/README.md
- https://geth.ethereum.org/docs/developers/geth-developer/contributing
- https://besu.hyperledger.org/private-networks/how-to/configure/consensus/qbft
