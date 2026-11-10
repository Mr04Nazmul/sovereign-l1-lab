# SAMBA Mainnet Readiness Report

Date: 2026-11-10. Decision: **NOT READY. Private, valueless development network only.**

No production mainnet, coin sale, paid hosting, exchange application or real-money trading is authorized by this repository. Those require the owner's separate explicit approval after the relevant gates below. A working blockchain does not establish coin value, market demand, regulatory permission or security.

| Area | Present state | Required gate |
|---|---|---|
| Protocol correctness | Real four-process local consensus and EVM transfer/contract tests | Property/fuzz testing, long-duration soak, adversarial fork/equivocation/partition scenarios and upgrade/recovery rehearsals |
| Dependencies | Exact Cosmos EVM pin and npm lock; vulnerability reports retained | Triage and remediate reachable advisories, retest consensus compatibility, use supported releases and repeat scans at release time |
| Independent audit | Automated tests/scans only | Independent protocol/application/crypto-integration, genesis, wallet and infrastructure audits, remediation and verification; publish scope and exclusions |
| Validators | Four fresh signing identities, one host/operator | Multiple independent operators, regions, providers and administrative domains; documented minimum stake and concentration policy; sentries and hardware/remote signing |
| Monetary policy | 14m development coins, zero configured inflation | Owner-approved genesis allocation/vesting, issuance cap or inflation/reward model, fee policy, economic/security modeling and independent genesis review |
| Governance | Upstream SDK governance present | Document authority, proposal/voting/quorum/timelock/emergency process, upgrade accountability and community review; no unilateral hidden issuance |
| Infrastructure | Loopback-only dev processes | Approved provider budget, managed keys, staging and production separation, TLS/DNS, load tests, redundant RPC and archival indexers, backup/restore drills |
| Monitoring | Consensus status and Prometheus endpoints | Alert routing, 24/7 responsible operators, SLOs, disk/quorum/peer/reorg/anomaly monitoring and incident exercises |
| Wallet | Browser-local signing and encrypted test keystore | Specialist wallet audit, dependency/cross-site threat model, secure updates, hardware-wallet testing, user recovery and phishing education |
| Explorer/faucet | Local gateway and bounded recent address activity | Durable indexer, pagination/reconciliation, resilient RPC, public faucet abuse mitigation and separate capped signer |
| Exchanges | No contact/application or integration | Stable RPC/node releases, deposits/withdrawals and finality guidance, legal/compliance diligence and exchange-specific technical review |
| Liquidity | No pool, sale, market or price | Separate lawful business decision; independent custody/treasury controls and disclosures about volatility, illiquidity and total-loss risk |

## Japan and other jurisdictions

Obtain current advice from Japanese-qualified counsel before issuance/distribution/business operations, especially any sale, exchange, brokerage, custody or fundraising. The FSA states that cryptoasset sale/exchange, brokerage and custody businesses can require Cryptoasset Exchange Service registration. ICO treatment depends on the structure and token and can involve the Payment Services Act and/or Financial Instruments and Exchange Act. The distinction is activity-specific: development of an independent protocol is not a blanket authorization to operate a financial business. AML/CFT, sanctions, tax, consumer protection, data protection, marketing and cross-border rules require separate analysis. Citizenship/residence and any immigration restrictions on business activity should also be reviewed by appropriate professionals; this report makes no individual eligibility finding.

Sources checked 2026-11-10:
- FSA FinTech Support Desk, cryptoasset businesses and ICOs: https://www.fsa.go.jp/en/news/2018/20180717.html
- FSA current cryptoasset/electronic-payment regulatory information: https://www.fsa.go.jp/policy/virtual_currency02/

This is a technical readiness checklist and source-backed issue list, not a legal opinion. Recheck applicable rules before any launch; discussion papers/proposed reforms must not be treated as enacted law.

## Infrastructure and maintenance cost planning

No provider has been selected and no price quote is implied. Prepare a measured budget rather than an invented monthly figure:

- validator operators: host counts × required CPU/RAM/NVMe and transfer, per provider/region;
- independent RPC/sentry/seed nodes and archival databases;
- explorer indexer, backups, monitoring, TLS/DNS and protective edge services;
- incident/on-call staffing, upgrade engineering and security review;
- independent audits, legal/compliance, accounting and contingency reserve.

Use devnet CPU/RAM/disk/transaction metrics followed by public-testnet load measurements to request dated provider quotes. Agree who pays each operator. Never assume public RPC costs or chain operation is free because the source code is open-source.

## Incident response and launch gates

1. Assign incident commander, security contact and validator communications; distinguish confidential reporting from public status updates.
2. Alert on lost quorum, conflicting commits, anomalous issuance, signer compromise, RPC abuse and storage corruption. Preserve logs and agreed checkpoints.
3. For compromise, isolate affected RPC/signing infrastructure. Do not rewind signing state or duplicate a validator key. Coordinate validator-set/key changes through the specified governance/recovery mechanism.
4. Rehearse clean restore, catch-up and audited software upgrade on staging. Verify all nodes agree on genesis, version, balances, supply, parameters and finality.
5. Publish audit/remediation and economic/genesis/governance disclosures. Confirm counsel and operational signoff and obtain the owner's separate explicit launch authorization.
6. Launch is a separate future operation. No script here defaults to mainnet or allocates coins for sale.
