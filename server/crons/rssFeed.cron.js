import { toXML } from 'jstoxml';
import { cloneDeep } from 'lodash';
import moment from 'moment';
import config from '../../config/config';
import CronItem from '../helpers/cronItem.helper';
import { getAdFreeMp3 } from '../helpers/mp3.helper';
import app from '../../config/express';
import Post from '../models/post.model';

// RSS header
const publicFeedConfig = {
  _name: 'rss',
  _attrs: {
    version: '2.0',
    'xmlns:itunes': 'http://www.itunes.com/dtds/podcast-1.0.dtd',
    'xmlns:content': 'http://purl.org/rss/1.0/modules/content/'
  },
  _content: {
    channel: [
      { title: 'Software Daily' },
      { link: 'https://softwaredaily.com' },
      { language: 'en-us' },
      { copyright: '&#169; SoftwareDaily.com' },
      { lastBuildDate: () => new Date() },
      { 'itunes:author': 'SoftwareDaily.com' },
      { description: 'Technical interviews about software topics.' },
      { 'itunes:type': 'serial' },
      { 'itunes:summary': 'Technical interviews about software topics.' },
      {
        'itunes:owner': {
          'itunes:name': 'Software Daily',
          'itunes:email': 'jeff@softwareengineeringdaily.com',
        }
      },
      {
        'itunes:image': {
          _attrs: {
            href: 'https://www.softwaredaily.com/static/sedailywords.png'
          }
        }
      },
      {
        'itunes:category': {
          _attrs: {
            text: 'News'
          },
          'itunes:category': {
            _attrs: {
              text: 'Tech News'
            }
          }
        }
      }
    ]
  }
};

const privateFeedConfig = cloneDeep(publicFeedConfig);

function decode(text) {
  return (text || '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, '') // Corrention
    .replace(/amp;/g, '') // Correction in malformed links
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function encode(text) {
  return (text || '')
    .replace(/&/g, '&#038;')
    .replace(/amp;/g, '') // Correction in malformed links
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function callback() {
  const posts = await Post.find().where('status').equals('publish').lean();

  // mongoose sort is slower
  posts.sort((o1, o2) => {
    return o1.date >= o2.date ? -1 : 1;
  });

  const lastPost = posts[posts.length - 1];

  let episode = posts.length + 1;
  const seasonYear = moment(lastPost.date_gmt).year();

  posts.forEach((post) => {
    episode -= 1;

    if (!post.mp3) return; // missing mp3 breaks the rss list

    let description;

    const extractedDescription = post.excerpt.rendered.match(/ Download (.*?)[<]/) || post.excerpt.rendered.match(/[>](.*?)[<]/);

    if (extractedDescription && extractedDescription.length && extractedDescription[1]) {
      [, description] = extractedDescription;
      description = decode(description);
    }

    // RSS item for each episode
    publicFeedConfig._content.channel.push({
      item: {
        'itunes:episodeType': 'full',
        'itunes:episode': episode,
        'itunes:season': seasonYear - moment(post.date_gmt).year(),
        title: post.title.rendered,
        description: `<![CDATA[${description || post.title.rendered}]]>`,
        'itunes:image': {
          _attrs: {
            href: encode(post.mainImage)
          }
        },
        link: encode(post.link),
        enclosure: {
          _attrs: {
            type: 'audio/mpeg',
            url: post.mp3
          }
        },
        guid: parseInt(post.id, 10).toString(36),
        pubDate: moment.utc(post.date_gmt).toDate(),
        'itunes:explicit': false
      }
    });

    const privateMp3 = getAdFreeMp3(post.mp3);

    privateFeedConfig._content.channel.push({
      item: {
        'itunes:episodeType': 'full',
        'itunes:episode': episode,
        'itunes:season': seasonYear - moment(post.date_gmt).year(),
        title: post.title.rendered,
        description: `<![CDATA[${description || post.title.rendered}]]>`,
        'itunes:image': {
          _attrs: {
            href: encode(post.mainImage)
          }
        },
        link: encode(post.link),
        enclosure: {
          _attrs: {
            type: 'audio/mpeg',
            url: privateMp3
          }
        },
        guid: parseInt(post.id, 10).toString(36),
        pubDate: moment.utc(post.date_gmt).toDate(),
        'itunes:explicit': false
      }
    });
  });

  const xmlOptions = {
    header: true,
    indent: '  '
  };

  app.set('rssFeedPublic', toXML(publicFeedConfig, xmlOptions));
  app.set('rssFeedPrivate', toXML(privateFeedConfig, xmlOptions));
}

const rssFeed = {
  name: 'rssFeed',
  time: config.cron.RSS.time,
  timeZone: config.cron.RSS.timeZone,
  runOnInit: true,
  callback,
};

export default new CronItem(rssFeed);
