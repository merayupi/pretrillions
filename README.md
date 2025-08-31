# PreTrillions Auto Generator & Minter

Automates image generation and NFT minting for PreTrillions using Node.js and Plasma testnet.

## Requirements
- Node.js 18+ (recommended)
- pnpm or npm
- A funded Plasma testnet wallet (PRIVATE_KEY)

## Install
- pnpm: `pnpm i`
- npm: `npm i`

## Configure environment
1. Copy [example.env](example.env) to [.env](.env)
2. Fill the values:
```env
PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
RPC_URL="https://testnet-rpc.plasma.to"
AUTH_TOKEN="YOUR_PRIVY_TOKEN"
```

## Get AUTH_TOKEN (privy-token cookie)
1. Open https://www.pretrillions.com and log in.
2. Open DevTools (F12).
3. Chrome: Application tab → Storage → Cookies → https://www.pretrillions.com
   Firefox: Storage tab → Cookies → https://www.pretrillions.com
4. Find cookie named `privy-token`, copy its Value.
5. Paste that value into `AUTH_TOKEN` in your [.env](.env).

The app will send:
- HTTP Authorization header: `Bearer ${AUTH_TOKEN}`
- Cookie: `privy-token=${AUTH_TOKEN}`

## Run
- pnpm: `pnpm start`
- npm: `npm start`
- Node: `node index.js`

## What it does
- Fetches user and balances via [`getUserInfo`](index.js), [`checkCredits`](index.js), [`checkPoints`](index.js).
- Displays current info via [`displayUserInfo`](index.js).
- Loops:
  - Generate image: [`generateImage`](index.js)
  - Prepare mint: [`mintImage`](index.js)
  - Mint on-chain (Plasma testnet): [`mintNFT`](index.js)
  - API status updates: [`processingMint`](index.js), [`confirmMint`](index.js)

Progress spinners/logs are handled by Twisters in [index.js](index.js).

## Troubleshooting
- Missing/invalid AUTH_TOKEN: the script warns and API calls will fail.
- Low/zero credits: the loop stops automatically.
- RPC issues: set `RPC_URL` in [.env](.env).
