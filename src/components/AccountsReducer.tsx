export type AccountHistory = {
  txnHash: string;
  time: string;
  method: string;
  amount: string;
};
export type Account = {
  amounts: string;
  createTime: number;
  history: AccountHistory[];
  isDepositing: boolean;
  isWithdrawing: boolean;
};
export type Accounts = {
  inAccount: Account;
  inDD: Account;
  inFD_30: Account;
  inFD_60: Account;
  inFD_90: Account;
};
type Action = {
  type: string;
  payload: Accounts;
};
const AccountsReducer = (state: Accounts, action: Action): Accounts => {
  const {type, payload} = action;
  switch (type) {
    case 'setAll':
      return payload;
    case 'balance_account':
      return {
        ...state,
        inAccount: {...state.inAccount, amounts: payload.inAccount.amounts},
      };
    case 'balance_DD':
      return {
        ...state,
        inDD: {
          ...state.inDD,
          amounts: payload.inDD.amounts,
          createTime: payload.inDD.createTime,
          history: [payload.inDD.history[0], ...state.inDD.history],
        },
      };
    case 'balance_FD_30':
      return {
        ...state,
        inFD_30: {
          ...state.inFD_30,
          amounts: payload.inFD_30.amounts,
          createTime: payload.inFD_30.createTime,
          history: [payload.inFD_30.history[0], ...state.inFD_30.history],
        },
      };
    case 'balance_FD_60':
      return {
        ...state,
        inFD_60: {
          ...state.inFD_60,
          amounts: payload.inFD_60.amounts,
          createTime: payload.inFD_60.createTime,
          history: [payload.inFD_60.history[0], ...state.inFD_60.history],
        },
      };
    case 'balance_FD_90':
      return {
        ...state,
        inFD_90: {
          ...state.inFD_90,
          amounts: payload.inFD_90.amounts,
          createTime: payload.inFD_90.createTime,
          history: [payload.inFD_90.history[0], ...state.inFD_90.history],
        },
      };
    case 'depositing_DD':
      return {
        ...state,
        inDD: {
          ...state.inDD,
          isDepositing: payload.inDD.isDepositing,
        },
      };
    case 'depositing_FD_30':
      return {
        ...state,
        inFD_30: {
          ...state.inFD_30,
          isDepositing: payload.inFD_30.isDepositing,
        },
      };
    case 'depositing_FD_60':
      return {
        ...state,
        inFD_60: {
          ...state.inFD_60,
          isDepositing: payload.inFD_60.isDepositing,
        },
      };
    case 'depositing_FD_90':
      return {
        ...state,
        inFD_90: {
          ...state.inFD_90,
          isDepositing: payload.inFD_90.isDepositing,
        },
      };
    case 'withdrawing_DD':
      return {
        ...state,
        inDD: {
          ...state.inDD,
          isWithdrawing: payload.inDD.isWithdrawing,
        },
      };
    case 'withdrawing_FD_30':
        return {
        ...state,
        inFD_30: {
          ...state.inFD_30,
          isWithdrawing: payload.inFD_30.isWithdrawing,
        },
      };
    case 'withdrawing_FD_60':
        return {
        ...state,
        inFD_60: {
          ...state.inFD_60,
          isWithdrawing: payload.inFD_60.isWithdrawing,
        },
      };
    case 'withdrawing_FD_90':
        return {
        ...state,
        inFD_90: {
          ...state.inFD_90,
          isWithdrawing: payload.inFD_90.isWithdrawing,
        },
      };
    default:
      throw new Error(`No existing action type: ${action.type}`);
  }
};
export default AccountsReducer;
