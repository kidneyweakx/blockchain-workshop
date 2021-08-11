import Web3 from 'web3';
import * as ZombieNftFactoryJSON from '../../../build/contracts/ZombieNftFactory.json';
import { ZombieNftFactory } from '../../types/ZombieNftFactory';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

export class ZombieNftFactoryWrapper {
    web3: Web3;

    contract: ZombieNftFactory;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(ZombieNftFactoryJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    // async getZombieLength() {
    //     const data = await this.contract.methods.getZombieLength().call({ from: address });
    //     return data;
    // }

    async getListNFT(address: string) {
        const totalNft = await this.contract.methods.getZombieLength().call({ from: address });
        console.log(totalNft);
        const arrNFT = new Array(Number(totalNft)).fill(0).map((_, index) => index + 1);

        const data = await Promise.all(
            arrNFT.map(_nftId =>
                this.contract.methods.getZombie((_nftId-1).toString()).call({
                    from: address
                })
            )
        );
        
        return data;
    }


    async createRandomZombie(nameurl: string, fromAddress: string) {

        const tx = await this.contract.methods.createRandomZombie(nameurl).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress,
            // value
        });
        
        return tx;
    }

    async deploy(fromAddress: string) {
        const deployTx = await (this.contract
            .deploy({
                data: ZombieNftFactoryJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress,
                to: '0x0000000000000000000000000000000000000000'
            } as any) as any);

        this.useDeployed(deployTx.contractAddress);

        return deployTx.transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
