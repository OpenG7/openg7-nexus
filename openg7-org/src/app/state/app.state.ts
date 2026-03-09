import { CompanyImportBulkState } from '@app/store/company-import-bulk/company-import-bulk.reducer';
import { ConnectionsState } from '@app/store/connections/connections.reducer';
import { StatisticsState } from '@app/store/statistics/statistics.reducer';

import { AuthState } from './auth/auth.selectors';
import { CatalogState } from './catalog/catalog.selectors';
import { MapState } from './map/map.selectors';
import { UserState } from './user/user.selectors';

export interface AppState {
  auth: AuthState;
  user: UserState;
  catalog: CatalogState;
  map: MapState;
  companyImportBulk: CompanyImportBulkState;
  connections: ConnectionsState;
  statistics: StatisticsState;
}
