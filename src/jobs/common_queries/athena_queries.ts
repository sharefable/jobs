import { AWS_GLUE_TABLE_NAME } from '../glue_tables';

export const getMetricsData = (successJobcurrentRunAt: string, jobDataScanningTime: string) => {
  const query = `SELECT payload_tour_id, ymd, COUNT(sid) AS views_all, COUNT(distinct aid) AS views_unique FROM 
                   (SELECT aid, payload_tour_id, sid, ymd FROM 
                   ${AWS_GLUE_TABLE_NAME} WHERE cast(concat(cast(ymd as varchar), 
                   lpad(cast(h as varchar(2)), 2, '0') ) as bigint)
                   >= ${successJobcurrentRunAt} AND cast(concat(cast(ymd as varchar), 
                   lpad(cast(h as varchar(2)), 2, '0') ) as bigint)
                   <= ${jobDataScanningTime}) subquery GROUP BY payload_tour_id, ymd`;
  return query;
};
  
export const getConversionData = (successJobcurrentRunAt: string, jobDataScanningTime: string) => {
  const query = `SELECT payload_tour_id,payload_btn_id,ymd, COUNT(payload_ann_id) 
                   as clicks FROM (select payload_tour_id, payload_ann_id, payload_btn_id,ymd 
                   FROM ${AWS_GLUE_TABLE_NAME} WHERE payload_btn_type!='prev' AND 
                   cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)), 2, '0') ) 
                   as bigint) >= ${successJobcurrentRunAt} AND cast(concat(cast(ymd as varchar), 
                   lpad(cast(h as varchar(2)), 2, '0') ) as bigint)
                   <= ${jobDataScanningTime}) 
                   subquery GROUP BY payload_tour_id, payload_btn_id, 
                   ymd ORDER BY ymd; `;
  return query;
};
  
export const getAnnTourClicksData= (successJobcurrentRunAt: string, jobDataScanningTime: string) => {
  const query = `WITH ranked_data AS ( SELECT payload_ann_id, payload_tour_id, ymd, COUNT(sid) as views_all, 
                   COUNT(distinct aid) as views_unique FROM ${AWS_GLUE_TABLE_NAME} WHERE 
                   payload_btn_type != 'prev' AND (cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)),
                   2, '0') ) as bigint)) >= ${successJobcurrentRunAt} AND cast(concat(cast(ymd as varchar), 
                   lpad(cast(h as varchar(2)), 2, '0') ) as bigint) <= ${jobDataScanningTime} GROUP BY payload_ann_id, 
                   payload_tour_id, ymd) SELECT DISTINCT payload_tour_id, ymd,payload_ann_id, views_all,
                   views_unique, ARRAY[approx_percentile(views_all, 0.01) OVER (PARTITION BY payload_tour_id),
                   approx_percentile(views_all, 0.05) OVER (PARTITION BY payload_tour_id),
                   approx_percentile(views_all, 0.10) OVER (PARTITION BY payload_tour_id),
                   approx_percentile(views_all, 0.25) OVER (PARTITION BY payload_tour_id),
                   approx_percentile(views_all, 0.50) OVER (PARTITION BY payload_tour_id),
                   approx_percentile(views_all, 0.75) OVER (PARTITION BY payload_tour_id),
                   approx_percentile(views_all, 0.90) OVER (PARTITION BY payload_tour_id),
                   approx_percentile(views_all, 0.95) OVER (PARTITION BY payload_tour_id),
                   approx_percentile(views_all, 0.99) OVER (PARTITION BY payload_tour_id)
                   ] AS time_spent_dist FROM ranked_data;`;
  return query;
};
