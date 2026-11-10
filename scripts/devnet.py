#!/usr/bin/env python3
"""Isolated four-process Cosmos EVM devnet. No secrets are printed."""
import json, os, pathlib, re, shutil, signal, subprocess, sys, time, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / '.devnet'
BIN = ROOT / 'bin/evmd'
CONFIG = json.loads((ROOT/'config/devnet.json').read_text())
CHAIN = CONFIG['chain_id']
DENOM = CONFIG['base_denom']
COUNT = CONFIG['validator_count']

def cli(home, *args):
    p = subprocess.run([str(BIN), *map(str,args), '--home', str(home)], capture_output=True, text=True)
    if p.returncode:
        # Commands which create/export keys can include secrets in output.
        raise RuntimeError('evmd command failed: ' + ' '.join(map(str,args[:2])))
    return p.stdout.strip()

def patch(path, values):
    section = ''
    lines = []
    for line in path.read_text().splitlines():
        if line.startswith('['): section = line.strip()
        match = re.match(r'^([\w-]+)\s*=', line)
        if match and (section, match[1]) in values:
            line = match[1] + ' = ' + values[section,match[1]]
        lines.append(line)
    path.write_text('\n'.join(lines)+'\n')

def home(i): return DATA / f'node{i}'

def init():
    if DATA.exists(): raise RuntimeError('.devnet already exists; keep it or move it before initializing again')
    os.umask(0o077)
    DATA.mkdir(mode=0o700)
    for i in range(COUNT):
        cli(home(i), 'init', f'samba-validator-{i}', '--chain-id', CHAIN)
        cli(home(i), 'keys', 'add', 'validator', '--keyring-backend', 'test', '--algo', 'eth_secp256k1', '--output', 'json')
    # Separate faucet account, not a validator signing key.
    cli(home(0), 'keys', 'add', 'faucet', '--keyring-backend', 'test', '--algo', 'eth_secp256k1', '--output', 'json')
    genesis_path = home(0)/'config/genesis.json'
    gen = json.loads(genesis_path.read_text())
    def rename(x):
        if isinstance(x,dict): return {k:rename(v) for k,v in x.items()}
        if isinstance(x,list): return [rename(v) for v in x]
        return DENOM if x in ('stake','atest','aevmos') else x
    gen = rename(gen)
    st = gen['app_state']
    st['staking']['params']['bond_denom'] = DENOM
    st['mint']['params'].update(mint_denom=DENOM, inflation_rate_change='0.000000000000000000',inflation_min='0.000000000000000000',inflation_max='0.000000000000000000')
    st['mint']['minter']['inflation'] = '0.000000000000000000'
    st['evm']['params']['evm_denom'] = DENOM
    st['feemarket']['params']['no_base_fee'] = False
    st['bank']['denom_metadata'] = [dict(description='Valueless private devnet native coin',denom_units=[dict(denom=DENOM,exponent=0,aliases=[]),dict(denom='samba',exponent=18,aliases=[])],base=DENOM,display='samba',name='SAMBA',symbol='SAMBA',uri='',uri_hash='')]
    # Remove example wrapped-token registrations; native bank/EVM coin remains.
    st['erc20']['token_pairs'] = []
    st['erc20']['native_precompiles'] = []
    if 'consensus' in gen: gen['consensus']['params']['block']['max_gas'] = '30000000'
    genesis_path.write_text(json.dumps(gen,indent=2))
    addresses = []
    for i in range(COUNT):
        addr = cli(home(i),'keys','show','validator','-a','--keyring-backend','test')
        addresses.append(addr)
        cli(home(0),'genesis','add-genesis-account',addr,CONFIG['validator_allocation_base_units']+DENOM)
    faucet = cli(home(0),'keys','show','faucet','-a','--keyring-backend','test')
    cli(home(0),'genesis','add-genesis-account',faucet,CONFIG['faucet_allocation_base_units']+DENOM)
    common = genesis_path.read_bytes()
    gentxs = DATA/'gentxs'; gentxs.mkdir()
    ids = []
    for i in range(COUNT):
        (home(i)/'config/genesis.json').write_bytes(common)
        cli(home(i),'genesis','gentx','validator',CONFIG['validator_self_bond_base_units']+DENOM,'--chain-id',CHAIN,'--keyring-backend','test','--gas-prices','10000000'+DENOM)
        for f in (home(i)/'config/gentx').glob('*.json'): shutil.copy(f,gentxs/f.name)
        ids.append(cli(home(i),'comet','show-node-id'))
    cli(home(0),'genesis','collect-gentxs','--gentx-dir',gentxs)
    cli(home(0),'genesis','validate-genesis')
    common = genesis_path.read_bytes()
    for i in range(COUNT):
        (home(i)/'config/genesis.json').write_bytes(common)
        peers = ','.join(f'{ids[j]}@127.0.0.1:{26656+j*10}' for j in range(COUNT) if j != i)
        patch(home(i)/'config/config.toml',{
            ('[rpc]','pprof_laddr'):'""',
            ('[rpc]','laddr'):json.dumps(f'tcp://127.0.0.1:{26657+i*10}'),
            ('[p2p]','laddr'):json.dumps(f'tcp://127.0.0.1:{26656+i*10}'),
            ('[p2p]','persistent_peers'):json.dumps(peers), ('[p2p]','addr_book_strict'):'false',
            ('[p2p]','allow_duplicate_ip'):'true',('[p2p]','pex'):'false',
            ('[mempool]','type'):'"app"',
            ('[consensus]','timeout_commit'):'"1s"',
            ('[instrumentation]','prometheus'):'true',
            ('[instrumentation]','prometheus_listen_addr'):json.dumps(f'127.0.0.1:{26660+i*10}')})
        patch(home(i)/'config/app.toml',{
            ('','minimum-gas-prices'):json.dumps('10000000'+DENOM),
            ('[api]','enable'):'false',('[grpc]','enable'):'false',
            ('[evm]','evm-chain-id'):CHAIN,
            ('[json-rpc]','enable'):'true',('[json-rpc]','api'):'["eth", "net", "web3"]',
            ('[json-rpc]','address'):json.dumps(f'127.0.0.1:{8545+i*10}'),
            ('[json-rpc]','ws-address'):json.dumps(f'127.0.0.1:{8546+i*10}'),
            ('[json-rpc]','enable-indexer'):'true',('[json-rpc]','allow-unprotected-txs'):'false'})
    (DATA/'public.json').write_text(json.dumps(dict(chainId=int(CHAIN),denom=DENOM,symbol='SAMBA',decimals=18,validators=addresses,faucet=faucet),indent=2))
    print('Initialized four fresh validators and a separate faucet; private data is ignored by Git.')

def owned_process(pid,i):
    try:
        command = pathlib.Path(f'/proc/{pid}/cmdline').read_bytes().split(b'\0')
        return str(BIN).encode() in command and str(home(i)).encode() in command
    except (OSError,ValueError): return False

def start(i):
    pidfile = home(i)/'process.pid'
    if pidfile.exists():
        if owned_process(int(pidfile.read_text()),i): return
    with (home(i)/'node.log').open('ab') as log:
        p = subprocess.Popen([str(BIN),'start','--home',str(home(i)),'--chain-id',CHAIN,'--evm.evm-chain-id',CHAIN,'--json-rpc.api','eth,net,web3','--log_level','warn'],stdout=log,stderr=log,start_new_session=True,env={**os.environ,'GOMEMLIMIT':'350MiB'})
    pidfile.write_text(str(p.pid))

def stop(i):
    f = home(i)/'process.pid'
    if f.exists():
        try:
            if owned_process(int(f.read_text()),i): os.kill(int(f.read_text()),signal.SIGTERM)
        except ProcessLookupError: pass
        f.unlink()

def status():
    for i in range(COUNT):
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{26657+i*10}/status',timeout=3) as r: s=json.load(r)['result']
            print(json.dumps(dict(node=i,height=s['sync_info']['latest_block_height'],catching_up=s['sync_info']['catching_up'],network=s['node_info']['network'])))
        except Exception: print(json.dumps(dict(node=i,status='unavailable')))

if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv)>1 else 'status'
    selected = [int(sys.argv[2])] if len(sys.argv)>2 else range(COUNT)
    if action == 'init': init()
    elif action == 'start':
        for i in selected: start(i)
    elif action == 'run':
        for i in selected: start(i)
        try:
            while True: time.sleep(1)
        except KeyboardInterrupt:
            for i in selected: stop(i)
    elif action == 'stop':
        for i in selected: stop(i)
    elif action == 'status': status()
    else: raise SystemExit('Use init, start [node], stop [node], status')
