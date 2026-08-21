import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import schema from './schema';
import {Shift, Event} from './models';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true, // Enable JSI for better performance
});

export const database = new Database({
  adapter,
  modelClasses: [Shift, Event],
  actionsEnabled: true,
});

export const initializeDatabase = async () => {
  // WatermelonDB initializes automatically when the database is created
  // This function can be used for any additional setup if needed
  return Promise.resolve();
};

export default database;
