# SAMBA development coin configuration

Blockchain name: **SAMBA**, selected by the owner. Symbol: **SAMBA**, provisional pending explicit symbol selection. This configuration is for a private development network only and does not decide a future mainnet issuance policy.

- Cosmos chain ID and EIP-155 chain ID: `7357111`. This local choice is not a globally registered/reserved public chain ID. Check for collisions before public use.
- Native base denomination: `asamba`; display denomination: `samba`; 18 decimals.
- Genesis test budget: four fresh validator accounts, each 1,000,000 SAMBA; one separate faucet account, 10,000,000 SAMBA. Total 14,000,000 test SAMBA.
- Each validator self-bonds 10,000 SAMBA from its allocation. Staking moves coins into module accounts; it does not create supply.
- Inflation starts at zero; min/max and annual rate change are zero. This disables development inflation rather than prescribing permanent mainnet tokenomics.
- Native transfer gas and contract gas are paid in SAMBA. Base fee is enabled. Fees may be burned/distributed according to the pinned SDK/EVM modules, so zero mint inflation does not mean supply is exactly constant. Test assertions verify actual fees charged.
- SDK staking/distribution/slashing/governance modules remain available. No guaranteed reward/APR is represented. Governance can change parameters; any mainnet monetary policy must govern upgrades and parameter authority explicitly.
- Supply is reported by `bin/evmd query bank total-supply --node tcp://127.0.0.1:26657 -o json`; account balances by `eth_getBalance` and SDK bank queries.
- Genesis allocations and a SHA-256 digest can be inspected locally under `.devnet/node0/config/genesis.json`. Share only the genesis/public addresses, never the full `.devnet` directory.

Every initialization creates a different genesis and random keys. A future public testnet must distribute one agreed genesis and chain ID to all operators. Test balances have no promised financial value, sale or redemption.
