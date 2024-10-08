import { useEffect } from 'react';
import { usePrevious } from 'react-use';
import { Interface } from '@ethersproject/abi';
import { Provider } from '@ethersproject/providers';
import { constants } from 'ethers';
import type { ERC20Interface } from '@mstable/protocol/types/generated/ERC20';

import { useBlockNow } from '../context/BlockProvider';
import { useAccount } from '../context/UserProvider';
import {
  useAllowanceSubscriptionsSerialized,
  useBalanceSubscriptionsSerialized,
  useTokensDispatch,
} from '../context/TokensProvider';
import { useSigner } from '../context/OnboardProvider';
import { useEthBalance } from '../context/EthProvider';
import { BigDecimal } from '../web3/BigDecimal';

const contractInterface = (() => {
  const abi = [
    {
      constant: true,
      inputs: [
        {
          internalType: 'address',
          name: 'account',
          type: 'address',
        },
      ],
      name: 'balanceOf',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
    {
      constant: true,
      inputs: [
        {
          internalType: 'address',
          name: 'owner',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'spender',
          type: 'address',
        },
      ],
      name: 'allowance',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  ];
  return (new Interface(abi) as unknown) as ERC20Interface;
})();

/**
 * Updater for tracking token balances, performing fetches on each new
 * block, and keeping contract instances in state.
 */
export const TokenSubscriptionsUpdater = (): null => {
  const { reset, updateBalances, updateAllowances } = useTokensDispatch();
  const signer = useSigner();

  const account = useAccount();
  const prevAccount = usePrevious(account);
  const blockNumber = useBlockNow();
  const ethBalance = useEthBalance();

  const balanceSubscriptionsSerialized = useBalanceSubscriptionsSerialized();
  const allowanceSubscriptionsSerialized = useAllowanceSubscriptionsSerialized();

  // Clear all contracts and tokens if the account changes.
  useEffect(() => {
    if (prevAccount !== account || !account) {
      reset();
    }
  }, [account, prevAccount, reset]);

  useEffect(() => {
    if (account && signer && signer.provider) {
      const allowanceSubs: {
        address: string;
        spenders: string[];
        decimals: number;
      }[] = JSON.parse(allowanceSubscriptionsSerialized);

      const allowancePromises = allowanceSubs.flatMap(
        ({ address, spenders, decimals }) =>
          spenders.map(async spender => {
            const data = await (signer.provider as Provider).call({
              to: address,
              data: contractInterface.encodeFunctionData('allowance', [
                account,
                spender,
              ]),
            });
            const allowance = contractInterface.decodeFunctionResult(
              'allowance',
              data,
            );
            return {
              address,
              spender,
              allowance: new BigDecimal(allowance[0], decimals),
            };
          }),
      );

      Promise.all(allowancePromises)
        .then(allowances => {
          updateAllowances(
            allowances.reduce<Parameters<typeof updateAllowances>[0]>(
              (_allowances, { address, allowance, spender }) => ({
                ..._allowances,
                [address]: { ..._allowances[address], [spender]: allowance },
              }),
              {},
            ),
          );
        })
        .catch(console.error);
    }
  }, [
    account,
    allowanceSubscriptionsSerialized,
    blockNumber,
    signer,
    updateAllowances,
  ]);

  useEffect(() => {
    if (account && signer && signer.provider) {
      const balanceSubs: { address: string; decimals: number }[] = JSON.parse(
        balanceSubscriptionsSerialized,
      );

      const balancePromises = balanceSubs
        .filter(({ address }) => address !== constants.AddressZero)
        .map(async ({ address, decimals }) => {
          const data = await (signer.provider as Provider).call({
            to: address,
            data: contractInterface.encodeFunctionData('balanceOf', [account]),
          });
          const balance = contractInterface.decodeFunctionResult(
            'balanceOf',
            data,
          );
          return [address, new BigDecimal(balance[0], decimals)];
        });

      Promise.all(balancePromises)
        .then(balances => {
          updateBalances(Object.fromEntries(balances));
        })
        .catch(console.error);
    }
  }, [
    account,
    balanceSubscriptionsSerialized,
    blockNumber,
    signer,
    updateBalances,
  ]);

  useEffect(() => {
    updateBalances({
      [constants.AddressZero as string]: ethBalance as BigDecimal,
    });
  }, [ethBalance, updateBalances]);

  return null;
};
