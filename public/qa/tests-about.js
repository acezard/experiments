suite('"About" Page Tests', () => {
  test('page should contain a link to contact page', () => {
    assert(document.querySelector('a[href="/contact"]'))
  })
})