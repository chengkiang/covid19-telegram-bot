'use strict';

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
const AsciiTable = require('ascii-table')

const token = 'YOUR_API_KEY';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/corona/, async (msg, match) => {
  const chatId = msg.chat.id;
  const coronaInfo = await getCoronaInfo();
  const coronaSummary = await getCoronaSummary();

  await bot.sendMessage(chatId, `<strong>${coronaInfo.title}</strong>\n${coronaInfo.body}\n<code>${coronaSummary}</code>`, { parse_mode: "HTML" });
  await bot.sendPhoto(chatId, `https://www.gov.sg/${coronaInfo.dorsconImg}`)
});

async function getCoronaInfo() {
  const coronaUrl = 'https://www.gov.sg/features/covid-19';
  const res = await axios.get(coronaUrl)
  const $ = cheerio.load(res.data);

  const title = '';
  const content = $('.feature-intro__content').text().trim()
  const body = content.substr(content.indexOf('Case Summary'))

  const dorsconImg = $('.component img.img-responsive[src*=dorscon]').attr("src")

  return {
    title, body, dorsconImg
  }
}

async function getCoronaSummary() {
  const data = await axios.get('https://spreadsheets.google.com/feeds/list/1lwnfa-GlNRykWBL5y7tWpLxDoCfs8BvzWxFjeOZ1YJk/1/public/values?alt=json')

  const table = new AsciiTable()
  table.setHeading('#', 'Country', 'Cases', 'Deaths')

  const entries = data.data.feed.entry;
  const updated = data.data.feed.updated['$t']

  const summary = entries
    .sort((a, b) => (b['gsx$confirmedcases']['$t'] || 0) - (a['gsx$confirmedcases']['$t'] || 0))
    .slice(0, 10).map(entry => {
      return {
        country: entry['gsx$country']['$t'].replace(' (Diamond Princess)', ''),
        cases: entry['gsx$confirmedcases']['$t'] || 0,
        deaths: entry['gsx$reporteddeaths']['$t'] || 0
      }
    })

  summary.forEach((line, index) => {
    table.addRow(index + 1, line.country, line.cases, line.deaths)
    table.setAlign(2, AsciiTable.RIGHT)
    table.setAlign(3, AsciiTable.RIGHT)
  })

  return table.toString();
}