import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
export declare function initializeDatabase(): Promise<Database<sqlite3.Database, sqlite3.Statement>>;
export declare function getDatabase(): Database;
export declare function closeDatabase(): Promise<void>;
export declare function testDatabaseConnection(): Promise<boolean>;
//# sourceMappingURL=database.d.ts.map