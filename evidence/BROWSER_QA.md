# Browser QA — 2026-11-10

Tested with the managed Chrome browser against the real local gateway and four-node development network (first genesis run).

Observed:
- Live explorer showed chain ID 7357111, four validators and increasing actual block heights.
- Native transfer lookup `0xcd3b6bc4cf2ce2500b94b5d2aa9056775792a464f9d0eefd40ed36b7a43ae76b` returned block 24 and receipt status 1. This corresponds to `integration-first-run.json`.
- Create account generated a new local address; displayed zero balance.
- Download encrypted JSON keystore completed; wallet locked; importing that file with its test password reopened the same address locally.
- Faucet rejected a second claim from an IP whose hourly quota had already been used by integration tests. The successful faucet/native-balance test is separately recorded in integration evidence.
- A low gateway request budget initially interrupted bounded history scanning. Increased the local budget to 600/minute, restarted and verified transaction lookup succeeds. New network-load/adversarial limits still need public-service design.
- Screenshot `SAMBA-explorer.png` shows actual height 205 from the first genesis run, not a promised current/public block height.

No private key, seed or encrypted keystore is committed. Manual browser send/receive, mobile viewport, external wallet and comprehensive browser security testing are not certified by these checks. Local automated integration separately covers signed transfers and encryption round trips.
