import * as ethers from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });
import axios from 'axios';
import { Twisters } from 'twisters';

const twisters = new Twisters();

const spinnerStart = (id, text) => twisters.put(id, { text, active: true });
const spinnerUpdate = (id, text) => twisters.put(id, { text, active: true });
const spinnerSucceed = (id, text) => twisters.put(id, { text: `✔ ${text}`, active: false });
const spinnerFail = (id, text) => twisters.put(id, { text: `✖ ${text}`, active: false });

const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL;
const AUTH = process.env.AUTH_TOKEN;
const header = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        'Authorization': `Bearer ${AUTH}`,
        "Cookie": `privy-session=t; privy-token=${AUTH}`,
        "Content-Type": "application/json",
        "Sec-GPC": "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=4"
    }
};
const BASE_URL = "https://www.pretrillions.com/api";

if (!AUTH) {
    console.warn('Peringatan: ENV AUTH/AUTH_TOKEN tidak terdeteksi. Set AUTH atau AUTH_TOKEN=BearerToken anda di file .env agar request ke API berhasil.');
}

const getCleanErrorMessage = (error) => {
    if (error?.response?.data?.data?.error) {
        return error.response.data.data.error;
    } else if (error?.response?.data?.error) {
        return error.response.data.error;
    } else if (error?.response?.data?.message) {
        return error.response.data.message;
    } else if (error?.message) {
        return error.message;
    } else {
        return 'Unknown error occurred';
    }
}

const checkCredits = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/credits`, header);
        return response.data.balance;
    } catch (error) {
        console.error("Error checking credits:", error);
        throw error;
    }
}

const checkPoints = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/points`, header);
        const data = response.data;
        return {
            points: data.totalPoints,
            rank: data.rank
        }
    } catch (error) {
        console.error("Error checking points:", error);
        throw error;
    }
}

const getUserInfo = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/user`, header);
        return response.data.user;
    } catch (error) {
        console.error("Error fetching user info:", error);
        throw error;
    }
}

const generateImage = async (prompts) => {
    try {
        let body = {};
        if (prompts) {
            body = { prompts };
        }

        const response = await axios.post(`${BASE_URL}/generate-random`, body, header);
        return response.data;
    } catch (error) {
        const errorMsg = getCleanErrorMessage(error);
        console.error(`❌ Generate image error: ${errorMsg}`);
        throw new Error(errorMsg);
    }
}

const mintImage = async (imageId, userID) => {
    try {
        const response = await axios.post(`${BASE_URL}/nft/mint`, {
            imageId: imageId,
            userId: userID
        }, header);
        return response.data;
    } catch (error) {
        const errorMsg = getCleanErrorMessage(error);
        console.error(`❌ Mint image error: ${errorMsg}`);
        throw new Error(errorMsg);
    }
}

const processingMint = async (mintID, status = 'processing', transactionHash) => {
    try {
        const response = await axios.post(`${BASE_URL}/nft/status`, {
            mintId: mintID,
            status: status,
            transactionHash: transactionHash
        }, header);

        return response.data;
    } catch (error) {
        const errorMsg = getCleanErrorMessage(error);
        console.error(`❌ Processing mint error: ${errorMsg}`);
        throw new Error(errorMsg);
    }
}
const confirmMint = async (mintID, status = 'confirmed', tokenID, transactionHash) => {
    try {
        const response = await axios.post(`${BASE_URL}/nft/status`, {
            mintId: mintID,
            status: status,
            tokenId: tokenID,
            transactionHash: transactionHash
        }, header);

        return response.data;
    } catch (error) {
        const errorMsg = getCleanErrorMessage(error);
        console.error(`❌ Confirm mint error: ${errorMsg}`);
        throw new Error(errorMsg);
    }
}

const mintNFT = async (wallet, tokenURI) => {
    try {
        const contractAddress = "0xC5c28aA8DA13588CBf8B23D9c57FB2DA98aebcE0";
        const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

        const abi = [
            {
                "inputs": [
                    {
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    },
                    {
                        "internalType": "string",
                        "name": "tokenURI",
                        "type": "string"
                    }
                ],
                "name": "mintPlasmaGirl",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "anonymous": false,
                "inputs": [
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "from",
                        "type": "address"
                    },
                    {
                        "indexed": true,
                        "internalType": "address",
                        "name": "to",
                        "type": "address"
                    },
                    {
                        "indexed": true,
                        "internalType": "uint256",
                        "name": "tokenId",
                        "type": "uint256"
                    }
                ],
                "name": "Transfer",
                "type": "event"
            }
        ];

        const contract = new ethers.Contract(contractAddress, abi, wallet);
        const tx = await contract.mintPlasmaGirl(wallet.address, tokenURI);
        const receipt = await tx.wait();

        const transferLog =
            receipt.logs.find(l =>
                (l.fragment?.name === "Transfer") ||
                (l.topics?.[0] === TRANSFER_TOPIC)
            );

        if (!transferLog) {
            throw new Error("Transfer event tidak ditemukan di receipt.");
        }

        const tokenIdBigInt = transferLog.args?.tokenId ?? transferLog.args?.[2];
        const formatTokenID = Number(tokenIdBigInt);

        return {
            hash: tx.hash,
            tokenId: formatTokenID
        };
    } catch (error) {
        const errorMsg = getCleanErrorMessage(error);
        throw new Error(errorMsg);
    }
}

const displayUserInfo = async (user, wallet) => {
    try {
        const [credits, points, balance] = await Promise.all([
            checkCredits(),
            checkPoints(),
            wallet.provider.getBalance(wallet.address)
        ]);

        console.log('\n=== 📊 USER INFO ===');
        console.log(`👤 User: @${user.twitter_username}`);
        console.log(`💳 Credits: ${credits}`);
        console.log(`🏆 Points: ${points.points} (Rank: ${points.rank})`);
        console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} XPL`);
        console.log('===================\n');

        return { credits, points, balance };
    } catch (error) {
        console.error('Error displaying user info:', error);
        return null;
    }
}

const updateUserInfo = async (user, wallet) => {
    try {
        console.log('\n🔄 Updating user information...');

        const [credits, points, balance] = await Promise.all([
            checkCredits(),
            checkPoints(),
            wallet.provider.getBalance(wallet.address)
        ]);

        console.log('\n=== 📊 UPDATED USER INFO ===');
        console.log(`👤 User: @${user.twitter_username}`);
        console.log(`💳 Credits: ${credits}`);
        console.log(`🏆 Points: ${points.points} (Rank: ${points.rank})`);
        console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} XPL`);
        console.log('============================\n');

    } catch (error) {
        console.error('Error updating user info:', error);
    }
}


const handleImageGeneration = async (user, wallet) => {
    try {
        spinnerStart('gen', 'Generating image...');
        const generatedImage = await generateImage();
        spinnerSucceed('gen', `Image generated (ID: ${generatedImage.imageId})`);

        spinnerStart('mint-init', 'Preparing mint...');
        const mintData = await mintImage(generatedImage.imageId, user.privy_user_id);
        spinnerSucceed('mint-init', `Mint prepared (Mint ID: ${mintData.mintId})`);

        spinnerStart('chain', 'Minting on blockchain...');
        const mintResult = await mintNFT(wallet, mintData.metadataUri);
        spinnerSucceed('chain', `Minted on-chain (tx: ${mintResult.hash.slice(0, 10)}...)`);

        spinnerStart('api-processing', 'Setting status to processing...');
        await processingMint(mintData.mintId, 'processing', mintResult.hash);
        spinnerSucceed('api-processing', 'Status set to processing');

        if (mintResult.tokenId) {
            spinnerStart('api-confirm', `Confirming mint (tokenId: ${Number(mintResult.tokenId)})...`);
            await confirmMint(mintData.mintId, 'confirmed', Number(mintResult.tokenId), mintResult.hash);
            spinnerSucceed('api-confirm', `Mint confirmed (tokenId: ${Number(mintResult.tokenId)})`);
        } else {
            spinnerFail('api-confirm', 'Token ID not found - skipped confirmation');
        }

        await updateUserInfo(user, wallet);
        return true;

    } catch (error) {
        const errorMsg = getCleanErrorMessage(error);
        spinnerFail('gen', 'Generation failed');
        spinnerFail('mint-init', 'Mint preparation failed');
        spinnerFail('chain', 'On-chain mint failed');
        spinnerFail('api-processing', 'Failed to set processing');
        spinnerFail('api-confirm', 'Confirmation failed');
        console.error(`❌ ${errorMsg}`);
        return false;
    }
}

const main = async () => {
    try {
        const user = await getUserInfo();
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);

        console.log('🚀 Starting PreTrillions Auto Generator & Minter');
        console.log('===============================================');

        let round = 1;

        while (true) {
            console.log(`\n🔄 Round ${round}`);

            const userInfo = await displayUserInfo(user, wallet);

            if (!userInfo) {
                console.log('❌ Failed to get user info. Stopping...');
                break;
            }

            if (userInfo.credits <= 0) {
                console.log('🛑 Credits exhausted! Stopping the loop.');
                console.log(`Final stats: ${userInfo.points.points} points (Rank: ${userInfo.points.rank})`);
                break;
            }

            if (userInfo.credits <= 10) {
                console.log('⚠️ Low credits warning! Only a few generations left.');
            }

            const success = await handleImageGeneration(user, wallet);

            if (!success) {
                console.log('❌ Generation failed. Trying again in next round...');
            }

            round++;

            console.log('⏳ Waiting 1 second before next round...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (err) {
        console.error('❌ Fatal error:', err);
    } finally {
        console.log('\n👋 Program selesai.');
        process.exit(0);
    }
}

main();
