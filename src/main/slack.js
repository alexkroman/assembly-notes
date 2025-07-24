const { WebClient } = require('@slack/web-api');
const { getSettings } = require('./settings.js');
const log = require('./logger.js');

let slackClient = null;

async function postToSlack(summary, title) {
  const settings = getSettings();
  const slackToken = settings.slackToken;
  const slackChannel = settings.slackChannel;

  if (!slackToken || !slackChannel) {
    return;
  }

  if (!slackClient || slackClient.token !== slackToken) {
    slackClient = new WebClient(slackToken);
  }

  try {
    await slackClient.chat.postMessage({
      channel: slackChannel,
      text: `*${title}*\n\n${summary}`,
      mrkdwn: true,
    });
  } catch (error) {
    log.error(`Error posting to Slack: ${error.message}`);
  }
}

function resetSlackClient() {
  slackClient = null;
}

module.exports = { postToSlack, resetSlackClient };
