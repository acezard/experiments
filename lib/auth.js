const User = require('../models/user.js')
const passport = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy
const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })

passport.serializeUser((user, done) => done(null, user._id))

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    if(err || !user) return done(err, null)
    done(null, user)
  })
})

module.exports = (app, options) => {
  if(!options.successRedirect) options.successRedirect = '/account'
  if(!options.failureRedirect) options.failureRedirect = '/login'

  return {
    init: function() {
      const env = app.get('env')
      const config = options.providers

      passport.use(new FacebookStrategy({
        clientID: config.facebook[env].appId,
        clientSecret: config.facebook[env].appSecret,
        callbackURL: '/auth/facebook/callback'
      },(accessToken, refreshToken, profile, done) => {
        const authId = `facebook${profile.id}`
        
        User.findOne({authId}, (err, user) => {
          if (err) return done(err, null)
          if (user) return done(null, user)

          user = new User({
            authId,
            name: profile.displayName,
            created: Date.now(),
            role: 'customer'
          })

          user.save(err => {
            if (err) return done(err, null)
            done(null, user)
          })
        })
      }))

      app.use(passport.initialize())
      app.use(passport.session())
    },
    registerRoutes: function() {
      app.get('/auth/facebook', urlencodedParser, (req, res, next) => {
        passport.authenticate('facebook', {
          callbackURL: `/auth/facebook/callback?redirect=${encodeURIComponent(req.query.redirect)}`
        })(req, res, next)
      })

      app.get('/auth/facebook/callback', passport.authenticate('facebook', {
        failureRedirect: options.failureRedirect
      }, urlencodedParser, (req, res) => {
        res.redirect(303, req.query.redirect || options.successRedirect)
      }))
    }
  }
}