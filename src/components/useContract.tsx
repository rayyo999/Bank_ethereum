import {useState, useEffect} from 'react';
import {providers, Contract} from 'ethers';
import tokenContractABI from '../contract/token.json';
import escrowContractABI from '../contract/escrow.json';

const tokenContractAddress = '0x6934572c78155DaF175E7fC539784E6fd4B144Cc';
const escrowContractAddress = '0xd05592D89E29fd95d7EEff7DE446c6B1319Ac4ff';
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
