'use strict'
const express = require('express')
const app = express()
const fortune = require('./lib/fortune.js')
const bodyParser = require('body-parser')
const formidable = require('formidable')
const credentials = require('./credentials.js')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const connect = require('connect')
const nodemailer = require('nodemailer')
const emailService = require('./lib/email.js')(credentials)
const https = require('https')
const morgan = require('morgan')
const logger = require('express-logger')
const dataDir = `${__dirname}/data`
const vacationPhotoDir = `${dataDir}/vacation-photo`
const fs = require('fs')
const Vacation = require('./models/vacation.js')
const MongoSessionStore = require('session-mongoose')(connect)
const sessionStore = new MongoSessionStore({url: credentials.mongo.development.connectionString})
const cors = require('cors')
const rest = require('connect-rest')
const csurf = require('csurf')
const auth = require('./lib/auth.js')(app, {
  providers: credentials.authProviders,
  successRedirect: '/account',
  failureRedirect: '/unauthorized'
})
auth.init()
auth.registerRoutes()
fs.existsSync(dataDir) || fs.mkdirSync(dataDir)
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir)

/*emailService.send('acezard@gmail.com', 'Title Ipsum', 'Body Ipsum')*/
switch(app.get('env')) {
case 'development':
  app.use(morgan('dev'))
  break
case 'production':
  app.use(logger({
    path: `${__dirname}/log/requests.log`
  }))
  break
}

app.use(function(req, res, next){
  const cluster = require('cluster')
  if(cluster.isWorker) console.log('Worker %d received request',
  cluster.worker.id)
  next()
})

const mongoose = require('mongoose')
const opts = {
  server: {
    socketOptions: { keepAlive: 1}
  }
}
switch(app.get('env')) {
case 'development':
  mongoose.connect(credentials.mongo.development.connectionString, opts)
  break
case 'production':
  mongoose.connect(credentials.mongo.production.connectionString, opts)
  break
default:
  throw new Error('Unknown execution environment: ' + app.get('env'))
}

Vacation.find(function(err, vacations){
  if(vacations.length) return

  new Vacation({
    name: 'Hood River Day Trip',
    slug: 'hood-river-day-trip',
    category: 'Day Trip',
    sku: 'HR199',
    description: 'Spend a day sailing on the Columbia and ' +
    'enjoying craft beers in Hood River!',
    priceInCents: 9995,
    tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
    inSeason: true,
    maximumGuests: 16,
    available: true,
    packagesSold: 0,
  }).save()

  new Vacation({
    name: 'Oregon Coast Getaway',
    slug: 'oregon-coast-getaway',
    category: 'Weekend Getaway',
    sku: 'OC39',
    description: 'Enjoy the ocean air and quaint coastal towns!',
    priceInCents: 269995,
    tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
    inSeason: false,
    maximumGuests: 8,
    available: true,
    packagesSold: 0,
  }).save()

  new Vacation({
    name: 'Rock Climbing in Bend',
    slug: 'rock-climbing-in-bend',
    category: 'Adventure',
    sku: 'B99',
    description: 'Experience the thrill of climbing in the high desert.',
    priceInCents: 289995,
    tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing'],
    inSeason: true,
    requiresWaiver: true,
    maximumGuests: 4,
    available: false,
    packagesSold: 0,
    notes: 'The tour guide is currently recovering from a skiing accident.',
  }).save()
})


const handlebars = require('express3-handlebars').create({
  defaultLayout:'main',
  helpers: {
    section: function(name, options) {
      if(!this._sections) this._sections = {}
      this._sections[name] = options.fn(this)
      return null
    },

    static: name => require('./lib/static.js').map(name)
  }
})

app.engine('handlebars', handlebars.engine)
app.set('view engine', 'handlebars')

app.set('port', process.env.PORT || 3000)

app.use('/api', cors())
app.use((req, res, next) => {
  res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1'
  next()
})
app.use(express.static(`${__dirname}/public`))
app.use(cookieParser(credentials.cookieSecret))
app.use(session({
  store: sessionStore
}))
app.use(csurf())
app.use((req, res, next) => {
  res.locals._csrfToken = req.csrfToken()
  next()
})

app.use((req, res, next) => {
  res.locals.flash = req.session.flash
  delete req.session.flash
  next()
})
app.use((req, res, next) => {
  if(!res.locals.partials) res.locals.partials = {}
  res.locals.partials.weather = getWeatherData()
  next()
})

const urlencodedParser = bodyParser.urlencoded({ extended: false })
const jsonParser = bodyParser.json()

app.get('/fail', function(req, res){
  throw new Error('Nope!')
})

app.get('/epic-fail', function(req, res){
  process.nextTick(() => {
    throw new Error('Holy shit!')
  })
})

app.get('/a', function(req, res){
  console.log('/a: route terminated')
  res.send('a')
})
app.get('/a', function(req, res){
  console.log('/a: never called')
})
app.get('/b', function(req, res, next){
  console.log('/b: route not terminated')
  next()
})

app.get('/b', function(req, res, next){
  console.log('/b (part 2): error thrown' )
  throw new Error('b failed')
})

app.use('/b', function(err, req, res, next){
  console.log('/b error detected and passed on')
  next(err)
})
app.get('/c', function(err, req){
  console.log('/c: error thrown')
  throw new Error('c failed')
})
app.use('/c', function(err, req, res, next){
  console.log('/c: error deteccted but not passed on')
  next()
})

app.get('/newsletter', (req, res) => {
  res.render('newsletter', {csrf: 'CSRF token goes here'})
})

app.get('/set-currency/:currency', (req, res) => {
  req.session.currency = req.params.currency
  return res.redirect(303, '/vacations')
})

function convertFromUSD(value, currency){
 switch(currency){
 case 'USD': return value * 1;
 case 'GBP': return value * 0.6;
 case 'BTC': return value * 0.0023707918444761;
 default: return NaN;
 }
}

app.get('/vacations', (req, res) => {
  Vacation.find({available: true}, (err, vacations) => {
    const currency = req.session.currency || 'USD'
    const context = {
      currency: currency,
      vacations: vacations.map(vacation => {
        console.log(vacation.displayPrice())
        return {
          sku: vacation.sku,
          name: vacation.name,
          description: vacation.description,
          price: convertFromUSD(vacation.priceInCents/100, currency),
          inSeason: vacation.inSeason
        }
      }),
    }
    switch(currency){
    case 'USD': context.currencyUSD = 'selected'
      break
    case 'GBP': context.currencyGBP = 'selected'
      break
    case 'BTC': context.currencyBTC = 'selected'
      break
    }

    res.render('vacations', context)
  })
})

const VacationInSeasonListener = require('./models/vacationInSeasonListener')
app.get('/notify-me-when-in-season', (req, res) => {
  res.render('notify-me-when-in-season', {sku: req.query.sku})
})
app.post('/notify-me-when-in-season', urlencodedParser, (req, res) => {
  VacationInSeasonListener.update(
    {email: req.body.email},
    {$push: {skus: req.body.sku}},
    {upsert: true},
    err => {
      if (err) {
        console.error(err.stack)
        req.session.flash = {
          type: 'danger',
          intro: 'oops',
          message: 'there was an error'
        }
        return res.redirect(303, '/vacations')
      }
      req.session.flash = {
        type: 'success',
        intro: 'thank you',
        message: 'you will be notified'
      }
      return res.redirect(303, '/vacationsnpm')
    }
  )
})

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

function saveContestEntry() {}

app.post('/contest/vacation-photo/:year/:month', (req, res) => {
  const form = new formidable.IncomingForm()

  form.parse(req, (err, fields, files) => {
    if (err) return res.redirect(303, '/error')
    if (err) {
      res.session.flash = {
        type: 'danger',
        intro: 'Oops!',
        message: 'There was an error'
      }
      return res.redirect(303, '/contest/vacation-photo')
    }

    const photo = files.photo
    const dir = `${vacationPhotoDir}/${Date.now()}`
    const path = `${dir}/${photo.name}`
    fs.mkdirSync(dir)
    fs.renameSync(photo.path, `${dir}/${photo.name}`)
    saveContestEntry('vacation-photo', fields.email, req.params.year, req.params.month, path)
    req.session.flash = {
      type: 'success',
      intro: 'Good Luck',
      message: 'OK'
    }
    return res.redirect(303, '/contest/vacation-photo/entries')
  })
})


app.get('/headers', (req, res) => {
  res.set('Content-Type', 'text/plain')
  let s = ''
  for (var name in req.headers) s += name + ': ' + req.headers[name] + '\n'
  res.send(s)
})

require('./routes.js')(app)
require('./attraction.js')(app, urlencodedParser)

/*const apiOptions = {
  context: '/api',
  domain: require('domain').create()
}*/
/*app.use(rest.rester(apiOptions))
function NewsletterSignup() {
}*/
/*NewsletterSignup.prototype.save = function(cb){
  cb()
}*/

app.post('/newsletter', urlencodedParser, (req, res) => {
  const name = req.body.name || ''
  const email = req.body.email || ''

  if (!email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
    if (req.xhr) return res.json({ error: 'invalid email address'})

    req.session.flash = {
      type: 'danger',
      intro: 'validation error',
      message: 'invalid email'
    }
    
    return res.redirect('/newsletter/archive')
  }

  new NewsletterSignup({ name: name, email: email }).save(function(err){
    if(err) {
      if(req.xhr) return res.json({ error: 'Database error.' })
      req.session.flash = {
        type: 'danger',
        intro: 'Database error!',
        message: 'There was a database error; please try again later.',
      }
      return res.redirect(303, '/newsletter/archive');
    }
    if(req.xhr) return res.json({ success: true });
    req.session.flash = {
      type: 'success',
      intro: 'Thank you!',
      message: 'You have now been signed up for the newsletter.',
    }
    return res.redirect(303, '/newsletter/archive');
  })
})

app.get('/account', customerOnly, (req, res) => {
  res.render('account')
})

app.get('/sales', employeeOnly, (req, res) => {
  res.render('sales')
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500)
  res.render('500')
})

app.use((req, res) => {
  res.status(404)
  res.render('404')
})

var options = {
 key: fs.readFileSync(__dirname + '/meadowlark.pem'),
 cert: fs.readFileSync(__dirname + '/meadowlark.crt')
}


function startServer() {
  https.createServer(options, app).listen(app.get('port'), () => {
    console.log(`Express started in ${app.get('env')} mode on http://localhost:${app.get('port')}; press Ctrl-c to terminate`)
  })
}

if (require.main === module) startServer()
else module.exports = startServer

function getWeatherData() {
  return {
    locations: [
      {
        name: 'Portland',
        forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
        weather: 'Overcast',
        temp: '54.1 F (12.3 C)'
      },
      {
        name: 'Bend',
        forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
        weather: 'Partly Cloudy',
        temp: '55.0 F (12.8 C)'
      },
      {
        name: 'Manzanita',
        forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
        iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
        weather: 'Light Rain',
        temp: '55.0 F (12.8 C)'
      }
    ]
  }
}

function customerOnly(req, res) {
  const user = req.session.passport.user
  if(user && req.role === 'customer') return next()
  res.redirect(303, '/unauthorized')
}

function employeeOnly(req, res, next) {
  const user = req.session.passport.user
  if(user && req.role === 'employee') return next()
  next('route')
}