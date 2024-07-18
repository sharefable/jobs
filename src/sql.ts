import { MysqlError } from 'mysql';
import { getApiConnection } from './db';
  
export async function executeQuery<T>(query: string): Promise<T[]> {
  const conn = await getApiConnection();
  return new Promise<T[]>((resolve, reject) => {
    conn!.query(query, (err: MysqlError | null, rows: T[]) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
    conn.release();
  });
}
