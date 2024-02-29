import { AWS_GLUE_TABLE_NAME, AWS_GLUE_USER_ASSIGN_TABLE_NAME } from '../glue_tables';

// If a job is running @6.15pm we process previous hours data, i.e. data till 5:59:59 pm
// Here currentJobRunTime represents 5:59:59 time

export const getMetricsData = (prevSuccessJobRunAt: string, currentJobRunTime: string) => {
  const query = `SELECT 
                   payload_tour_id, 
                   ymd, 
                   COUNT(distinct sid) AS views_all, 
                   COUNT(distinct aid) AS views_unique 
                   FROM (
                    SELECT 
                    aid, 
                    payload_tour_id, 
                    sid, 
                    ymd FROM  ${AWS_GLUE_TABLE_NAME} WHERE 
                    cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)), 2, '0') ) as bigint) >= ${prevSuccessJobRunAt} 
                    AND cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)), 2, '0') ) as bigint) < ${currentJobRunTime}
                    ) subquery GROUP BY payload_tour_id, ymd`;
  return query;
};
  
export const getConversionData = (prevSuccessJobRunAt: string, currentJobRunTime: string) => {
  const query = `SELECT 
                   payload_tour_id,
                   payload_btn_id,
                   ymd, 
                   COUNT(payload_ann_id) as clicks 
                 FROM (
                   select 
                      sid, 
                      payload_tour_id, 
                      payload_ann_id, 
                      payload_btn_id, 
                      ymd 
                   FROM ${AWS_GLUE_TABLE_NAME} WHERE payload_btn_type!='prev' AND 
                  cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)), 2, '0') ) as bigint) >= ${prevSuccessJobRunAt}
                  AND cast(concat(cast(ymd as varchar),lpad(cast(h as varchar(2)), 2, '0') ) as bigint) < ${currentJobRunTime} 
                  GROUP BY 
                  payload_tour_id, 
                  payload_btn_id, 
                  ymd, sid, 
                  payload_ann_id
                  ) subquery GROUP BY payload_tour_id, payload_btn_id,ymd;`;
  return query;
};
  
export const getAnnTourClicksData = (prevSuccessJobRunAt: string, currentJobRunTime: string) => {
  const query = `WITH datas AS (
    SELECT
    ymd,
    sid,
    payload_tour_id,
    payload_ann_id,
    SUM(time_spent) AS total_time_spent
    FROM (
       SELECT
          payload_tour_id,
          ymd,
          sid,
          payload_ann_id,
          COALESCE(uts - LAG(uts) OVER (PARTITION BY payload_tour_id, sid ORDER BY uts ASC), 5) AS time_spent
       FROM ${AWS_GLUE_TABLE_NAME} WHERE payload_btn_type != 'prev'
       AND (CAST(CONCAT(CAST(ymd AS VARCHAR), LPAD(CAST(h AS VARCHAR(2)), 2, '0')) AS BIGINT)) >= ${prevSuccessJobRunAt}
       AND (CAST(CONCAT(CAST(ymd AS VARCHAR), LPAD(CAST(h AS VARCHAR(2)), 2, '0')) AS BIGINT))  < ${currentJobRunTime}
   ) AS subquery
   GROUP BY
    ymd,
    payload_tour_id,
    payload_ann_id,
    sid
  ), percentiles AS (
    SELECT payload_tour_id, ymd, payload_ann_id,
           ARRAY[approx_percentile(total_time_spent, 0.01) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd),
                 approx_percentile(total_time_spent, 0.05) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd),
                 approx_percentile(total_time_spent, 0.10) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd),
                 approx_percentile(total_time_spent, 0.25) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd),
                 approx_percentile(total_time_spent, 0.50) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd),
                 approx_percentile(total_time_spent, 0.75) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd),
                 approx_percentile(total_time_spent, 0.90) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd),
                 approx_percentile(total_time_spent, 0.95) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd),
                 approx_percentile(total_time_spent, 0.99) OVER (PARTITION BY payload_tour_id, payload_ann_id, ymd)
                ] AS time_spent_dist
    FROM datas
  )
  , first_query AS (
    SELECT 
      payload_ann_id, 
      payload_tour_id, 
      ymd, 
      COUNT(distinct sid) AS views_all,
      COUNT(DISTINCT aid) AS views_unique
    FROM ${AWS_GLUE_TABLE_NAME} WHERE payload_btn_type != 'prev'
    AND (CAST(CONCAT(CAST(ymd AS VARCHAR), LPAD(CAST(h AS VARCHAR(2)), 2, '0')) AS BIGINT)) >= ${prevSuccessJobRunAt}
    AND (CAST(CONCAT(CAST(ymd AS VARCHAR), LPAD(CAST(h AS VARCHAR(2)), 2, '0')) AS BIGINT))  < ${currentJobRunTime}
    GROUP BY 
     payload_tour_id, 
     payload_ann_id,
     ymd
  )
  SELECT DISTINCT 
    f.payload_ann_id, 
    f.payload_tour_id, 
    f.ymd,
    f.views_all,
    f.views_unique,
    p.time_spent_dist
  FROM first_query f
  left JOIN percentiles p
  ON f.payload_tour_id = p.payload_tour_id AND f.payload_ann_id = p.payload_ann_id AND f.ymd = p.ymd;`;
  return query;
};

export const getUserAidMappingData = (prevSuccessJobRunAt: string, currentJobRunTime: string) => {
  const query = `SELECT DISTINCT
                    payload_tour_id, 
                    aid, 
                    payload_user_email
                    FROM ${AWS_GLUE_USER_ASSIGN_TABLE_NAME} WHERE 
                    cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)), 2, '0') ) as bigint) >= ${prevSuccessJobRunAt} 
                    AND cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)), 2, '0') ) as bigint) < ${currentJobRunTime}`;
  return query;
};

export const getAidSidMappingData = (prevSuccessJobRunAt: string, currentJobRunTime: string) => {
  const query = `SELECT DISTINCT
                    aid, 
                    sid
                    FROM ${AWS_GLUE_TABLE_NAME} WHERE 
                    cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)), 2, '0') ) as bigint) >= ${prevSuccessJobRunAt} 
                    AND cast(concat(cast(ymd as varchar), lpad(cast(h as varchar(2)), 2, '0') ) as bigint) < ${currentJobRunTime}`;
  return query;
};