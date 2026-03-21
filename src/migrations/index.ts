import * as migration_20260218_095609_init from './20260218_095609_init';
import * as migration_20260218_100505_player_auth from './20260218_100505_player_auth';
import * as migration_20260218_102706_lore_collection from './20260218_102706_lore_collection';
import * as migration_20260222_081138_lore_collection_remove_owner from './20260222_081138_lore_collection_remove_owner';
import * as migration_20260222_082103_lore_collection_add_department from './20260222_082103_lore_collection_add_department';
import * as migration_20260222_093330_lore_collection_add_visible from './20260222_093330_lore_collection_add_visible';
import * as migration_20260302_223900_inventory_collection from './20260302_223900_inventory_collection';
import * as migration_20260319_123325 from './20260319_123325';
import * as migration_20260320_134811 from './20260320_134811';
import * as migration_20260321_002131 from './20260321_002131';

export const migrations = [
  {
    up: migration_20260218_095609_init.up,
    down: migration_20260218_095609_init.down,
    name: '20260218_095609_init',
  },
  {
    up: migration_20260218_100505_player_auth.up,
    down: migration_20260218_100505_player_auth.down,
    name: '20260218_100505_player_auth',
  },
  {
    up: migration_20260218_102706_lore_collection.up,
    down: migration_20260218_102706_lore_collection.down,
    name: '20260218_102706_lore_collection',
  },
  {
    up: migration_20260222_081138_lore_collection_remove_owner.up,
    down: migration_20260222_081138_lore_collection_remove_owner.down,
    name: '20260222_081138_lore_collection_remove_owner',
  },
  {
    up: migration_20260222_082103_lore_collection_add_department.up,
    down: migration_20260222_082103_lore_collection_add_department.down,
    name: '20260222_082103_lore_collection_add_department',
  },
  {
    up: migration_20260222_093330_lore_collection_add_visible.up,
    down: migration_20260222_093330_lore_collection_add_visible.down,
    name: '20260222_093330_lore_collection_add_visible',
  },
  {
    up: migration_20260302_223900_inventory_collection.up,
    down: migration_20260302_223900_inventory_collection.down,
    name: '20260302_223900_inventory_collection',
  },
  {
    up: migration_20260319_123325.up,
    down: migration_20260319_123325.down,
    name: '20260319_123325',
  },
  {
    up: migration_20260320_134811.up,
    down: migration_20260320_134811.down,
    name: '20260320_134811',
  },
  {
    up: migration_20260321_002131.up,
    down: migration_20260321_002131.down,
    name: '20260321_002131'
  },
];
