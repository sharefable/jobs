import { executeQuery } from '../mysql';
import { AnalyticsUserAidMappingEntity, TableName } from '../../types';

export const getTourUsersForCurrentYmd = async (ymd: string) => {
  const query = `SELECT * From ${TableName.AnalyticsUserAidMapping} WHERE date_ymd <= ${ymd};`;
  const tourUsers: AnalyticsUserAidMappingEntity[] = await executeQuery(query);
  return tourUsers;
};