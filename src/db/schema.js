import {appSchema, tableSchema} from '@nozbe/watermelondb';

export default appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'shifts',
      columns: [
        {name: 'start_time', type: 'number'},
        {name: 'end_time', type: 'number', isOptional: true},
        {name: 'current_state', type: 'string'},
      ],
    }),
    tableSchema({
      name: 'events',
      columns: [
        {name: 'shift_id', type: 'string'},
        {name: 'timestamp', type: 'number'},
        {name: 'lat', type: 'number', isOptional: true},
        {name: 'lng', type: 'number', isOptional: true},
        {name: 'speed', type: 'number', isOptional: true},
        {name: 'activity_type', type: 'string', isOptional: true},
        {name: 'event_type', type: 'string'},
      ],
    }),
  ],
});
