# Security status

SAMBA is a development network, not an audited production system. Do not use real assets, production keys or sensitive personal data.

The initial binary scan (`evidence/govulncheck.txt`, govulncheck v1.1.4, binary mode, Go 1.26.10) reports **46 symbol-level advisories across 11 modules**, plus additional module findings. This is a blocking result for public/production deployment. Binary mode detects included symbols, not request-level exploitability or a complete call graph; triage is still required. Findings include networking/crypto/compression dependencies, CometBFT and Cosmos SDK advisories. A newer major CometBFT version cannot be dropped into a pinned SDK without compatibility analysis and regression testing. No advisory has been silently suppressed and no professional audit is claimed.

Npm audit originally found ethers/ws and solc/tmp advisories. We upgraded ethers to 6.17.0 and solc to 0.8.38 and pinned the fixed transitive tmp 0.2.7 using an override. The final stored npm audit reports zero findings at scan time; absence of findings does not prove security. Rebuild/retest after upgrades.

## Implemented defenses

Established upstream signing/consensus/verification, EIP-155 chain ID, account nonces, fresh dev validator/faucet keys, loopback listeners, disabled personal/debug/admin RPC, disabled profiling, strict gateway Host and Origin checks, JSON body/time/rate limits, serialized native faucet transfers, durable hourly quotas and no browser seed/private-key backend transmission. Client code uses textContent for chain data, no third-party runtime scripts, no private-key storage in localStorage and a restrictive CSP. Password-encrypted JSON keystore export/import uses ethers' established implementation.

## Known limitations and unresolved work

- All validators are controlled by one development operator and host; there is no decentralized production network.
- Unencrypted `test` keyring is restricted to ignored local `.devnet`, unsuitable for public validators. Faucet key is loaded only into its process memory. JavaScript secret zeroization cannot be guaranteed.
- Faucet quotas are local anti-abuse measures, not Internet Sybil resistance. Failed/uncertain broadcasts need stronger reconciliation before public use. NonceManager and serialized requests handle the local workflow.
- The portal and SDK-integration tests do not replace a browser/wallet audit, penetration test, consensus audit or secure release process.
- Binary source is pinned upstream; source provenance/license notices are retained. Upstream v0.x stability/audit warning applies.
- Repeated process-stop/restart tests are not adversarial partitions, double-sign/equivocation fuzzing or exhaustive Byzantine testing.
- Comprehensive signature mutation fuzzing, state-sync snapshots and database corruption recovery are not certified. The test suite verifies actual rejected malformed/wrong-chain/unfunded/replayed transactions and successful signed state transitions.
- Public RPC, reverse proxy, TLS, remote signers, independent validators and long-running hosted services have not been provisioned.

## Reporting

No security inbox or private advisory channel has been configured. Do not post keys, seeds or exploit details to a public issue. Arrange a confidential channel with the project owner before disclosure. Suspected key compromise requires stopping the affected isolated devnet and replacing keys/genesis only in a new development network; mainnet incident handling requires its own approved governance procedure.
