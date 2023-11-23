import { FC, useState, useEffect, useReducer } from 'react'
// import {Routes, Route, Link, useLocation} from 'react-router-dom';
// import {ConnectButton} from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion'
import { utils, providers, Contract, Event, EventFilter } from 'ethers'
import Bank from './components/Bank'
import AccountsReducer from './components/AccountsReducer'
import { AccountHistory, Accounts, Account } from './components/AccountsReducer'
import useContract from './components/useContract'
// import {getContract} from '@wagmi/core';
// declare var window: any;
const { ethereum } = window as any

const accountInit: Readonly<Account> = {
  amounts: '0',
  createTime: 0,
  history: [],
  isDepositing: false,
  isWithdrawing: false,
}
const accountsInit: Accounts = {
  inAccount: accountInit,
  inDD: accountInit,
  inFD_30: accountInit,
  inFD_60: accountInit,
  inFD_90: accountInit,
}

const App: FC = () => {
  const [currentAccount, setCurrentAccount] = useState('')
  const [isSepolia, setIsSepolia] = useState(false)
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false)
  const [userAccounts, dispatch] = useReducer(AccountsReducer, accountsInit)
  const [isMinting, setIsMinting] = useState(false)
  const { tokenContract, escrowContract } = useContract()

  // const location = useLocation();

  const getAccount = async () => {
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts.length === 0) {
        return
      }
      setCurrentAccount(accounts[0])
    } catch (error) {
      console.error(error)
    }
  }
  const checkCurrentAccount = async () => {
    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' })
      if (accounts.length === 0) {
        // console.log('no accounts found');
        return
      }
      if (accounts[0] === currentAccount) {
        checkNetwork()
        return
      }
      setCurrentAccount(accounts[0])
    } catch (error) {
      console.error(error)
    }
  }
  const getSepolia = async () => {
    try {
      const connect = await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      })
      //return true if success~~
      if (connect === null) {
        // console.log('switch success');
        setIsSwitchingNetwork(true)
        setIsSepolia(true)
      } else {
        setIsSepolia(false)
      }
    } catch (error) {
      setIsSepolia(false)
      console.error(error)
    }
  }
  const checkNetwork = async () => {
    try {
      if (ethereum.networkVersion !== '11155111') {
        setIsSepolia(false)
      } else {
        setIsSepolia(true)
      }
    } catch (error) {
      setIsSepolia(false)
      console.error(error)
    }
  }
  const mintFreeToken = async () => {
    try {
      setIsMinting(true)
      const mintTxn = await tokenContract?.freeToMint()
      // console.log('minting...', mintTxn.hash);
      const receipt = await mintTxn.wait()
      // console.log('minted!!', receipt);
      // updateBalance(currentAccount, 'Mint', null, 0);
      updateBalance(currentAccount)
    } catch (error) {
      setIsMinting(false)
      console.error(error)
    }
  }
  const getUserBalance = async (accountAddress: string) => {
    try {
      if (!tokenContract || !escrowContract) {
        return
      }
      let balance_account = await tokenContract.balanceOf(accountAddress)
      let balance_DD = await escrowContract.depositsOf_DD()
      let balance_FD_30 = await escrowContract.depositsOf_FD_30()
      let balance_FD_60 = await escrowContract.depositsOf_FD_60()
      let balance_FD_90 = await escrowContract.depositsOf_FD_90()
      balance_account = utils.formatUnits(balance_account, 18)
      balance_DD = utils.formatUnits(balance_DD, 18)
      balance_FD_30 = utils.formatUnits(balance_FD_30, 18)
      balance_FD_60 = utils.formatUnits(balance_FD_60, 18)
      balance_FD_90 = utils.formatUnits(balance_FD_90, 18)
      let createTime_DD = await escrowContract.createTime_DD()
      let createTime_FD_30 = await escrowContract.createTime_FD_30()
      let createTime_FD_60 = await escrowContract.createTime_FD_60()
      let createTime_FD_90 = await escrowContract.createTime_FD_90()
      const depositFilter = escrowContract.filters.Deposit(accountAddress)
      const withdrawFilter = escrowContract.filters.Withdraw(accountAddress)
      const bonusFilter = escrowContract.filters.GiveBonus(accountAddress)
      const depositEvents = await escrowContract.queryFilter(depositFilter, 0, 'latest')
      const withdrawEvents = await escrowContract.queryFilter(withdrawFilter, 0, 'latest')
      const bonusEvents = await escrowContract.queryFilter(bonusFilter, 0, 'latest')
      const allEvents = depositEvents.concat(withdrawEvents, bonusEvents).sort((a, b) => {
        return b.blockNumber - a.blockNumber
      })
      const histories: Accounts = {
        inAccount: {
          ...accountInit,
          amounts: balance_account,
        },
        inDD: {
          ...accountInit,
          amounts: balance_DD,
          createTime: createTime_DD.toNumber(),
          history: [],
        },
        inFD_30: {
          ...accountInit,
          amounts: balance_FD_30,
          createTime: createTime_FD_30.toNumber(),
          history: [],
        },
        inFD_60: {
          ...accountInit,
          amounts: balance_FD_60,
          createTime: createTime_FD_60.toNumber(),
          history: [],
        },
        inFD_90: {
          ...accountInit,
          amounts: balance_FD_90,
          createTime: createTime_FD_90.toNumber(),
          history: [],
        },
      }
      for (const event of allEvents) {
        const block = await event.getBlock()
        const data = transformEvent(event, block)
        switch (event.args?.[2]) {
          case 1:
            histories.inDD.history.push(data)
            break
          case 2:
            histories.inFD_30.history.push(data)
            break
          case 3:
            histories.inFD_60.history.push(data)
            break
          case 4:
            histories.inFD_90.history.push(data)
            break
          default:
            throw new Error(`event type error : ${event.args?.[2]} no found`)
        }
      }
      dispatch({ type: 'setAll', payload: histories })
    } catch (error) {
      console.error(error)
    }
  }
  const transformEvent = (event: Event, block: providers.Block): AccountHistory => {
    const time = transformTime(block.timestamp, 0)
    const data: AccountHistory = {
      txnHash: event.transactionHash,
      time: time,
      method: event.event ?? 'error',
      amount: utils.formatUnits(event.args?.[1], 18),
    }
    return data
  }
  const transformTime = (time: number, add: number): string => {
    // const time = new Date(block.timestamp * 1000);
    // const time = new Date(block.timestamp * 1000).toLocaleString('en-US', {
    //   timeZone: 'Asia/Taipei',
    // });
    const timeString = new Date((time + add * 24 * 3600) * 1000).toLocaleString('en-US', {
      timeZone: 'Asia/Taipei',
    })
    return timeString
  }
  const updateBalance = async (accountAddress: string) => {
    try {
      let balance_account = await tokenContract?.balanceOf(accountAddress)
      balance_account = utils.formatUnits(balance_account, 18)
      dispatch({
        type: 'balance_account',
        payload: {
          ...userAccounts,
          inAccount: { ...userAccounts.inAccount, amounts: balance_account },
        },
      })
    } catch (error) {
      console.error(error)
    }
  }
  // const updateBalance = async (
  //   accountAddress: string
  //   method: string,
  //   eventFilter: EventFilter | null,
  //   accountType: number
  // ) => {
  //   try {
  //     if (!tokenContract || !escrowContract) {
  //       return;
  //     }
  //     let balance_account = await tokenContract?.balanceOf(accountAddress);
  //     balance_account = utils.formatUnits(balance_account, 18);
  //     dispatch({
  //       type: 'balance_account',
  //       payload: {
  //         ...userAccounts,
  //         inAccount: {...userAccounts.inAccount, amounts: balance_account},
  //       },
  //     });
  //     if (method === 'Mint') return;
  //     if (eventFilter === null) return;
  //     const events = await escrowContract.queryFilter(eventFilter, 0, 'latest');
  //     const latestEvent = events[events.length - 1];
  //     const block = await latestEvent.getBlock();
  //     const data = transformEvent(latestEvent, block);
  //     switch (accountType) {
  //       case 1:
  //         let balance_DD = await escrowContract.depositsOf_DD();
  //         balance_DD = utils.formatUnits(balance_DD, 18);
  //         let createTime_DD = await escrowContract.createTime_DD();
  //         dispatch({
  //           type: 'balance_DD',
  //           payload: {
  //             ...userAccounts,
  //             inDD: {
  //               ...userAccounts.inDD,
  //               amounts: balance_DD,
  //               createTime: createTime_DD.toNumber(),
  //               history: [data],
  //             },
  //           },
  //         });
  //         break;
  //       case 2:
  //         let balance_FD_30 = await escrowContract.depositsOf_FD_30();
  //         balance_FD_30 = utils.formatUnits(balance_FD_30, 18);
  //         let createTime_FD_30 = await escrowContract.createTime_FD_30();
  //         dispatch({
  //           type: 'balance_FD_30',
  //           payload: {
  //             ...userAccounts,
  //             inFD_30: {
  //               ...userAccounts.inFD_30,
  //               amounts: balance_FD_30,
  //               createTime: createTime_FD_30.toNumber(),
  //               history: [data],
  //             },
  //           },
  //         });
  //         break;
  //       case 3:
  //         let balance_FD_60 = await escrowContract.depositsOf_FD_60();
  //         balance_FD_60 = utils.formatUnits(balance_FD_60, 18);
  //         let createTime_FD_60 = await escrowContract.createTime_FD_60();
  //         dispatch({
  //           type: 'balance_FD_60',
  //           payload: {
  //             ...userAccounts,
  //             inFD_60: {
  //               ...userAccounts.inFD_60,
  //               amounts: balance_FD_60,
  //               createTime: createTime_FD_60.toNumber(),
  //               history: [data],
  //             },
  //           },
  //         });
  //         break;
  //       case 4:
  //         let balance_FD_90 = await escrowContract.depositsOf_FD_90();
  //         balance_FD_90 = utils.formatUnits(balance_FD_90, 18);
  //         let createTime_FD_90 = await escrowContract.createTime_FD_90();
  //         dispatch({
  //           type: 'balance_FD_90',
  //           payload: {
  //             ...userAccounts,
  //             inFD_90: {
  //               ...userAccounts.inFD_90,
  //               amounts: balance_FD_90,
  //               createTime: createTime_FD_90.toNumber(),
  //               history: [data],
  //             },
  //           },
  //         });
  //         break;
  //       default:
  //         throw new Error(`updateBalance type no exist : ${accountType}`);
  //     }
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };
  const deposit = async (type: string, amount: string) => {
    try {
      if (!escrowContract) {
        return
      }
      if (amount === '' || amount === '0') {
        alert(' you can not deposit nothing')
        return
      }
      if (Number(amount) > Number(userAccounts.inAccount.amounts)) {
        alert(' you have no enough money to deposit !  Feel free to mint Token~~')
        return
      }
      switch (type) {
        case 'DD':
          dispatch({
            type: 'depositing_DD',
            payload: {
              ...userAccounts,
              inDD: { ...userAccounts.inDD, isDepositing: true },
            },
          })
          let depositTxn = await escrowContract.deposit_DD(utils.parseUnits(amount, 18), {
            gasLimit: 300000,
          })
          let depositReceipt = await depositTxn.wait()
          break
        case 'FD_30':
          dispatch({
            type: 'depositing_FD_30',
            payload: {
              ...userAccounts,
              inFD_30: { ...userAccounts.inFD_30, isDepositing: true },
            },
          })
          depositTxn = await escrowContract.deposit_FD_30(utils.parseUnits(amount, 18), {
            gasLimit: 300000,
          })
          depositReceipt = await depositTxn.wait()
          break
        case 'FD_60':
          dispatch({
            type: 'depositing_FD_60',
            payload: {
              ...userAccounts,
              inFD_60: { ...userAccounts.inFD_60, isDepositing: true },
            },
          })
          depositTxn = await escrowContract.deposit_FD_60(utils.parseUnits(amount, 18), {
            gasLimit: 300000,
          })
          depositReceipt = await depositTxn.wait()
          break
        case 'FD_90':
          dispatch({
            type: 'depositing_FD_90',
            payload: {
              ...userAccounts,
              inFD_90: { ...userAccounts.inFD_90, isDepositing: true },
            },
          })
          depositTxn = await escrowContract.deposit_FD_90(utils.parseUnits(amount, 18), {
            gasLimit: 300000,
          })
          depositReceipt = await depositTxn.wait()
          break
        default:
          throw new Error(`No existing deposit type ${type}`)
      }
    } catch (error) {
      setDepositingsToFalse()
      console.error(error)
    }
  }
  const withdraw = async (type: string, amount: string) => {
    try {
      if (!escrowContract) {
        return
      }
      if (amount === '' || amount === '0') {
        alert(' you can not withdraw nothing')
        return
      }
      switch (type) {
        case 'DD':
          dispatch({
            type: 'withdrawing_DD',
            payload: {
              ...userAccounts,
              inDD: { ...userAccounts.inDD, isWithdrawing: true },
            },
          })
          let withdrawTxn = await escrowContract.withdraw_DD(utils.parseUnits(amount, 18))
          let withdrawReceipt = await withdrawTxn.wait()
          break
        case 'FD_30':
          dispatch({
            type: 'withdrawing_FD_30',
            payload: {
              ...userAccounts,
              inFD_30: { ...userAccounts.inFD_30, isWithdrawing: true },
            },
          })
          withdrawTxn = await escrowContract.withdraw_FD_30(utils.parseUnits(amount, 18))
          withdrawReceipt = await withdrawTxn.wait()
          break
        case 'FD_60':
          dispatch({
            type: 'withdrawing_DD',
            payload: {
              ...userAccounts,
              inFD_60: { ...userAccounts.inFD_60, isWithdrawing: true },
            },
          })
          withdrawTxn = await escrowContract.withdraw_FD_60(utils.parseUnits(amount, 18))
          withdrawReceipt = await withdrawTxn.wait()
          break
        case 'FD_90':
          dispatch({
            type: 'withdrawing_DD',
            payload: {
              ...userAccounts,
              inFD_90: { ...userAccounts.inFD_90, isWithdrawing: true },
            },
          })
          withdrawTxn = await escrowContract.withdraw_FD_90(utils.parseUnits(amount, 18))
          withdrawReceipt = await withdrawTxn.wait()
          break
        default:
          throw new Error(`No existing withdraw type ${type}`)
      }
    } catch (error: any) {
      setWithdrawingsToFalse()
      console.error(error)
      if (error.code === 'UNSUPPORTED_OPERATION') {
        alert('not available withdrawTime or invalid input value~~')
      } else {
        alert(error.error.message)
      }
    }
  }
  const setDepositingsToFalse = () => {
    dispatch({
      type: 'depositing_DD',
      payload: {
        ...userAccounts,
        inDD: { ...userAccounts.inDD, isDepositing: false },
      },
    })
    dispatch({
      type: 'depositing_FD_30',
      payload: {
        ...userAccounts,
        inFD_30: { ...userAccounts.inFD_30, isDepositing: false },
      },
    })
    dispatch({
      type: 'depositing_FD_60',
      payload: {
        ...userAccounts,
        inFD_60: { ...userAccounts.inFD_60, isDepositing: false },
      },
    })
    dispatch({
      type: 'depositing_FD_90',
      payload: {
        ...userAccounts,
        inFD_90: { ...userAccounts.inFD_90, isDepositing: false },
      },
    })
  }
  const setWithdrawingsToFalse = () => {
    dispatch({
      type: 'withdrawing_DD',
      payload: {
        ...userAccounts,
        inDD: { ...userAccounts.inDD, isWithdrawing: false },
      },
    })
    dispatch({
      type: 'withdrawing_FD_30',
      payload: {
        ...userAccounts,
        inFD_30: { ...userAccounts.inFD_30, isWithdrawing: false },
      },
    })
    dispatch({
      type: 'withdrawing_FD_60',
      payload: {
        ...userAccounts,
        inFD_60: { ...userAccounts.inFD_60, isWithdrawing: false },
      },
    })
    dispatch({
      type: 'withdrawing_FD_90',
      payload: {
        ...userAccounts,
        inFD_90: { ...userAccounts.inFD_90, isWithdrawing: false },
      },
    })
  }

  useEffect(() => {
    const check = setInterval(() => {
      checkCurrentAccount()
    }, 3000)
    getUserBalance(currentAccount)
    return () => {
      clearInterval(check)
    }
  }, [currentAccount])
  useEffect(() => {
    if (isSwitchingNetwork && isSepolia && currentAccount) {
      window.location.reload()
    }
  }, [isSepolia, currentAccount])
  useEffect(() => {
    escrowContract?.on('Deposit', (accountAddress: string, amount, accountType: number) => {
      getUserBalance(accountAddress)
    })
    escrowContract?.on('Withdraw', (accountAddress: string, amount, accountType: number) => {
      getUserBalance(accountAddress)
    })
    return () => {
      escrowContract?.off('Deposit', () => {
        console.log('stopListeningD')
      })
      escrowContract?.off('Withdraw', () => {
        console.log('stopListeningW')
      })
    }
    // }, [escrowContract]);
    // }, [isRinkeby]);
  }, [currentAccount])

  // useEffect(() => {
  //   escrowContract?.on(
  //     'Deposit',
  //     (accountAddress: string, amount, accountType: number) => {
  //       const eventFilter = escrowContract.filters.Deposit(accountAddress);
  //       updateBalance(accountAddress, 'Deposit', eventFilter, accountType);
  //       switch (accountType) {
  //         case 1:
  //           dispatch({
  //             type: 'depositing_DD',
  //             payload: {
  //               ...userAccounts,
  //               inDD: {...userAccounts.inDD, isDepositing: false},
  //             },
  //           });
  //           break;
  //         case 2:
  //           dispatch({
  //             type: 'depositing_FD_30',
  //             payload: {
  //               ...userAccounts,
  //               inFD_30: {...userAccounts.inFD_30, isDepositing: false},
  //             },
  //           });
  //           break;
  //         case 3:
  //           dispatch({
  //             type: 'depositing_FD_60',
  //             payload: {
  //               ...userAccounts,
  //               inFD_60: {...userAccounts.inFD_60, isDepositing: false},
  //             },
  //           });
  //           break;
  //         case 4:
  //           dispatch({
  //             type: 'depositing_FD_90',
  //             payload: {
  //               ...userAccounts,
  //               inFD_90: {...userAccounts.inFD_90, isDepositing: false},
  //             },
  //           });
  //           break;
  //         default:
  //           throw new Error(`no depositing type exist : ${accountType}`);
  //       }
  //     }
  //   );
  //   escrowContract?.on(
  //     'Withdraw',
  //     (accountAddress: string, amount, accountType: number) => {
  //       const eventFilter = escrowContract.filters.Withdraw(accountAddress);
  //       updateBalance(accountAddress, 'Withdraw', eventFilter, accountType);
  //       switch (accountType) {
  //         case 1:
  //           dispatch({
  //             type: 'withdrawing_DD',
  //             payload: {
  //               ...userAccounts,
  //               inDD: {...userAccounts.inDD, isWithdrawing: false},
  //             },
  //           });
  //           break;
  //         case 2:
  //           dispatch({
  //             type: 'withdrawing_FD_30',
  //             payload: {
  //               ...userAccounts,
  //               inFD_30: {...userAccounts.inFD_30, isWithdrawing: false},
  //             },
  //           });
  //           break;
  //         case 3:
  //           dispatch({
  //             type: 'withdrawing_FD_60',
  //             payload: {
  //               ...userAccounts,
  //               inFD_60: {...userAccounts.inFD_60, isWithdrawing: false},
  //             },
  //           });
  //           break;
  //         case 4:
  //           dispatch({
  //             type: 'withdrawing_FD_90',
  //             payload: {
  //               ...userAccounts,
  //               inFD_90: {...userAccounts.inFD_90, isWithdrawing: false},
  //             },
  //           });
  //           break;
  //         default:
  //           throw new Error(`no withdrawing type exist : ${accountType}`);
  //       }
  //     }
  //   );
  //   return () => {
  //     escrowContract?.off('Deposit', () => {
  //       console.log('stopListeningD');
  //     });
  //     escrowContract?.off('Withdraw', () => {
  //       console.log('stopListeningW');
  //     });
  //   };
  // }, [currentAccount]);
  // }, [isRinkeby]);

  useEffect(() => {
    if (isMinting) {
      setIsMinting(false)
    }
  }, [userAccounts.inAccount.amounts])
  useEffect(() => {
    const provider = new providers.Web3Provider(ethereum)
    provider.on('network', (newNetwork, oldNetwork) => {
      if (oldNetwork) {
        window.location.reload()
      }
    })
    return () => {
      provider.off('network')
    }
  }, [])
  return (
    <div className='h-screen bg-slate-800 text-white overflow-hidden'>
      <AnimatePresence exitBeforeEnter>
        {!(isSepolia && currentAccount) && (
          <motion.div
            className='flex flex-col items-center'
            variants={landingPage}
            initial='init'
            animate='animate'
            exit='exit'
          >
            <p className='text-4xl py-8'>welcome to Ray bank.</p>
            {!currentAccount && (
              <motion.button
                className='px-4 py-2 rounded-xl bg-gradient-to-br from-orange-900 via-orange-700 to-orange-500'
                onClick={getAccount}
                variants={connectBtn}
                whileHover='hover'
                whileTap='tap'
              >
                Connect Wallet
              </motion.button>
            )}
            {!isSepolia && (
              <motion.button
                className='mt-2 px-4 py-2 rounded-xl bg-gradient-to-br from-orange-900 via-orange-700 to-orange-500'
                onClick={getSepolia}
                variants={connectBtn}
                whileHover='hover'
                whileTap='tap'
              >
                Switch to Sepolia
              </motion.button>
            )}
            <h3 className='mt-4 text-xl'>connect wallet and switch to sepolia testnet first ~</h3>
            <p>After that</p>
            <div className='text-sm'>
              <p>the page will refresh automatically, and you'll be access to the next page !</p>
              Feel free to mess around it, and don't worry switching between different accounts,
              <p>
                the info will update after a few seconds.
                <span className='pl-4'> Have fun!</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isSepolia && currentAccount && (
        <motion.div
          className='h-full flex flex-col pt-4 px-2 bg-slate-800 overflow-y-scroll md:pt-10 md:mx-0'
          variants={bankPage}
          initial='init'
          animate='animate'
          exit='exit'
        >
          <div className='basis-1/6 self-center flex space-x-10 text-center'>
            <div style={{ perspective: 200 }} className='flex flex-col items-center'>
              <p>get 10 tokens for free first</p>
              <motion.svg
                xmlns='http://www.w3.org/2000/svg'
                fill='currentColor'
                viewBox='0 0 16 16'
                className='w-14 h-14 text-yellow-500 cursor-pointer'
                onClick={mintFreeToken}
                variants={coinAnimate}
                animate={isMinting ? 'animate' : ''}
                whileHover='hover'
              >
                <path d='M5.5 9.511c.076.954.83 1.697 2.182 1.785V12h.6v-.709c1.4-.098 2.218-.846 2.218-1.932 0-.987-.626-1.496-1.745-1.76l-.473-.112V5.57c.6.068.982.396 1.074.85h1.052c-.076-.919-.864-1.638-2.126-1.716V4h-.6v.719c-1.195.117-2.01.836-2.01 1.853 0 .9.606 1.472 1.613 1.707l.397.098v2.034c-.615-.093-1.022-.43-1.114-.9H5.5zm2.177-2.166c-.59-.137-.91-.416-.91-.836 0-.47.345-.822.915-.925v1.76h-.005zm.692 1.193c.717.166 1.048.435 1.048.91 0 .542-.412.914-1.135.982V8.518l.087.02z' />
                <path d='M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z' />
                <path d='M8 13.5a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm0 .5A6 6 0 1 0 8 2a6 6 0 0 0 0 12z' />
              </motion.svg>
            </div>
            <div>
              <div>
                <span>Token in </span>
                <span className=' text-cyan-200'>
                  {currentAccount.slice(0, 4)}...{currentAccount.slice(-4)}
                </span>
              </div>
              <div className='pt-4 select-all'>{userAccounts.inAccount.amounts}</div>
            </div>
          </div>
          <div className='basis-5/6 md:flex'>
            <Bank
              accountInfo={userAccounts.inDD}
              accountType={'DD'}
              deposit={deposit}
              withdraw={withdraw}
              transformTime={transformTime}
            ></Bank>
            <Bank
              accountInfo={userAccounts.inFD_30}
              accountType={'FD_30'}
              deposit={deposit}
              withdraw={withdraw}
              transformTime={transformTime}
            ></Bank>
            <Bank
              accountInfo={userAccounts.inFD_60}
              accountType={'FD_60'}
              deposit={deposit}
              withdraw={withdraw}
              transformTime={transformTime}
            ></Bank>
            <Bank
              accountInfo={userAccounts.inFD_90}
              accountType={'FD_90'}
              deposit={deposit}
              withdraw={withdraw}
              transformTime={transformTime}
            ></Bank>
          </div>
        </motion.div>
      )}
    </div>
  )
}
export default App

const landingPage = {
  init: {
    scale: 4,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      ease: 'backOut',
      duration: 1,
    },
  },
  exit: {
    scale: 0.01,
    opacity: 0,
  },
}
const bankPage = {
  init: {
    scale: 5,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      delay: 1,
      ease: 'easeInOut',
      duration: 2,
    },
  },
  exit: {
    scale: 3,
  },
}
const connectBtn = {
  hover: {
    rotateZ: [0, 10, -10, 0],
  },
  tap: {
    scale: 3,
    opacity: 0,
    transition: {
      duration: 0.05,
    },
  },
}
const coinAnimate = {
  animate: {
    rotateY: [0, 360, 0],
    originX: 1.75,
    transition: { duration: 3, repeat: Infinity, repeatDelay: 0.4 },
  },
  hover: {
    scale: 1.1,
    originX: 1.5,
  },
}

{
  /* <ConnectButton /> */
}
{
  /* <div>
        <Link to='/'>home</Link>
        <Link to='/p1'>p1</Link>
        <Link to='/p2'>p2</Link>
      </div>
      <AnimatePresence initial={false} exitBeforeEnter>
        <Routes location={location} key={location.key}>
          <Route path='/' element={<Home />} />
          <Route path='/p1' element={<P1 />} />
          <Route path='/p2' element={<P2 />} />
        </Routes>
      </AnimatePresence> */
}
