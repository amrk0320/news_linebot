const express = require('express')
const request = require('request')
const bodyParser = require('body-parser')
const puppeteer = require('puppeteer');

// create a new express server
const app = express();
const NEWS = {
    NEWSPICKS: 'newspicks',
    BRIDGE: 'bridge',
}
var url = '';
var urls = [];
const channelAccessToken = 'Oya0YHH5U7CXyBq9fw8RYI5yNBl41OYwVwSakRp5+LxJdgcmV6npR4eXc1dRiAGwIY6N5mPf+5jmOsI6T9PIu5WRi7ulK1N/w0AV8AmHiwtcZal1APVWSnwlqz/8Rsyiu97ylfsrbO7R3i/oRPp8RwdB04t89/1O/w1cDnyilFU=';
const lineuri = 'https://api.line.me/v2/bot/message/reply';

// Heroku環境かどうかの判断
const LAUNCH_OPTION = process.env.DYNO ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] } : { headless: false };

app.use(bodyParser.json()) // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
})) // for parsing application/x-www-form-urlencoded


app.get('/', function(req, res) {
  res.send('hello world');
}); 

app.post('/callback', (req, res) => {
        // 受信したメッセージを取得
       const message = req.body.events[0].message.text;

       // メッセージによって処理振り分け
       switch(message){
            // 「newspicks」なら
            case NEWS.NEWSPICKS:{
                sendNews(req,'newspicks','https://newspicks.com/',['.index-page','.eyecatch','a']);
                break;
            }            
            case NEWS.BRIDGE:{
                sendNews(req,'bridge','http://thebridge.jp/',['div.clearfix','header.entry-header','h2.entry-title','a']);
                break;
            }
            case 'はてぶてくの':{
                sendNews(req,'はてぶテクノロジー','http://b.hatena.ne.jp/hotentry/it',['.entrylist-unit','.entrylist-contents','.entrylist-contents-title','a'],'');
                    // var datas = await getURLs('https://medium.com/',['.extremeHero-container','.extremeHero-post','a'],'');
                break;
            }
            case 'medium':{
                sendNews(req,'medium(英語)','https://medium.com/',['.extremeHero-container','.extremeHero-post','a'],'');
                break;
            }
            default:{
                exception(req,message);
                break;
            }
       }
})

function sendNews(req,newsname,url,searchElm) {
  (async() => {
        
        // var urls_json = await getURLs('https://newspicks.com/',['.index-page','.eyecatch','a'],'');
        var urls_json = await getURLs(url,searchElm,'');
        // jsonを整形
        let urls = urls_json.map(getJsonValue);
        // 重複を削除
        let urls_unduplication = urls.filter(function (x, i, self) {
            return self.indexOf(x) === i;
        });
        // 先頭5つを取得
        let first_urls = getFirstLists(urls_unduplication,5);
        let urls_wraped = first_urls.map(makeWrapText);

        // 返信用メッセージの生成
        let options = {
                method: 'POST',
                uri: lineuri,
                body: {
                  replyToken: req.body.events[0].replyToken,
                  messages: [{
                    type: 'text',
                    text: '今日の' + newsname + 'のニュースをお届けします。' + "\n\n" + urls_wraped,
                  }]
                },
                auth: {
                  // channelAccessToken
                  bearer: channelAccessToken
                },
                json: true
          }
          request(options, (err, response, body) => {
            console.log(JSON.stringify(response))
          })
    })();
}

// news以外の文字が送信された場合
function exception(req,message) {
        let options = {
                method: 'POST',
                uri: lineuri,
                body: {
                  replyToken: req.body.events[0].replyToken,
                  messages: [{
                    type: 'text',
                    text: message+ '?newsを指定してください。',
                  }]
                },
                auth: {
                  // channelAccessToken
                  bearer: channelAccessToken
                },
                json: true
          }
          request(options, (err, response, body) => {
            console.log(JSON.stringify(response))
          })
}

// function getURLs(url,targetElm[], domain) {
async function getURLs(url, searchElm, domain) {
    var urls = [];
    const browser = await puppeteer.launch(LAUNCH_OPTION);
    // 検索したいdomをクエリに変換する
    let query = makeTatgetElmQuery(searchElm);
    const page = await browser.newPage();
    // networkidle2でページが読み込まれるまで待機する
    // await page.goto(url, { waitUntil: 'networkidle2' });
    await page.goto(url);
    // トップニュースのurlリストを取得する
    var list = await page.$$(query);
    for (let i = 0; i < list.length; i++) {
      var data = {
        href: await (await list[i].getProperty('href')).jsonValue(),
      };
      urls.push(data);　
    }　
    browser.close();
    return urls;
};

// 検索対象のdomをpupetterのクエリーに変換する
function makeTatgetElmQuery(targetElm) { 
    query = ""; 
    for (let i in targetElm) {
        switch (true) 
        {
            case /#/.test(targetElm[i]):
                query += targetElm[i] + " "; 
                break; 
            case targetElm[i].indexOf('.') > -1: 
                query += targetElm[i] + " "; 
                break;
            default: 
                query += "> " + targetElm[i];
                break;
        }
    }
    return query; 
};

// 配列の先頭のリストのみ抽出する
function getFirstLists(urlList,offset) {
    return urlList.slice(0, offset);
}

function getJsonValue(value) {
  return value.href; 
}

function makeWrapText(value) {
  return value + "\n\n"; 
}

app.listen((process.env.PORT ||3000), () => {
 //console.log('server starting on PORT:' + 3000)
  console.log('server starting')
})
