'use strict'
const express = require('express')
const app = express()
const fortune = require('./lib/fortune.js')
const bodyParser = require('body-parser')
const formidable = require('formidable')

const handlebars = require('express3-handlebars').create({
  defaultLayout:'main',
  helpers: {
    section: function(name, options) {
      if(!this._sections) this._sections = {}
      this._sections[name] = options.fn(this)
      return null
    }
  }
})

app.engine('handlebars', handlebars.engine)
app.set('view engine', 'handlebars')

app.set('port', process.env.PORT || 3000)

app.use((req, res, next) => {
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1'
  next()
})
app.use(express.static(`${__dirname}/public`))

app.use((req, res, next) => {
  if(!res.locals.partials) res.locals.partials = {}
  res.locals.partials.weather = getWeatherData()
  next()
})

const urlencodedParser = bodyParser.urlencoded({ extended: false })
const jsonParser = bodyParser.json()

app.get('/newsletter', (req, res) => {
  res.render('newsletter', {csrf: 'CSRF token goes here'})
})

/*app.post('/process', urlencodedParser, (req, res) => {
  console.log('Form (from querystring): ' + req.query.form)
  console.log('CSRF token (from hidden form field): ' + req.body._csrf)
  console.log('Name (from visible form field): ' + req.body.name)
  console.log('Email (from visible form field): ' + req.body.email)
  res.redirect(303, '/thank-you')
})*/

app.post('/process', jsonParser, (req, res) => {
  if (req.xhr || req.accepts('json, html') ==='json'){
  // if there were an error, we would send { error: 'error description' }
    res.send({ success: true })
  } else {
  // if there were an error, we would redirect to an error page
    res.redirect(303, '/thank-you')
  }
})

app.get('/contest/vacation-photo', (req, res) => {
  const now = new Date()
  res.render('contest/vacation-photo', {
    year: now.getFullYear(),
    month: now.getMonth()
  })
})

app.post('/contest/vacation-photo/:year/:month', (req, res) => {
  const form = new formidable.IncomingForm()

  form.parse(req, (err, fields, files) => {
    if (err) return res.redirect(303, '/error')
    console.log('received fields:')
    console.log(fields)
    console.log('received files:')
    console.log(files)
    res.redirect(303, '/thank-you')
  })
})


app.get('/headers', (req, res) => {
  res.set('Content-Type', 'text/plain')
  let s = ''
  for (var name in req.headers) s += name + ': ' + req.headers[name] + '\n'
  res.send(s)
})

app.get('/nursery-rhyme', (req, res) => {
  res.render('nursery-rhyme')
})
app.get('/data/nursery-rhyme', (req, res) => {
  res.json({
    animal: 'squirrel',
    bodyPart: 'tail',
    adjective: 'bushy',
    noun: 'heck',
  })
})

app.get('/', (req, res) => {
  res.render('home')
})

app.get('/dom', (req, res) => {
  res.render('dom-test')
})

app.get('/about', (req, res) => {
  res.render('about', { fortune: fortune.getFortune(), pageTestScript: '/qa/tests-about.js' })
})

app.get('/tours/hood-river', (req, res) => {
  res.render('tours/hood-river')
})

app.get('/tours/oregon-coast', (req, res) => {
  res.render('tours/hood-river')
})

app.get('/tours/request-group-rate', (req, res) => {
  res.render('tours/request-group-rate')
})

app.use((req, res) => {
  res.status(404)
  res.render('404')
})

app.use((err, req, res) => {
  console.error(err.stack)
  res.status(500)
  res.render('500')
})

app.listen(app.get('port'), () => {
  console.log(`Express started on http://localhost:${app.get('port')}; press Ctrl-C to terminate.`)
})

function getWeatherData() {
  return {
    locations: [
      {
        name: 'Portland',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
        weather: 'Overcast',
        temp: '54.1 F (12.3 C)',
      },
      {
        name: 'Bend',
        forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
        weather: 'Partly Cloudy',
        temp: '55.0 F (12.8 C)',
      },
      {
        name: 'Manzanita',
        forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
        weather: 'Light Rain',
        temp: '55.0 F (12.8 C)',
      },
    ]
  }
}