import { executeQuery } from '../mysql';
import { AnalyticsUserAidMappingEntity, TableName } from '../../types';

export const getTourLeadsForYmd = async (ymd: string) => {
  const query = `SELECT DISTINCT aid, tour_id From ${TableName.AnalyticsUserAidMapping} WHERE date_ymd <= ${ymd};`;
  const tourLeads: AnalyticsUserAidMappingEntity[] = await executeQuery(query);
  return tourLeads;
};