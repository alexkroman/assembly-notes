const { WebClient } = require('@slack/web-api');
const { getSettings } = require('./settings.js');
const log = require('./logger.js');

let slackClient = null;

function convertMarkdownToSlackMrkdwn(markdown) {
  let slackText = markdown;
  
  // Convert headers
  slackText = slackText.replace(/^### (.+)$/gm, '*$1*');
  slackText = slackText.replace(/^## (.+)$/gm, '*$1*');
  slackText = slackText.replace(/^# (.+)$/gm, '*$1*');
  
  // Convert bold text
  slackText = slackText.replace(/\*\*(.+?)\*\*/g, '*$1*');
  
  // Convert lists - Slack doesn't support markdown lists, so we'll use bullet points
  slackText = slackText.replace(/^- (.+)$/gm, '• $1');
  slackText = slackText.replace(/^\* (.+)$/gm, '• $1');
  
  // Convert numbered lists
  slackText = slackText.replace(/^\d+\. (.+)$/gm, '• $1');
  
  return slackText;
}

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
    const formattedSummary = convertMarkdownToSlackMrkdwn(summary);
    await slackClient.chat.postMessage({
      channel: slackChannel,
      text: `*${title}*\n\n${formattedSummary}`,
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
