const main = require('./handlers/main.js')

module.exports = app => {
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

  app.get('/dom', main.dom)

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
}