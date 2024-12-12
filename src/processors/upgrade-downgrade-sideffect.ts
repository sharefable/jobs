import {lockUnlockAllDemosForOrg, republishDemo} from '../api';
import { TMsgAttrs } from '../types';
import * as log from '../log';
import * as Sentry from '@sentry/node';

export interface EventPayload {
  orgIdStr: string;
  orgId: number;
  beforePlan: string;
  afterPlan: string;
}

type IProps = EventPayload & TMsgAttrs;

export async function upgradeDowngradeSideEffect(props: TMsgAttrs) {
  const tProps = props as IProps;
  tProps.orgId = +tProps.orgIdStr;

  if (tProps.afterPlan === tProps.beforePlan) {
    log.info(`Plans have not upgraded or downgraded, skipping. before ${tProps.beforePlan}. after ${tProps.afterPlan}`);
    return;
  }

  try {
    const shouldLock = tProps.afterPlan === 'SOLO';
    const changedDemos = await lockUnlockAllDemosForOrg(tProps.orgId, shouldLock);

    log.info('upgrade downgrade sideffect: shouldLock', shouldLock, 'changedDemos', changedDemos);
    for (const rid of changedDemos) {
      try {
        await republishDemo(rid);
        log.info(`Republished ${rid}. Lock status ${shouldLock}`);
      } catch(e) {
        log.err(`Can't replublish demo ${rid}`, (e as Error).stack);
      }
    }

  } catch (e) {
    log.err('Error while performing upgrade downgrade sideffect', (e as Error).stack);
    Sentry.captureException(e);
  }
  // 1. Lock / unlock all demos in org
  // 2. Publish all demos in org
}
