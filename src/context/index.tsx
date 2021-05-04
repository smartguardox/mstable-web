import { composedComponent } from '../utils/reactUtils'

import { AppProvider } from './AppProvider'
import { MassetProvider } from './MassetProvider'
import { NotificationsProvider } from './NotificationsProvider'
import { TransactionsProvider } from './TransactionsProvider'
import { ThemeProvider } from './ThemeProvider'
import { TokensProvider } from './TokensProvider'
import { BlockProvider } from './BlockProvider'
import { DataProvider } from './DataProvider/DataProvider'
import { ApolloProvider } from './ApolloProvider'
import { SelectedSaveVersionProvider } from './SelectedSaveVersionProvider'
import { NetworkProvider } from './NetworkProvider'
import { AccountProvider } from './AccountProvider'

export const Providers = composedComponent(
  NetworkProvider,
  MassetProvider,
  NotificationsProvider,
  ApolloProvider,
  AccountProvider,
  BlockProvider,
  TransactionsProvider,
  TokensProvider,
  DataProvider,
  AppProvider,
  SelectedSaveVersionProvider,
  ThemeProvider,
)
