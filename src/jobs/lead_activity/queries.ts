import { executeQuery } from '../mysql';
import { AnalyticsUserAidMappingEntity, Demo, TableName } from '../../types';

export const getTourLeadsForYmd = async (ymd: string) => {
  const query = `SELECT DISTINCT * From ${TableName.AnalyticsUserAidMapping} WHERE date_ymd <= ${ymd} ORDER BY date_ymd;`;
  const tourLeads: AnalyticsUserAidMappingEntity[] = await executeQuery(query);
  return tourLeads;
};

export const getTourDetails = async (tourId: number) => {
  const query = `SELECT * From ${TableName.Tour} WHERE id = ${tourId};`;
  const tour: Demo[] = await executeQuery(query);
  return tour;
};