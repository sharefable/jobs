import { Connection, MysqlError } from 'mysql';
import { getConnection } from '../db';

export const executeQueryToFetchData = async<T>(query: string, conn?: Connection):Promise<T[]> => { 
  try {
    const rows: T[] = await executeQuery(query, conn);
    return rows;
  } catch (err: any) {
    throw new Error(err.message);
  } 
};
  
export const executeQueryToInsertOrUpdateData = async(query: string, conn?: Connection) => {
  try {
    await executeQuery(query, conn);
  } catch (err: any) {
    throw new Error(err.message);
  }
};
  
export async function executeQuery<T>(query: string, connection?: any): Promise<T[]> {
  const conn = connection || await getConnection() as Connection;
  return new Promise<T[]>((resolve, reject) => {
    conn!.query(query, (err: MysqlError | null, rows: T[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
    if (!connection) {
      conn.release();
    }
  });
}