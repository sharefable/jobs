import {Express, Request, Response} from 'express';
import {getLiveAndPublishedTourAssetsByRid } from '../api';
import {RespTour} from '../api-contract';
import * as log from '../log';
import * as Sentry from '@sentry/node';
import { executeQuery } from '../jobs/mysql';

const Table = require('ascii-table3');

function getMsgBlockFor(route: 'public' | 'private', data: {
  host: string,
  fullUrl: string,
  rid: string,
  gif?: string;
}, tour: RespTour) {
  const name = tour.site && tour.site.title || tour.displayName;
  const blocks = {
    'blocks': [
      {
        'type': 'header',
        'text': {
          'type': 'plain_text',
          'text': `:tada: ${name}`,
          'emoji': true,
        },
      },
    ],
  };

  if (tour.description) {
    blocks.blocks.push({
      'type': 'section',
      'text': {
        'type': 'mrkdwn',
        'text': tour.description,
      },
    } as any);
  }

  if (route === 'public') {
    const ctaLink = (tour.site || {}).ctaLink;
    const ctaText = (tour.site || {}).ctaText;
    const navLink = (tour.site || {}).navLink;
    const hasBookADemoBtn = ctaLink && ctaText;

    const btns = [];
    if (hasBookADemoBtn) {
      btns.push({
        type: 'button',
        action_id: 'book_a_demo_clicked',
        style: 'primary',
        url: ctaLink,
        text: {
          type: 'plain_text',
          text: ctaText,
        },
      });
    }
    if (navLink) {
      btns.push({
        type: 'button',
        action_id: 'navlink_clicked',
        url: navLink,
        text: {
          type: 'plain_text',
          text: 'Open website',
        },
      });
    }

    btns.push({
      type: 'button',
      action_id: 'checkout_demo',
      style: hasBookADemoBtn ? undefined : 'primary',
      url: data.fullUrl,
      text: {
        type: 'plain_text',
        text: 'Checkout demo',
      },
    });

    blocks.blocks.push({
      'type': 'actions',
      'elements': btns,
    } as any);
  } else {
    blocks.blocks.push({
      'type': 'actions',
      'elements': [{
        type: 'button',
        action_id: 'preview_demo',
        style: 'primary',
        url: `https://${data.host}/preview/demo/${data.rid}`,
        text: {
          type: 'plain_text',
          text: 'Preview demo',
        },
      }, {
        type: 'button',
        action_id: 'edit_demo',
        url: `https://${data.host}/demo/${data.rid}`,
        text: {
          type: 'plain_text',
          text: 'Edit demo',
        },
      }, {
        type: 'button',
        action_id: 'view_analytics',
        url: `https://${data.host}/a/demo/${data.rid}`,
        text: {
          type: 'plain_text',
          text: 'See analytics',
        },
      }],
    } as any);
  }

  return blocks;
}

async function unFurlSlackContent(urls: URL[], opts: {
  channel: string;
  eventTs: string;
  unfurlId: string;
}) {
  try {
    const unfurls: Record<string, any> = {};
    for (const url of urls) {
      if (url.searchParams.get('nf') === '1') continue;
      let pathname = url.pathname;
      if(pathname.endsWith('/')) pathname = pathname.substring(0, pathname.length - 1);
      let rid = '';
      // eslint-disable-next-line no-useless-escape
      const match = pathname.match(/\/demo\/([^\/]+)/);
      if (match && match[1]) rid = match[1];
      if (rid) {
        const tourInfo = await getLiveAndPublishedTourAssetsByRid(rid);
        let block;
        if ((pathname.startsWith('/live') || pathname.startsWith('/embed')) && tourInfo.publishedTour) {
          block = getMsgBlockFor('public', {
            host: url.hostname,
            fullUrl: url.href,
            rid: rid,
            gif: tourInfo.gifUrl,
          }, tourInfo.publishedTour);
        } else {
          block = getMsgBlockFor('private', {
            host: url.hostname,
            fullUrl: url.href,
            rid: rid,
            gif: tourInfo.gifUrl,
          }, tourInfo.liveTour);
        }

        if (block) {
          unfurls[url.href] = block;
        }
      }
    }

    const url = `https://slack.com/api/chat.unfurl?channel=${opts.channel}&ts=${opts.eventTs}&unfurls=${JSON.stringify(unfurls)}&unfurl_id=${opts.unfurlId}`;
    // uncomment for debug
    // console.log('>>> slakc', opts.channel, opts.eventTs, JSON.stringify(unfurls, null, 2), encodeURI(url));
    const resp = await fetch(encodeURI(url), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SLACK_FABLE_BOT_BOT_USER_TOKEN}`,
      },
    });

    const data: any = await resp.json();
    if (!(data && data.ok)) {
      log.info('Slack error while slack unfurling', JSON.stringify(unfurls, null, 2), data);
    }
  } catch (e) {
    log.err('Error while slack unfurling', JSON.stringify({
      ...opts,
      urls,
    }, null, 2), (e as Error).stack);
    Sentry.captureException(e);
  }
}


export default function addHttpListeners(app: Express) {
  app.post('/v1/slack/handle', (req: Request, res: Response) => {
    res.type('text/plain').send('ok');
  });

  app.post('/v1/slack/pango/user-details', async (req: Request, res: Response) => {
    const payloadStr = req.body.text;
    if (!payloadStr) {
      res.type('text/plain').send('Empty not allowd');
      return;
    }

    // format: email=hello@mail.com
    const nPayloadStr = payloadStr.trim();
    const [key, value] = nPayloadStr.split('=').map((w: string) => w.trim());
    if (key !== 'email') {
      res.type('text/plain').send('Invalid');
      return;
    }

    const result: any[] = await executeQuery(`SELECT * from user RIGHT OUTER JOIN user_org_join ON user.id = user_org_join.user_id
    INNER JOIN org ON user_org_join.org_id = org.id
    INNER JOIN subscriptions ON org.id = subscriptions.org_id
where  user.email like '${value}'`);

    if (result.length == 0) {
      res.type('text/plain').send(`No data found for user ${value}`);
      return;
    }

    let tableStr = `Data for user: ${value}\n\n`;
    let i = 0;
    for (const r of result) {
      const t = new Table.AsciiTable3(`Entry ${++i}`).setAligns([Table.AlignmentEnum.LEFT, Table.AlignmentEnum.LEFT]);
      Object.entries(r).forEach(([k, v]) => {
        if (k === 'auth_id' || k === 'avatar') return;
        t.addRow(k, v == undefined || v === null ? '<null>' : v);
      });
      tableStr += `${t.toString()}\n\n`;
    }

    res.type('text/plain').send(`
\`\`\`
${tableStr}
\`\`\` `);
  });

  app.post('/v1/slack/pango/update-feature', async (req: Request, res: Response) => {
    try {
      const payloadStr = req.body.text;
      if (!payloadStr) {
        res.type('text/plain').send('Empty not allowd');
        return;
      }

      const nPayloadStr = payloadStr.trim();
      const lines = nPayloadStr.split(/\n+/);
      const [orgIdStr, ...featureGateOverrideArr] = lines;
      const featureOverride = featureGateOverrideArr.join('\n');

      const [key, orgId] = orgIdStr.split('=').map((w: string) => w.trim()); 
      if (key.toLowerCase() !== 'orgid') {
        res.type('text/plain').send('Invalid');
        return;
      }
      const nOrgId = +(orgId.trim());
      if (Number.isNaN(nOrgId)) {
        res.type('text/plain').send('Invalid orgId. It could only be a number');
        return;
      }

      const orgs = await executeQuery(`select * from org where id = ${nOrgId}`);
      const org: any = orgs[0];
      if (!org) {
        res.type('text/plain').send(`Org with id ${nOrgId} not found`);
        return;
      }

      if (!featureOverride) {
        res.type('text/plain').send('Invalid feature override. It should be in ```json``` format');
        return;
      }

      let nFeatureOverride = featureOverride.trim();
      if (!(nFeatureOverride.startsWith('```') && nFeatureOverride.endsWith('```'))) {
        res.type('text/plain').send('Invalid feature override. It should be in ```json``` format');
        return;
      }

      nFeatureOverride = nFeatureOverride.substring(3, nFeatureOverride.length - 3);
      try {
        let info;
        if (!info) {
          info = {
            useCases: ['marketing'],
            othersText: '',
          };
        } else info = JSON.parse(org.info);

        if (nFeatureOverride === 'null') {
          delete info.bet;
        } else {
          const featureOverrideJson = JSON.parse(nFeatureOverride);
          if ('useCases' in featureOverrideJson
            || 'othersText' in featureOverrideJson
            || 'bet' in featureOverrideJson
            || 'featureGateOverride' in featureOverrideJson) {
            res.type('text/plain').send('Feature override should not have useCases or othersText or bet or featureGateOverride');
            return;
          }

          info = {
            ...info,
            bet: {
              featureGateOverride: featureOverrideJson,
            },
          };
        }

        await executeQuery(`update org set info = '${JSON.stringify(info)}' where id = ${nOrgId}`);
        res.type('text/plain').send(`Updated featuregatematrix for orgId=${nOrgId}.
From:
\`\`\`
${JSON.stringify(JSON.parse(org.info), null, 2)}
\`\`\`
To:
\`\`\`
${JSON.stringify(info, null, 2)}
\`\`\` `);
      } catch (e) {
        // eslint-disable-next-line prefer-template
        res.type('text/plain').send('Invalid feature override. It should be in ```json``` format. Error: ' + (e as Error).message);
        return;
      }
    } catch(e) {
      // eslint-disable-next-line prefer-template
      res.type('text/plain').send('Error while updating feature override' + (e as Error).message);
    }
  });

  app.post('/v1/slack/url_verification', (req: Request, res: Response) => {
    const body = req.body;
    if (body.type === 'url_verification') {
      res.type('text/plain').send(body.challenge);
      return;
    }

    if (body.event && body.event.type === 'link_shared') {
      const links = body.event.links;
      const urls = links.map((l: any) => new URL(l.url));
      setTimeout(() => unFurlSlackContent(urls, {
        channel: body.event.channel,
        eventTs: body.event.message_ts,
        unfurlId: body.event.unfurl_id,
      }), 0);
      res.status(200).type('text/plain').send('ok');
    }
    res.status(404).send();
  });

}
