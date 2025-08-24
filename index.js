import * as ethers from 'ethers';
import * as dotenv from 'dotenv';
dotenv.config({ quiet: true });
import axios from 'axios';
import { Twisters } from 'twisters';
import readline from 'readline';

const twisters = new Twisters();

const privateKey = process.env.PRIVATE_KEY;
const rpcUrl = process.env.RPC_URL;
const header = {
    headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        'Authorization': `Bearer ${process.env.AUTH_TOKEN}`,
        "Content-Type": "application/json",
        "Sec-GPC": "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "Priority": "u=4"
    }
};
const BASE_URL = "https://www.pretrillions.com/api";

if (!process.env.AUTH_TOKEN) {
    console.warn('Peringatan: ENV AUTH tidak terdeteksi. Set AUTH=BearerToken anda di file .env agar request ke API berhasil.');
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
        const contractAddress = "0xBc7892318a7943f8f40C6d2F35eBB083397bf727";

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
        console.log('🔄 Sending mint transaction...');
        const tx = await contract.mintPlasmaGirl(wallet.address, tokenURI);
        console.log(`📋 Transaction sent: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        console.log(`📊 Total logs found: ${receipt.logs.length}`);

        let tokenId = null;
        if (receipt.logs && receipt.logs.length > 0) {
            for (const log of receipt.logs) {
                try {
                    const parsedLog = contract.interface.parseLog(log);
                    if (parsedLog.name === 'Transfer' && parsedLog.args.from === ethers.ZeroAddress) {
                        tokenId = parsedLog.args.tokenId.toString();
                        console.log(`🎯 Found Token ID from Transfer event: ${tokenId}`);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
        }

        if (!tokenId) {
            console.log('⚠️ Token ID not found in Transfer event, checking all logs...');
            for (const log of receipt.logs) {
                if (log.topics && log.topics.length >= 4) {
                    try {
                        const potentialTokenId = BigInt(log.topics[3]).toString();
                        if (potentialTokenId && potentialTokenId !== '0') {
                            tokenId = potentialTokenId;
                            console.log(`🎯 Found Token ID from log topics: ${tokenId}`);
                            break;
                        }
                    } catch (error) {
                        try {
                            const potentialTokenId = ethers.BigNumber.from(log.topics[3]).toString();
                            if (potentialTokenId && potentialTokenId !== '0') {
                                tokenId = potentialTokenId;
                                console.log(`🎯 Found Token ID from log topics (fallback): ${tokenId}`);
                                break;
                            }
                        } catch (fallbackError) {
                            continue;
                        }
                    }
                }
            }
        }

        if (!tokenId) {
            console.log('❌ Could not extract Token ID from transaction logs');
        }

        return {
            hash: tx.hash,
            tokenId: tokenId
        };
    } catch (error) {
        const errorMsg = getCleanErrorMessage(error);
        console.error(`❌ Blockchain mint error: ${errorMsg}`);
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

const getUserInput = (question) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

const handleImageGeneration = async (user, wallet) => {
    try {
        console.log('\n=== IMAGE GENERATION ===');

        // const userPrompt = await getUserInput('Masukkan prompt untuk generate gambar (tekan Enter untuk random): ');

        twisters.put('generate', {
            text: 'Generating image...'
        });

        let generateData;
        console.log('🎲 Generating random image...');
        generateData = await generateImage();
        // if (userPrompt === '' || userPrompt.length === 0) {
        // } else {
        //     console.log(`🎨 Generating image with prompt: "${userPrompt}"`);
        //     generateData = await generateImage(userPrompt);
        // }

        twisters.remove('generate');

        if (generateData && generateData.imageId) {
            console.log(`✅ Image generated successfully!`);
            console.log(`Image ID: ${generateData.imageId}`);
            console.log(`Image URL: ${generateData.imageUrl || 'URL not available'}`);

            await handleMinting(generateData.imageId, user.privy_user_id, wallet, user);
            return true; // Success
        } else {
            console.log('❌ Failed to generate image');
            return false; // Failed
        }

    } catch (error) {
        twisters.remove('generate');
        const errorMsg = getCleanErrorMessage(error);
        console.error(`❌ ${errorMsg}`);
        return false; // Failed
    }
}

const handleMinting = async (imageId, userId, wallet, user) => {
    try {
        console.log('\n=== NFT MINTING ===');
        console.log('🔄 Starting mint process...');

        const mintData = await mintImage(imageId, userId);
        const mintId = mintData.mintId;

        console.log(`Mint ID: ${mintId}`);
        console.log('✅ Mint request created! Proceeding with blockchain transaction...');

        const mintResult = await mintNFT(wallet, mintData.metadataUri);
        console.log(`🔗 Transaction Hash: ${mintResult.hash}`);
        console.log(`🎫 Token ID: ${mintResult.tokenId}`);

        console.log('🔄 Setting mint status to processing...');
        await processingMint(mintId, 'processing', mintResult.hash);

        const confirmResult = await confirmMint(mintId, 'confirmed', Number(mintResult.tokenId), mintResult.hash);
        console.log('✅ NFT minting completed successfully!');
        console.log(`Transaction: ${mintResult.hash}`);
        console.log(`Token ID: ${mintResult.tokenId}`);

        await updateUserInfo(user, wallet);

    } catch (error) {
        const errorMsg = getCleanErrorMessage(error);
        console.error(`❌ ${errorMsg}`);
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
