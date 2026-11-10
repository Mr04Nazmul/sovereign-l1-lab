# Running and operating the SAMBA private devnet

## Requirements and quick start

Linux, Git, a current compatible Go toolchain (upstream requires Go >=1.25.9), CGO/GCC, Python >=3.11, Node >=24/npm. Go 1.26.10 and Node 24.22.1 were used during this implementation. Allow several GB of Go build/cache disk and sufficient compilation memory. Compilation may take several minutes.

```bash
npm ci --ignore-scripts
bash scripts/build.sh
npm run compile
python3 scripts/devnet.py init
# Run checks, start a local gateway, and stop nodes when done:
bash scripts/run-checks.sh
# Interactive session: keep this shell/process alive
python3 scripts/devnet.py run
# In another terminal, in the same machine/network namespace:
npm run portal
```

Open http://127.0.0.1:8080. Create an account, use a 12+ character password to download an encrypted JSON keystore, request test coins, review and confirm a transfer. The keystore password is never submitted to the gateway. Loss of an unsaved key or password means loss of that dev account. Browser key management is development-only and cannot guarantee deletion from JavaScript memory.

`init` refuses to overwrite existing data. Move the entire ignored `.devnet` to a protected backup location if a new devnet is wanted. Never reuse devnet keys on a public chain. `keyring-backend test` stores unencrypted local key material; `.devnet` is mode 0700 but does not protect against a compromised machine/user.

## Local ports

| Process | P2P | Consensus RPC | EVM HTTP | EVM WS | Prometheus |
|---|---:|---:|---:|---:|---:|
| Validator 0 | 26656 | 26657 | 8545 | 8546 | 26660 |
| Validator 1 | 26666 | 26667 | 8555 | 8556 | 26670 |
| Validator 2 | 26676 | 26677 | 8565 | 8566 | 26680 |
| Validator 3 | 26686 | 26687 | 8575 | 8576 | 26690 |

Everything binds loopback. Portal/gateway: 8080. REST/gRPC/profiling are disabled. Example RPC:

```bash
curl -s http://127.0.0.1:8545 -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}'
python3 scripts/devnet.py status
python3 scripts/devnet.py stop 3
python3 scripts/devnet.py start 3
```

Network access in some managed development environments is isolated per command; in that case start nodes, gateway and tests together with `run-checks.sh`. A successful local test does not create a persistent publicly accessible endpoint.

## Validator registration and staking

Development allocations and self-bonds are explicit in `config/devnet.json`. Frontend/gateway identifiers are currently fixed to this devnet; changing a chain ID also requires updating and retesting those integrations.

Genesis validators are real SDK `MsgCreateValidator` transactions signed with their individual account keys and collected into the shared genesis. Inspect `app_state.genutil.gen_txs` and `/validators` to see the set.

For additional validators, initialize a new node, securely transfer the common genesis, configure peers, synchronize and create a funded staking account using an encrypted `file` or hardware keyring. Obtain the consensus public key with `bin/evmd comet show-validator --home <new-home>`. Build the SDK create-validator JSON with that public key, self delegation in `asamba`, moniker, commission rate/max/max-change and minimum self delegation. Then run:

```bash
bin/evmd tx staking create-validator validator.json \
  --from <account> --home <new-home> --keyring-backend file \
  --chain-id 7357111 --node tcp://127.0.0.1:26657 \
  --gas auto --gas-adjustment 1.4 --gas-prices 1000000000asamba
bin/evmd query staking validators --node tcp://127.0.0.1:26657 -o json
```

Joining a *new* validator through this CLI path is supported by upstream but is not separately certified by our four-genesis-validator test. Never copy validator signing keys to two live nodes. Back up the signing state and keys consistently to avoid double signing.

## Monitoring, outages and recovery

Monitor `/status` chain ID, height progress, catching_up and validator voting power; `/net_info` peer connectivity; per-node Prometheus consensus and process metrics; disk growth; faucet account balance; RPC latency/error rates. Metrics are live endpoints; a Grafana/alerting service is not deployed. Logs are `.devnet/nodeN/node.log` and `.devnet/gateway.log` and remain ignored. A node restart uses the same DB and validator signing state. The integration harness tests one-validator outage, quorum loss with two offline, restart and catch-up with common block hashes.

For corrupt state, first stop and preserve evidence, determine the last agreed checkpoint and restore using an independently verified state-sync/snapshot procedure. Do not run an automatic destructive reset, rewind validator signing state or alter genesis on a live network. No automated disaster recovery or mainnet restart is authorized.

The local chain retains default SDK pruning. A public archival explorer requires appropriately provisioned archival nodes and a separate durable indexer.
