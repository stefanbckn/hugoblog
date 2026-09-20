/**
 * Weekendplanner.
 *
 * Alles draait in de browser van de bezoeker. Wat er ingevuld wordt, gaat naar localStorage op
 * het toestel zelf, zodat het blad volgende week nog ingevuld staat. Er vertrekt geen enkel
 * verzoek naar een server, en er zit geen naam of adres in wat bewaard wordt.
 */
;(function () {
  var STAP = 30 // minuten per rij
  var VAN = 8 * 60
  var TOT = 21 * 60
  var RIJEN = (TOT - VAN) / STAP

  var DAGEN = [
    { id: 'vr', naam: 'Vrijdag', vanaf: 16 * 60 },
    { id: 'za', naam: 'Zaterdag', vanaf: 8 * 60 },
    { id: 'zo', naam: 'Zondag', vanaf: 8 * 60 },
  ]
  var SCHOOLDAGEN = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag']
  var STANDAARDDUUR = { taak: 30, 'lange taak': 60, toets: 60 }
  var SLEUTEL = 'weekendplanning'

  function hhmm(m) {
    var u = Math.floor(m / 60)
    var r = m % 60
    return (u < 10 ? '0' : '') + u + ':' + (r < 10 ? '0' : '') + r
  }

  function rijnr(m) {
    return (m - VAN) / STAP
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    })
  }

  function dagnaam(id) {
    var naam = id
    DAGEN.forEach(function (d) {
      if (d.id === id) naam = d.naam
    })
    return naam
  }

  function duurtekst(m) {
    if (m < 60) return m + ' min'
    if (m % 60 === 0) return m / 60 + ' u'
    return Math.floor(m / 60) + ' u ' + (m % 60) + ' min'
  }

  /**
   * Een moment van anderhalf uur dat nog nergens tegenaan botst. Zonder dit begint elke nieuwe
   * activiteit op zaterdag om 10 uur en staat er meteen een botsingsmelding op het blad, terwijl
   * de bezoeker nog niets fout deed.
   */
  function vrijMoment() {
    var bezet = []
    if (!staat || !staat.activiteiten) return { dag: 'za', start: 10 * 60, eind: 11 * 60 + 30 }
    staat.activiteiten.forEach(function (a) {
      a.momenten.forEach(function (m) {
        bezet.push(m)
      })
    })
    var duur = 90
    // Zaterdag eerst, dan zondag, dan de vrijdagavond: dat is de volgorde waarin een weekend
    // meestal volloopt, en het scheelt de bezoeker een dag omzetten.
    var volgorde = ['za', 'zo', 'vr'].map(function (id) {
      return DAGEN.filter(function (d) {
        return d.id === id
      })[0]
    })
    for (var d = 0; d < volgorde.length; d++) {
      var dag = volgorde[d]
      for (var start = Math.max(dag.vanaf, 10 * 60); start + duur <= TOT; start += 60) {
        var botst = bezet.some(function (m) {
          return m.dag === dag.id && m.start < start + duur && start < m.eind
        })
        if (!botst) return { dag: dag.id, start: start, eind: start + duur }
      }
    }
    return { dag: 'za', start: 10 * 60, eind: 11 * 60 + 30 }
  }

  function nieuweActiviteit() {
    return { naam: '', momenten: [vrijMoment()] }
  }

  function nieuweTaak() {
    return { wat: '', soort: 'taak', dag: 'maandag', duur: 30 }
  }

  var staat = { activiteiten: [], taken: [nieuweTaak()] }

  try {
    var bewaard = JSON.parse(localStorage.getItem(SLEUTEL) || 'null')
    if (bewaard && bewaard.activiteiten && bewaard.taken) staat = bewaard
  } catch (e) {
    /* Opslag geweigerd of vol: dan werkt het blad gewoon zonder te bewaren. */
  }

  // Twee lege regels om mee te beginnen, tenzij er al iets bewaard stond.
  while (staat.activiteiten.length < 2) staat.activiteiten.push(nieuweActiviteit())

  function bewaar() {
    try {
      localStorage.setItem(SLEUTEL, JSON.stringify(staat))
    } catch (e) {
      /* zie hierboven */
    }
  }

  /** De naam zoals hij op het blad komt. Zonder naam komt de activiteit niet in het rooster:
   *  een leeg vakje "Activiteit 2" op een afgedrukt blad zegt niets. */
  function naamVan(a) {
    return a.naam.trim()
  }

  function bouwRooster() {
    var vakken = {}
    var meldingen = []
    DAGEN.forEach(function (d) {
      vakken[d.id] = new Array(RIJEN).fill(null)
    })

    function past(dagId, start, blokken) {
      var dag = null
      DAGEN.forEach(function (d) {
        if (d.id === dagId) dag = d
      })
      if (!dag) return false
      var i0 = rijnr(start)
      if (i0 < 0 || i0 + blokken > RIJEN || start < dag.vanaf) return false
      for (var i = i0; i < i0 + blokken; i++) if (vakken[dagId][i]) return false
      return true
    }

    staat.activiteiten.forEach(function (a) {
      var naam = naamVan(a)
      if (!naam) return
      a.momenten.forEach(function (m) {
        var blokken = (m.eind - m.start) / STAP
        var i0 = rijnr(m.start)
        if (blokken <= 0) {
          meldingen.push('Bij "' + naam + '" ligt de eindtijd niet na de begintijd.')
          return
        }
        if (!past(m.dag, m.start, blokken)) {
          meldingen.push(
            '"' +
              naam +
              '" op ' +
              dagnaam(m.dag).toLowerCase() +
              ' van ' +
              hhmm(m.start) +
              ' tot ' +
              hhmm(m.eind) +
              ' botst met iets anders of valt buiten het rooster.',
          )
          return
        }
        for (var r = i0; r < i0 + blokken; r++) {
          vakken[m.dag][r] = { naam: naam, eerste: r === i0, laatste: r === i0 + blokken - 1 }
        }
      })
    })

    return { vakken: vakken, meldingen: meldingen }
  }

  function toonRooster() {
    var res = bouwRooster()
    var html = ''
    DAGEN.forEach(function (d) {
      html += '<div class="dag"><h3>' + d.naam + '</h3>'
      for (var i = 0; i < RIJEN; i++) {
        var start = VAN + i * STAP
        var vak = res.vakken[d.id][i]
        var klas = 'vak'
        var tekst = ''
        if (start < d.vanaf) {
          klas += ' buiten'
        } else if (vak) {
          klas += ' bezet'
          if (!vak.eerste) klas += ' midden'
          if (!vak.laatste) klas += ' boven'
          if (vak.eerste) tekst = esc(vak.naam)
        }
        html +=
          '<div class="rij' +
          (start % 60 ? ' half' : '') +
          '"><span class="uur">' +
          hhmm(start) +
          '</span><div class="' +
          klas +
          '">' +
          tekst +
          '</div></div>'
      }
      html += '</div>'
    })
    document.getElementById('rooster').innerHTML = html

    var melding = document.getElementById('waarschuwing')
    if (res.meldingen.length) {
      melding.hidden = false
      melding.innerHTML = res.meldingen.map(esc).join('<br>')
    } else {
      melding.hidden = true
    }
  }

  function toonTeDoen() {
    var lijst = staat.taken.filter(function (t) {
      return t.wat.trim()
    })
    lijst.sort(function (a, b) {
      var d = SCHOOLDAGEN.indexOf(a.dag) - SCHOOLDAGEN.indexOf(b.dag)
      if (d) return d
      var gewicht = function (s) {
        return s === 'toets' ? 0 : s === 'lange taak' ? 1 : 2
      }
      return gewicht(a.soort) - gewicht(b.soort)
    })

    var el = document.getElementById('tedoen')
    if (!lijst.length) {
      el.innerHTML = '<p class="hint">Nog niets ingevuld.</p>'
      return
    }
    var html = '<ul>'
    lijst.forEach(function (t) {
      var extra =
        t.soort === 'toets' || t.soort === 'lange taak' ? ' Verdeel dit over twee dagen.' : ''
      html +=
        '<li><span class="hokje"></span><span><span class="wat">' +
        esc(t.wat) +
        '</span><span class="bij">' +
        esc(t.soort) +
        ', tegen ' +
        esc(t.dag) +
        ', ongeveer ' +
        duurtekst(t.duur) +
        '.' +
        extra +
        '</span></span></li>'
    })
    el.innerHTML = html + '</ul>'
  }

  function startopties(gekozen) {
    var o = ''
    for (var m = VAN; m < TOT; m += STAP) {
      o += '<option value="' + m + '"' + (m === gekozen ? ' selected' : '') + '>' + hhmm(m) + '</option>'
    }
    return o
  }

  function eindopties(na, gekozen) {
    var o = ''
    for (var m = na + STAP; m <= TOT; m += STAP) {
      o += '<option value="' + m + '"' + (m === gekozen ? ' selected' : '') + '>' + hhmm(m) + '</option>'
    }
    return o
  }

  function duuropties(gekozen) {
    var o = ''
    ;[30, 60, 90, 120, 150, 180, 240].forEach(function (m) {
      o +=
        '<option value="' + m + '"' + (m === gekozen ? ' selected' : '') + '>' + duurtekst(m) + '</option>'
    })
    return o
  }

  function toonActiviteiten() {
    var el = document.getElementById('activiteiten')
    var html = ''
    staat.activiteiten.forEach(function (a, i) {
      html +=
        '<div class="activiteit"><div class="naamrij">' +
        '<input type="text" data-naam="' +
        i +
        '" value="' +
        esc(a.naam) +
        '" placeholder="Activiteit ' +
        (i + 1) +
        '" aria-label="Naam van activiteit ' +
        (i + 1) +
        '">' +
        '<button type="button" class="weg" data-activiteit-weg="' +
        i +
        '" aria-label="Activiteit weg">&times;</button></div>'
      a.momenten.forEach(function (m, k) {
        html +=
          '<div class="moment"><select data-dag="' +
          i +
          '-' +
          k +
          '" aria-label="Dag">' +
          DAGEN.map(function (d) {
            return '<option value="' + d.id + '"' + (m.dag === d.id ? ' selected' : '') + '>' + d.naam + '</option>'
          }).join('') +
          '</select><span class="lbl">van</span><select data-start="' +
          i +
          '-' +
          k +
          '" aria-label="Van">' +
          startopties(m.start) +
          '</select><span class="lbl">tot</span><select data-eind="' +
          i +
          '-' +
          k +
          '" aria-label="Tot">' +
          eindopties(m.start, m.eind) +
          '</select><button type="button" class="weg" data-moment-weg="' +
          i +
          '-' +
          k +
          '" aria-label="Moment weg">&times;</button></div>'
      })
      html += '<button type="button" class="mini" data-moment-erbij="' + i + '">+ moment</button></div>'
    })
    el.innerHTML = html

    // De naam werkt alleen het rooster bij: opnieuw tekenen tijdens het typen kost de focus.
    el.querySelectorAll('[data-naam]').forEach(function (veld) {
      veld.addEventListener('input', function () {
        staat.activiteiten[+veld.dataset.naam].naam = veld.value
        bewaar()
        toonRooster()
      })
    })
    el.querySelectorAll('[data-activiteit-weg]').forEach(function (knop) {
      knop.addEventListener('click', function () {
        staat.activiteiten.splice(+knop.dataset.activiteitWeg, 1)
        if (!staat.activiteiten.length) staat.activiteiten.push(nieuweActiviteit())
        ververs()
      })
    })
    el.querySelectorAll('[data-moment-erbij]').forEach(function (knop) {
      knop.addEventListener('click', function () {
        staat.activiteiten[+knop.dataset.momentErbij].momenten.push(vrijMoment())
        ververs()
      })
    })

    var moment = function (sleutel) {
      var p = sleutel.split('-')
      return staat.activiteiten[+p[0]].momenten[+p[1]]
    }
    el.querySelectorAll('[data-dag]').forEach(function (v) {
      v.addEventListener('change', function () {
        moment(v.dataset.dag).dag = v.value
        ververs()
      })
    })
    el.querySelectorAll('[data-start]').forEach(function (v) {
      v.addEventListener('change', function () {
        var m = moment(v.dataset.start)
        var lengte = m.eind - m.start
        m.start = +v.value
        m.eind = Math.min(TOT, m.start + Math.max(STAP, lengte))
        ververs()
      })
    })
    el.querySelectorAll('[data-eind]').forEach(function (v) {
      v.addEventListener('change', function () {
        moment(v.dataset.eind).eind = +v.value
        ververs()
      })
    })
    el.querySelectorAll('[data-moment-weg]').forEach(function (knop) {
      knop.addEventListener('click', function () {
        var p = knop.dataset.momentWeg.split('-')
        staat.activiteiten[+p[0]].momenten.splice(+p[1], 1)
        ververs()
      })
    })
  }

  function toonTaken() {
    var el = document.getElementById('taken')
    var html = ''
    staat.taken.forEach(function (t, i) {
      html +=
        '<tr><td><input type="text" data-wat="' +
        i +
        '" placeholder="bv. toets Frans" value="' +
        esc(t.wat) +
        '" aria-label="Wat"></td><td><select data-soort="' +
        i +
        '" aria-label="Soort">' +
        ['taak', 'lange taak', 'toets']
          .map(function (s) {
            return '<option' + (t.soort === s ? ' selected' : '') + '>' + s + '</option>'
          })
          .join('') +
        '</select></td><td><select data-tegen="' +
        i +
        '" aria-label="Tegen">' +
        SCHOOLDAGEN.map(function (d) {
          return '<option' + (t.dag === d ? ' selected' : '') + '>' + d + '</option>'
        }).join('') +
        '</select></td><td><select data-duur="' +
        i +
        '" aria-label="Tijd">' +
        duuropties(t.duur) +
        '</select></td><td><button type="button" class="weg" data-taak-weg="' +
        i +
        '" aria-label="Regel weg">&times;</button></td></tr>'
    })
    el.innerHTML = html

    el.querySelectorAll('[data-wat]').forEach(function (v) {
      v.addEventListener('input', function () {
        staat.taken[+v.dataset.wat].wat = v.value
        bewaar()
        toonTeDoen()
      })
    })
    el.querySelectorAll('[data-soort]').forEach(function (v) {
      v.addEventListener('change', function () {
        var t = staat.taken[+v.dataset.soort]
        t.soort = v.value
        t.duur = STANDAARDDUUR[v.value]
        ververs()
      })
    })
    el.querySelectorAll('[data-tegen]').forEach(function (v) {
      v.addEventListener('change', function () {
        staat.taken[+v.dataset.tegen].dag = v.value
        ververs()
      })
    })
    el.querySelectorAll('[data-duur]').forEach(function (v) {
      v.addEventListener('change', function () {
        staat.taken[+v.dataset.duur].duur = +v.value
        ververs()
      })
    })
    el.querySelectorAll('[data-taak-weg]').forEach(function (knop) {
      knop.addEventListener('click', function () {
        staat.taken.splice(+knop.dataset.taakWeg, 1)
        if (!staat.taken.length) staat.taken.push(nieuweTaak())
        ververs()
      })
    })
  }

  function ververs() {
    bewaar()
    toonActiviteiten()
    toonTaken()
    toonRooster()
    toonTeDoen()
  }

  document.getElementById('activiteit-erbij').addEventListener('click', function () {
    staat.activiteiten.push(nieuweActiviteit())
    ververs()
    var velden = document.querySelectorAll('#activiteiten input[data-naam]')
    if (velden.length) velden[velden.length - 1].focus()
  })

  document.getElementById('regel-erbij').addEventListener('click', function () {
    staat.taken.push(nieuweTaak())
    ververs()
    var velden = document.querySelectorAll('#taken input[data-wat]')
    if (velden.length) velden[velden.length - 1].focus()
  })

  document.getElementById('wissen').addEventListener('click', function () {
    staat = { activiteiten: [], taken: [nieuweTaak()] }
    staat.activiteiten.push(nieuweActiviteit(), nieuweActiviteit())
    ververs()
  })

  ververs()
})()
