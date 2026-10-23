import * as migration_20261023_052015_initial from './20261023_052015_initial';
import * as migration_20261023_060628_editorial_workflow from './20261023_060628_editorial_workflow';

export const migrations = [
  {
    up: migration_20261023_052015_initial.up,
    down: migration_20261023_052015_initial.down,
    name: '20261023_052015_initial',
  },
  {
    up: migration_20261023_060628_editorial_workflow.up,
    down: migration_20261023_060628_editorial_workflow.down,
    name: '20261023_060628_editorial_workflow'
  },
];
