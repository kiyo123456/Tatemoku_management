import { Pool } from 'pg';
import { DbHelper } from './db-helpers';
export declare function initializeDatabase(): Promise<Pool | null>;
export declare function getDatabase(): Pool;
export declare function getDatabaseHelper(): DbHelper;
export declare function closeDatabase(): Promise<void>;
export declare function testDatabaseConnection(): Promise<boolean>;
//# sourceMappingURL=database.d.ts.map