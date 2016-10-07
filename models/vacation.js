const mongoose = require('mongoose')

const vacationSchema = mongoose.Schema({
  name: String,
  slug: String,
  category: String,
  sku: String,
  description: String,
  priceInCents: Number,
  tags: [String],
  inSeason: Boolean,
  available: Boolean,
  requiresWaiver: Boolean,
  maximumGuests: Number,
  notes: String,
  packagesSold: Number
})

vacationSchema.methods.displayPrice = function() {
  return `$${(this.priceInCents / 100).toFixed(2)}`
}

const Vacation = mongoose.model('Vacation', vacationSchema)

module.exports = Vacation