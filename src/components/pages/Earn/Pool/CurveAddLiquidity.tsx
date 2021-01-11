import React, { FC, useCallback } from 'react';
import Skeleton from 'react-loading-skeleton';
import styled from 'styled-components';

import {
  CURVE_ADDRESSES,
  useCurveContracts,
} from '../../../../context/earn/CurveProvider';
import { TransactionManifest } from '../../../../web3/TransactionManifest';
import { Interfaces } from '../../../../types';
import { TransactionForm } from '../../../forms/TransactionForm';
import { TokenAmountInput } from '../../../forms/TokenAmountInput';
import { H3, P } from '../../../core/Typography';
import {
  useCurrentStakingToken,
  useStakingRewardContractDispatch,
  useStakingRewardsContractState,
} from '../StakingRewardsContractProvider';
import { CountUp } from '../../../core/CountUp';
import { Tabs } from '../types';

const Row = styled.div`
  width: 100%;
  padding-bottom: 16px;
`;

const ExitLink = styled.span`
  border-bottom: 1px black solid;
  cursor: pointer;
`;

const tokenAddresses = [
  CURVE_ADDRESSES.MUSD_TOKEN,
  ...CURVE_ADDRESSES['3POOL_COINS'],
];

const Input: FC = () => {
  const {
    addLiquidity: { amount, formValue, error, needsUnlock, token },
    stakingRewardsContract,
  } = useStakingRewardsContractState();
  const {
    setAddLiquidityMaxAmount,
    setAddLiquidityAmount,
    setAddLiquidityToken,
  } = useStakingRewardContractDispatch();

  if (!stakingRewardsContract) {
    return <Skeleton height={300} />;
  }

  return (
    <Row>
      <H3>Add liquidity</H3>
      <div>
        <TokenAmountInput
          needsUnlock={needsUnlock}
          amountValue={formValue}
          error={error}
          exactDecimals
          name="stake"
          spender={CURVE_ADDRESSES.MUSD_DEPOSIT}
          onChangeAmount={setAddLiquidityAmount}
          onSetMax={setAddLiquidityMaxAmount}
          onChangeToken={setAddLiquidityToken}
          tokenAddresses={tokenAddresses}
          tokenValue={token}
          approveAmount={amount}
        />
      </div>
    </Row>
  );
};

const Confirm: FC = () => {
  const {
    tokens,
    addLiquidity: { amount, token },
  } = useStakingRewardsContractState();
  const collateralToken = token ? tokens[token] : undefined;
  const stakingToken = useCurrentStakingToken();

  return amount && stakingToken && collateralToken ? (
    <div>
      <P>
        You are adding liquidity of{' '}
        <CountUp end={amount?.simple} suffix={` ${collateralToken.symbol}`} />{' '}
        into this pool.
      </P>
      <P>
        You will receive {stakingToken.symbol} LP tokens which can be deposited
        to earn rewards.
      </P>
    </div>
  ) : null;
};

const CURVE_ALL_COINS = [
  CURVE_ADDRESSES.MUSD_TOKEN,
  ...CURVE_ADDRESSES['3POOL_COINS'],
];

export const CurveAddLiquidity: FC = () => {
  const {
    addLiquidity: { amount, valid, token },
    stakingRewardsContract: { expired = false } = {},
  } = useStakingRewardsContractState();

  const { setActiveTab } = useStakingRewardContractDispatch();

  const curveContracts = useCurveContracts();

  const createTransaction = useCallback(
    (
      formId: string,
    ): TransactionManifest<Interfaces.CurveDeposit, 'add_liquidity'> | void => {
      if (valid && amount && curveContracts.musdDeposit) {
        const index = CURVE_ALL_COINS.findIndex(address => address === token);
        const amounts = [0, 0, 0, 0].map((_, _index) =>
          _index === index ? amount.exact : 0,
        );

        // 99% of amount (i.e. 1% slippage)
        const minLPTokensToMint = amount.exact.sub(amount.exact.div(10));

        return new TransactionManifest(
          curveContracts.musdDeposit,
          'add_liquidity',
          [amounts, minLPTokensToMint],
          {
            present: 'Adding liquidity',
            past: 'Added liquidity',
          },
          formId,
        );
      }
    },
    [valid, amount, curveContracts.musdDeposit, token],
  );

  return expired ? (
    <div>
      <H3>Pool expired</H3>
      <P>
        This pool has now expired; new stakes should not be deposited, and the
        pool should be{' '}
        <ExitLink
          onClick={() => {
            setActiveTab(Tabs.Exit);
          }}
        >
          exited
        </ExitLink>
        .
      </P>
    </div>
  ) : (
    <TransactionForm
      formId="curveLP"
      confirmLabel="Add liquidity"
      confirm={<Confirm />}
      createTransaction={createTransaction}
      input={<Input />}
      valid={valid}
    />
  );
};
