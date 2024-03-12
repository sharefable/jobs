import * as log from '../../log';
import fs from 'fs';
import { downloadAthenaCsvDataToLocal, runAthenaQuery } from '../../jobs/athena';
import { CommonBase } from './common';

export abstract class UserWithIdMappingBase extends CommonBase {

  protected async execute(): Promise<void> {
    const query = await this.getAthenaQuery();
    this.baseValues.jobInfo.queryExecutionId = await runAthenaQuery(query);
    await this.uploadAthenaResultToDB(this.baseValues.jobInfo.queryExecutionId);
  }

  protected async uploadAthenaResultToDB(queryExecutionId: string): Promise<void> {
    const tempFilepath = await downloadAthenaCsvDataToLocal(queryExecutionId);
    try {
      await this.uploadAthenaCsvDataToDB(tempFilepath);
    } catch (err) {
      log.err('Something went wrong while trying to load csv data to database', (err as Error).message);
      throw err;
    } finally {
      log.info(`CleanUp: Deleting the file ${tempFilepath}`);
      try {
        fs.unlinkSync(tempFilepath);
        log.info(`CleanUp: Deleted the file ${tempFilepath}`);
      } catch (err) {
        log.warn('Something went wrong while deleting the file', (err as Error).stack);
      }
    }
  }

  protected abstract uploadAthenaCsvDataToDB (tempFilepath: string): Promise<void>;
}