const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/extract', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: 'Missing URL' });

  try {
    // ----------- YouTube -----------
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const info = await ytdl.getInfo(videoUrl);
      const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
      const bestFormat = formats[formats.length - 1];
      return res.json({
        title: info.videoDetails.title,
        thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url,
        url: bestFormat.url,
        platform: 'YouTube',
      });
    }

    // ----------- TikTok -----------
    if (videoUrl.includes('tiktok.com')) {
      const resp = await fetch(videoUrl);
      const html = await resp.text();
      const match = html.match(/"downloadAddr":"([^"]+)"/);
      if (match) {
        const downloadUrl = decodeURIComponent(match[1]);
        const titleMatch = html.match(/"desc":"([^"]+)"/);
        const title = titleMatch ? decodeURIComponent(titleMatch[1]) : 'TikTok Video';
        return res.json({
          title,
          thumbnail: '', // optional
          url: downloadUrl,
          platform: 'TikTok',
        });
      }
    }

    // ----------- Instagram -----------
    if (videoUrl.includes('instagram.com')) {
      const resp = await fetch(videoUrl);
      const html = await resp.text();
      const match = html.match(/"display_url":"([^"]+)"/);
      const videoMatch = html.match(/"video_url":"([^"]+)"/);
      const titleMatch = html.match(/"title":"([^"]+)"/) || html.match(/"edge_media_to_caption":\{"edges":\[\{"node":\{"text":"([^"]+)"\}\}\]/);
      if (match || videoMatch) {
        return res.json({
          title: titleMatch ? decodeURIComponent(titleMatch[1]) : 'Instagram Video',
          thumbnail: match ? decodeURIComponent(match[1]) : '',
          url: videoMatch ? decodeURIComponent(videoMatch[1]) : '',
          platform: 'Instagram',
        });
      }
    }

    // ----------- Twitter/X -----------
    if (videoUrl.includes('twitter.com')) {
      const resp = await fetch(videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await resp.text();
      const videoMatch = html.match(/"video_url":"([^"]+)"/);
      const titleMatch = html.match(/"full_text":"([^"]+)"/);
      if (videoMatch) {
        return res.json({
          title: titleMatch ? decodeURIComponent(titleMatch[1]) : 'Twitter Video',
          thumbnail: '', // optional
          url: decodeURIComponent(videoMatch[1]),
          platform: 'Twitter',
        });
      }
    }

    // ----------- Unsupported -----------
    return res.status(400).json({ error: 'Platform not supported or video is private' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extract video' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
