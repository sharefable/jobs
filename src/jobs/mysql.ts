import { MysqlError } from 'mysql';
import { getConnection } from '../db';

export const executeQueryToFetchData = async<T>(query: string):Promise<T[]> => { 
  try {
    const rows: T[] = await executeQuery(query);
    return rows;
  } catch (err: any) {
    throw new Error(err.message);
  } 
};
  
export const executeQueryToInsertOrUpdateData = async(query: string) => {
  try {
    await executeQuery(query);
  } catch (err: any) {
    throw new Error(err.message);
  }
};
  
export async function executeQuery<T>(query: string) {
  const conn = await getConnection();
  return new Promise<T[]>((resolve, reject) => {
    !conn.query(query, (err: MysqlError | null, rows: T[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
      conn.release();
    });
  });
}