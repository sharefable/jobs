import { executeQuery } from '../mysql';
import { EntryDurationType } from '../../api-contract';
import { TableName } from '../../types';

export const updateUpdatedAt = async (updatedAt: string, currentYmd: string,tableName: TableName) => {
  const query = `UPDATE ${tableName} SET updated_at = '${updatedAt}' WHERE date_ymd=${currentYmd} 
                 AND entry_duration_type='${EntryDurationType.CURRENT}'`;
  await executeQuery(query);
};