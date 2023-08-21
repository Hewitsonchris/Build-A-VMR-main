const API_KEY = process.env.MAILGUN_API_KEY
const DOMAIN = process.env.MAILGUN_DOMAIN
const formData = require('form-data')
const Mailgun = require('mailgun.js')
const mailgun = new Mailgun(formData)
const mg = mailgun.client({ username: 'api', key: API_KEY })

function sendMailgun(buf2, id, callback) {
  let buf = new Buffer.from(buf2, 'utf8')
  mg.messages.
    create(DOMAIN, {
      from: 'The Mailgun Machine <mailgun@' + DOMAIN + '>',
      to: 'actlab@yale.edu',
      subject: `[target-onset v2] ${id} (pilot)`,
      text: 'see attached. ',
      attachment: { data: buf, filename: `targ-onsetS_${id}.json` }
    }).
    then((msg) => {
      console.log(msg)
      callback(null, { statusCode: 200, body: 'Success' })
    }).
    catch((err) => {
      console.log(err)
      callback(null, { statusCode: 400, body: JSON.stringify({ result: err }) })
    })
}

exports.handler = function(event, context, callback) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }
  const data_in = JSON.parse(event.body)

  sendMailgun(event.body, data_in['config']['id'], callback)
}
