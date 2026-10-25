import * as migration_20261024_151956_initial from './20261024_151956_initial';
import * as migration_20261025_124813_localization from './20261025_124813_localization';

export const migrations = [
  {
    up: migration_20261024_151956_initial.up,
    down: migration_20261024_151956_initial.down,
    name: '20261024_151956_initial',
  },
  {
    up: migration_20261025_124813_localization.up,
    down: migration_20261025_124813_localization.down,
    name: '20261025_124813_localization'
  },
];
