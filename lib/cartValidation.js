module.exports = {
  checkWaivers: (req, res, next) => {
    const cart = req.session.cart
    if(!cart) return next()

    if (cart.some(i => i.product.requiresWaiver)) {
      if (!cart.warnings) cart.warnings = []
      cart.warnings.push('Requires a waiver')
    }

    next()
  },

  checkGuestCounts: (req, res, next) => {
    const cart = req.session.cart
    if(!cart) return next()

    if (cart.some(i => i.guests > i.product.maximumGuests)) {
      if (!cart.errors) cart.errors = []

      cart.errors.push('Maximum guests reached')
    }

    next()
  }
}
