const fortune = require('../lib/fortune.js')
const mongoose = require('mongoose')
const expect = require('chai').expect
const Vacation = require('../models/vacation.js')

suite('Fortune cookie tests', () => {
  test('getFortune() should return a fortune', () => {
    expect(typeof fortune.getFortune() === 'string')
  })
})

suite('Price test', () => {
  test('Should return a number', () => {
    Vacation.find({}, (err, vacations) => {
      vacations.map(vacation => {
        return {
          price: vacation.displayPrice()
        }
      })
      vacations.forEach(vacation => {
        expect(typeof vacation.price === 'number')
      })
    })
  })
})