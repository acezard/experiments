const Attraction = require('./models/attraction.js')

module.exports = (app, parser) => {
  app.get('/api/attractions', (req, res) => {
    Attraction.find({approved: true}, (err, attractions) => {
      if (err) return res.send(500, 'Error occured: database error')

      res.json(attractions.map(attraction => {
        return {
          name: attraction.name,
          id: attraction._id,
          description: attraction.description,
          location: attraction.location
        }
      }))
    })
  })

  app.post('/api/attraction', parser, (req, res) => {
    console.log(req.body)
    const attraction = new Attraction({
      name: req.body.name,
      description: req.body.description,
      location: {
        lat: req.body.lat,
        lnt: req.body.lnt,
      },
      history: {
        event: 'created',
        email: req.body.email,
        date: new Date()
      },
      approved: false
    })

    attraction.save((err, attraction) => {
      if (err) return res.send(500, 'internal server error')

      res.json({id: attraction._id})
    })
  })

  app.get('/api/attraction/:id', parser, (req, res) => {
    Attraction.findById(req.params.id, (err, attraction) => {
      if (err) return res.send(500, 'internal database error')

      res.json({
        name: attraction.name,
        id: attraction._id,
        description: attraction.description,
        location: attraction.location
      })
    })
  })
}