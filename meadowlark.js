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
const http = require('http')
const morgan = require('morgan')
const logger = require('express-logger')

app.use(function(req, res, next){
 // create a domain for this request
 var domain = require('domain').create();
 // handle errors on this domain
 domain.on('error', function(err){
 console.error('DOMAIN ERROR CAUGHT\n', err.stack);
 try {
 // failsafe shutdown in 5 seconds
 setTimeout(function(){
 console.error('Failsafe shutdown.');
 process.exit(1);
 }, 5000);
 // disconnect from the cluster

 var worker = require('cluster').worker;
 if(worker) worker.disconnect();
 // stop taking new requests
 server.close();
 try {
 // attempt to use Express error route
 next(err);
 } catch(err){
 // if Express error route failed, try
 // plain Node response
 console.error('Express error mechanism failed.\n', err.stack);
 res.statusCode = 500;
 res.setHeader('content-type', 'text/plain');
 res.end('Server error.');
 }
 } catch(err){
 console.error('Unable to send 500 response.\n', err.stack);
 }
 });
 // add the request and response objects to the domain
 domain.add(req);
 domain.add(res);
 // execute the rest of the request chain in the domain
 domain.run(next);
});
// other middleware and routes go here
var server = http.createServer(app).listen(app.get('port'), function(){
 console.log('Listening on port %d.', app.get('port'));
});

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
app.use(cookieParser(credentials.cookieSecret))
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: 'keyboard cat',
  cookie: {
    secure: false,
    maxAge: 600000
  }
}))
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
    noun: 'heck'
  })
})

app.get('/', (req, res) => {
  req.session.userName = 'Anon'
  res.cookie('signed_monster', 'nom nom', { signed: true })
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

app.get('/newsletter/archive', (req, res) => {
  res.render('tours/request-group-rate')
})

function NewsletterSignup(){
}
NewsletterSignup.prototype.save = function(cb){
  cb()
}

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

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500)
  res.render('500')
})

app.use((req, res) => {
  res.status(404)
  res.render('404')
})

function startServer() {
  http.createServer(app).listen(app.get('port'), () => {
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

