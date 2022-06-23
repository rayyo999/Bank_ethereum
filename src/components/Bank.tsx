import {FC, useState} from 'react';
import {motion} from 'framer-motion';
import {nanoid} from 'nanoid';
import {Account, AccountHistory} from './AccountsReducer';
type Bank = {
  accountInfo: Account;
  accountType: string;
  deposit: (type: string, amount: string) => Promise<void>;
  withdraw: (type: string, amount: string) => Promise<void>;
  transformTime: (time: number, add: number) => string;
};
const Bank: FC<Bank> = ({
  accountInfo,
  accountType,
  deposit,
  withdraw,
  transformTime,
}) => {
  const [inputD, setInputD] = useState('');
  const [inputW, setInputW] = useState('');
  return (
    <div className='pb-4 md:flex md:flex-col md:w-1/4 md:p-2'>
      <div className='py-2 flex items-center gap-2 md:flex-col'>
        <div className='w-2/5 md:w-full'>
          <div className='flex'>
            <div
              className='basis-1/2 flex justify-center text-lime-100'
              onClick={() => {
                deposit(accountType, inputD);
              }}
            >
              <motion.svg
                xmlns='http://www.w3.org/2000/svg'
                width='50'
                height='50'
                viewBox='0 0 16 16'
                className='stroke-current cursor-pointer'
                animate={accountInfo.isDepositing ? 'animate' : ''}
                whileHover={{scale: 1.1, originX: 1.8, originY: 0}}
              >
                <motion.path
                  variants={pathVariant}
                  fill='none'
                  d='M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z'
                />
              </motion.svg>
            </div>
            <div
              className='basis-1/2 flex justify-center text-rose-100'
              onClick={() => {
                withdraw(accountType, inputW);
              }}
            >
              <motion.svg
                xmlns='http://www.w3.org/2000/svg'
                width='50'
                height='50'
                viewBox='0 0 16 16'
                className='stroke-current cursor-pointer'
                animate={accountInfo.isWithdrawing ? 'animate' : ''}
                whileHover={{scale: 1.1, originX: 1.8, originY: 3.2}}
              >
                <motion.path
                  variants={pathVariant}
                  fill='none'
                  d='M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z'
                />
              </motion.svg>
            </div>
          </div>
          <div className='flex flex-col gap-1 md:flex-row '>
            <input
              type='number'
              className='rounded text-yellow-900 bg-lime-100 w-full md:w-1/2'
              value={inputD}
              onChange={(e) => {
                setInputD(e.target.value);
              }}
            />
            <input
              type='number'
              className='rounded text-yellow-900 bg-rose-100 w-full md:w-1/2'
              value={inputW}
              onChange={(e) => {
                setInputW(e.target.value);
              }}
            />
          </div>
        </div>
        <div className='w-full'>
          <h3 className='text-2xl text-yellow-500 md:text-center py-2'>
            {accountType === 'DD'
              ? 'Demand Deposit'
              : accountType === 'FD_30'
              ? 'Fixed Deposit 30 days'
              : accountType === 'FD_60'
              ? 'Fixed Deposit 60 days'
              : 'Fixed Deposit 90 days'}
          </h3>
          <p className='text-sm'>
            {accountType === 'DD'
              ? 'Create Account At :'
              : 'Withdraw available :'}
          </p>
          <p className='text-xs'>
            {accountInfo.createTime === 0
              ? " You haven't deposit!"
              : transformTime(accountInfo.createTime, 0)}
          </p>
          <p>Total Amounts :</p>
          <p className='select-all'>{accountInfo.amounts}</p>
        </div>
      </div>
      <motion.div layout className='flex overflow-x-auto snap-x md:flex-col'>
        {accountInfo.history.map((event: AccountHistory) => {
          const style = 'p-2 rounded ';
          return (
            <div
              key={nanoid()}
              className='basis-1/2 flex-none p-1 snap-start md:flex-1 md:px-0'
            >
              <div
                className={
                  event.method === 'Deposit'
                    ? style + ' bg-stone-700'
                    : style + ' bg-stone-500'
                }
              >
                <p className='text-xs'>{event.time}</p>
                <p className='text-xs'>{event.method} : </p>
                <p className='pt-2'>{event.amount}</p>
                <a
                  href={`https://rinkeby.etherscan.io/tx/${event.txnHash}`}
                  target='_blank'
                  className=' text-2xs underline underline-offset-1'
                >
                  view on etherscan
                </a>
              </div>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};
export default Bank;

const pathVariant = {
  animate: {
    pathLength: [1.01, 0, 1.01],
    transition: {
      duration: 4,
      repeat: Infinity,
      repeatDelay: 0.5,
    },
  },
};
