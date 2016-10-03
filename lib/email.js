'use strict'
const nodemailer = require('nodemailer')

module.exports = credentials => {

  const mailTransport = nodemailer.createTransport(`smtps://${credentials.gmail.user}:${credentials.gmail.password}@smtp.gmail.com`)

  const from =  '"Meadowlark Travel" <info@meadowlarktravel.com>'
  const errorRecipient = 'acezard@gmail.com'

  return {
    send: (to, subject, html) => {
      mailTransport.sendMail({
        from,
        to,
        subject,
        html,
        generateTextFromHtml: true
      }, err => {
        if (err) console.error(`Unable to send mail ${err}`)
      })
    },

    emailError: (message, filename, exception) => {
      let body = `<h1>Meadowlark Travel Site Error</h1>message:<br><pre>${message}</pre><br>`
      if(exception) body += `exception:<br><pre>${exception}</pre><br>`
      if(filename) body += `filename:<br><pre>${filename}</pre><br>`

      mailTransport.sendMail({
        from,
        to: errorRecipient,
        subject: 'Meadowlark Error',
        html: body,
        generateTextFromHtml: true
      }, err => {
        if (err) console.error(`Unable to send mail ${err}`)
      })
    }
  }
}