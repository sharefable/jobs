import {Express, Request, Response} from 'express';
import {getLiveAndPublishedTourAssetsByRid, getTourByRid} from '../api';
import {RespTour} from '../api-contract';
import * as log from '../log';
import * as Sentry from '@sentry/node';

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

  if (data.gif) {
    blocks.blocks.push({
      'type': 'image',
      'image_url': data.gif,
      'alt_text': 'Fable demo hightlight gif',
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
