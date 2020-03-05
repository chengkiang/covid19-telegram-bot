'use strict';

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cheerio = require('cheerio');
const AsciiTable = require('ascii-table')
const moment = require('moment');

const token = process.env.token || 'YOUR_API_KEY';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/corona/, async (msg, match) => {
  const chatId = msg.chat.id;
  const coronaInfo = await getCoronaInfo();
  const coronaSummary = await getCoronaSummary();

  await bot.sendMessage(chatId, `<strong>${coronaInfo.title}</strong>\n${coronaInfo.body}\n<code>${coronaSummary}</code>`, { parse_mode: "HTML" });
  //await bot.sendPhoto(chatId, `https://www.gov.sg/${coronaInfo.dorsconImg}`)
});

async function getCoronaInfo() {
  const coronaUrl = 'https://www.gov.sg/features/covid-19';
  const res = await axios.get(coronaUrl)
  const $ = cheerio.load(res.data);

  const title = '';
  const content = $('.feature-intro__content').text().trim()
  const body = content.substr(content.indexOf('Case Summary'), content.indexOf('More info on the cases') - content.indexOf('Case Summary'))

  const dorsconImg = $('.component img.img-responsive[src*=dorscon]').attr("src")

  return {
    title, body, dorsconImg
  }
}

async function getCoronaSummary() {
  const url = 'https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/2/query?f=json&where=Confirmed%20%3E%200&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&orderByFields=Confirmed%20desc&resultOffset=0&resultRecordCount=200&cacheHint=true'

  const { data: { features } } = await axios.get(url);

  const table = new AsciiTable()
  table.setHeading('Country', '😷 / 💀')

  const updated = moment.unix(Math.max(...features.map(e=>e.attributes.Last_Update))/1000).format('DD MMM YYYY h:mm:ss A');

  const entries = features.map(f => {
    return {
      country: f.attributes.Country_Region,
      confirmed: f.attributes.Confirmed,
      deaths: f.attributes.Deaths,
      Recovered: f.attributes.Recovered
    }
  })
  .sort((a, b) => ((b.confirmed || 0) - (a.confirmed)))
  .slice(0,20)
  .map(entry => {
    return {
      country: entry.country
        .replace('Mainland China', 'China')
        .replace('Others', 'Ship')
        .replace('United States', 'USA')
        .replace('United Kingdom', 'UK')
        .replace('South Korea', 'S. Korea')
        .replace('Singapore', 'S\'pore')
        .replace('Hong Kong', 'HK')
        .replace('Malaysia', 'M\'sia')
        .replace('Switzerland', 'Switz'),
      cases: entry.confirmed || 0,
      deaths: entry.deaths || 0
    }
  })
  .forEach((line, index) => {
    table.addRow((index + 1).toString().padStart(2, ' ') + '. ' + line.country, line.cases + ' / ' + line.deaths)
    table.setAlign(1, AsciiTable.RIGHT)
  })

  console.log(table.toString());
  return table.toString() + `'\nLast updated:${updated}`;
}