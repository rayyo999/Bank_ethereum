import {useState, useEffect} from 'react';
import {providers, Contract} from 'ethers';
import tokenContractABI from '../contract/token.json';
import escrowContractABI from '../contract/escrow.json';

const tokenContractAddress = '0xa6d56bcc5A425a58a69bBFE53D61f945f33284C1'
const escrowContractAddress = '0x2912a67580b901A5D45AA69A1D8ad403329f9f52'
const {ethereum} = window as any;
const provider = new providers.Web3Provider(ethereum);
const useContract = () => {
  const [tokenContract, setTokenContract] = useState<Contract | null>(null);
  const [escrowContract, setEscrowContract] = useState<Contract | null>(null);
  const getTokenContract = async () => {
    try {
      const signer = provider.getSigner();
      const contractInstance = new Contract(
        tokenContractAddress,
        tokenContractABI.abi,
        signer
      );
      console.log('Get Token contract!', contractInstance.address);
      setTokenContract(contractInstance);
    } catch (error) {
      console.error(error);
    }
  };
  const getEscrowContract = async () => {
    try {
      const signer = provider.getSigner();
      const contractInstance = new Contract(
        escrowContractAddress,
        escrowContractABI.abi,
        signer
      );
      console.log('Get Escrow contract!', contractInstance.address);
      setEscrowContract(contractInstance);
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    getTokenContract();
    getEscrowContract();
  }, []);

  return {tokenContract, escrowContract};
};

export default useContract;
