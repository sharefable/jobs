import { JobBase } from './job';

export abstract class CommonAthenaBase extends JobBase {
  
  protected abstract getAthenaQuery (): Promise<string>;
}