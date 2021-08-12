/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';

import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { ZombieNftFactoryWrapper } from '../lib/contracts/ZombieNftFactoryWrapper';
import { CONFIG } from '../config';

// SUDT ERC20
import * as CompiledContractArtifact from '../../build/contracts/ERC20.json';
const SUDT_PROXY_CONTRACT_ADDRESS = "0xadd5c6Ed38Ec47BB2c643e94fF3cb7768978FB94";

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };
        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<ZombieNftFactoryWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [storedValue, setStoredValue] = useState<number | undefined>();
    const [deployTxHash, setDeployTxHash] = useState<string | undefined>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const [imgUrl, setImgUrl] = useState('');
    const [listZombies, setListZombies] = useState([]);//useState([]);
    // l1 -> l2 deposit
    const [depositAccount, setDepositAccount] = useState<string | undefined>();
    const [sudtBalance, setSudtBalance] = useState<bigint>();
    const toastId = React.useRef(null);
    const [newStoredNumberInputValue, setNewStoredNumberInputValue] = useState<
        number | undefined
    >();

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    // GetDeposit Account
    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            addressTranslator.getLayer2DepositAddress(web3, accounts?.[0]).then(_dAdr => {
                setDepositAccount(_dAdr.addressString);

                console.log(`Layer 2 Deposit Address on Layer 1: \n${_dAdr.addressString}`);
            })
        } else {
            setDepositAccount(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (polyjuiceAddress) {
            const contract = new web3.eth.Contract(
                CompiledContractArtifact.abi as any, 
                SUDT_PROXY_CONTRACT_ADDRESS
            );
            contract.methods.balanceOf(polyjuiceAddress).call({
                from: accounts?.[0]
            }).then((_sudtBalance : any) => setSudtBalance(BigInt(Number(_sudtBalance))));

            
        } 
    }, [polyjuiceAddress]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    const account = accounts?.[0];

    useEffect(() => {
        if (contract) {
            setInterval(() => {
                contract.getListZombies(account).then(setListZombies);
            }, 10000);
        }
    }, [contract]);

    async function deployContract() {
        const _contract = new ZombieNftFactoryWrapper(web3);

        try {
            setDeployTxHash(undefined);
            setTransactionInProgress(true);

            const transactionHash = await _contract.deploy(account);

            setDeployTxHash(transactionHash);
            setExistingContractAddress(_contract.address);
            toast(
                'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    // async function getStoredValue() {
    //     const value = await contract.getStoredValue(account);
    //     toast('Successfully read latest stored value.', { type: 'success' });

    //     setStoredValue(value);
    // }

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new ZombieNftFactoryWrapper(web3);
        _contract.useDeployed(contractAddress.trim());

        setContract(_contract);
        setStoredValue(undefined);
    }

    async function createRandomZombie() {
        try {
            setTransactionInProgress(true);
            // await contract.setStoredValue(newStoredNumberInputValue, account);
            await contract.createRandomZombie(imgUrl, account);
            toast(
                'Successfully Create Zombie.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error('Fail create Zombie');
        } finally {
            setTransactionInProgress(false);
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div>
            <table>
            <tr>
            <td><b>ETH</b> address: </td>
            <td><b>{accounts?.[0]}</b></td>
            </tr>
            <tr>
            <td><b>Polyjuice</b> address: </td>
            <td><b>{polyjuiceAddress || ' - '}</b></td>
            </tr>
            <tr>
            <td><b>Nervos Layer2(godwoken)</b> balance:{' '}</td>
            <td><b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b></td>
            </tr>
            </table>
            <hr />
            <h3>🧟Deposit Asset to L2</h3>
            <p>How To transferring from Ethereum to Nervos? Force Bridge is your solution</p>
            <table>
            
            <tr>Deposit to L2 at:{' '}
                <a href="https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?xchain-asset=0x0000000000000000000000000000000000000000">
                    <button>Force Bridge</button>
                </a></tr>
            <tr>🧟Layer2 Deposit Recipient: <b>{depositAccount || ' - '}</b></tr>
            <tr>SUDT Contract Address: {' '} <b>{SUDT_PROXY_CONTRACT_ADDRESS}</b></tr>
            <tr><b>Nervos Layer2(godwoken) sudt</b> balance:{' '}
            <b>{sudtBalance ? (sudtBalance).toString() : <LoadingIndicator />} SUDT</b></tr>
            </table>
            <hr />

            <h3> 🧟Crazy Zombie Factory🧟</h3>
            <table>
            <tr><button onClick={deployContract} disabled={!l2Balance}>
                Deploy contract
            </button>
            &nbsp;or&nbsp;
            <input
                placeholder="Existing contract id"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !l2Balance}
                onClick={() => setExistingContractAddress(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br /></tr>
            <tr>Deployed contract address: <b>{contract?.address || '-'}</b> </tr>
            <tr>Deploy transaction hash: <b>{deployTxHash || '-'}</b></tr>
            <tr>
            <input
                type="string"
                placeholder="image url"
                onChange={e => setImgUrl(e.target.value)}
            />
            <button onClick={createRandomZombie} disabled={!contract}>
                create Random Zombie (use image)🧟‍♂️
            </button>
            </tr>
            </table>
            
            <div>
                <h3> Zombies Gallery<br/>🧟🧟‍♀️🧟‍♂️🧟🧟‍♀️🧟‍♂️🧟🧟‍♀️🧟‍♂️</h3>

                {listZombies.map(data => {
                    return (
                        <table>
                            <tr><td rowSpan= {2}><img
                            key={data[0]}
                            src={data[0]}
                            style={{ width: 200, height: 200, border: '2px solid black' ,borderRadius:10 }} /></td></tr>
                            <tr>
                            <td> <b>Level:</b> {data[2]} </td><br />
                            <td><b>DNA:</b> {data[1]} </td></tr>
                        </table>
                    )
                })}
            </div>
            <br />
            <br />
            <hr />

            <ToastContainer />
        </div>
    );
}
