// Een los bestand en geen inline script, zodat een Content-Security-Policy op de blog dit
// niet hoeft uit te zonderen.
document.querySelectorAll('[data-afdrukken]').forEach(function (knop) {
  knop.addEventListener('click', function () {
    window.print()
  })
})

/**
 * Simple Analytics, dezelfde twee scripts als de rest van de blog (zie
 * layouts/_partials/head/simple_analytics.html). Ze staan hier en niet in de head van de
 * pagina's, omdat een bestand in static/ de head van Hugo niet krijgt en dus ook de
 * `hugo.IsProduction`-voorwaarde mist die de rest van de site gebruikt. De hostnaamcontrole
 * doet hetzelfde werk: lokaal bouwen en testen telt niet mee.
 *
 * Geen data-collect-dnt, net als in de partial: zo blijft Simple Analytics bezoekers met Do Not
 * Track overslaan. Verandert die partial, pas dit dan mee aan.
 */
if (location.hostname === 'bckn.be') {
  ;['latest.js', 'auto-events.js'].forEach(function (bestand) {
    var s = document.createElement('script')
    s.async = true
    s.src = 'https://scripts.simpleanalyticscdn.com/' + bestand
    document.head.appendChild(s)
  })
}
