/**
 * Wisselschema voor jeugdvoetbal.
 *
 * De wedstrijd wordt opgeknipt in blokken (bv. 4 kwarten van 20 minuten, gewisseld om de 10 =
 * 8 blokken). Per blok kiest het schema wie speelt en waar, met een toewijzing (Hongaarse
 * methode) over alle veldposities en alle beschikbare spelers tegelijk. De kost van een speler
 * is vooral zijn speeltijd tot dan toe, zodat wie het minst speelde het eerst aan de beurt is;
 * daarbovenop komt een kleine kost om van plaats te veranderen en wat toeval. Dat gebeurt een
 * paar honderd keer met ander toeval, en de beste poging wint: eerlijke minuten eerst, dan zo
 * weinig mogelijk lange bankbeurten, verschuivingen en drukke wisselmomenten.
 *
 * De keeper wisselt alleen tussen de periodes, en roteert over de spelers met K aangevinkt.
 *
 * Alles blijft in localStorage op dit toestel. Er gaat niets naar een server.
 */
;(function () {
  'use strict'

  var OPSLAG = 'wisselschema-v1'
  var POGINGEN = 300
  var ONMOGELIJK = 1e7
  var LIJNEN = ['K', 'V', 'M', 'A']
  var LIJNNAAM = { K: 'keeper', V: 'verdediging', M: 'middenveld', A: 'aanval' }
  var KEEPER = { id: 'K', lijn: 'K', x: 50, y: 126 }

  function pos(id, lijn, x, y) {
    return { id: id, lijn: lijn, x: x, y: y }
  }

  var SPELVORMEN = {
    5: {
      naam: '5 tegen 5',
      standaard: { perioden: 4, minuten: 15, wissel: 5 },
      opstellingen: {
        ruit: {
          naam: 'Ruit 1-2-1',
          veld: [pos('V', 'V', 50, 102), pos('LM', 'M', 18, 74), pos('RM', 'M', 82, 74), pos('SP', 'A', 50, 40)],
        },
        blok: {
          naam: 'Blok 2-2',
          veld: [pos('LV', 'V', 28, 100), pos('RV', 'V', 72, 100), pos('LA', 'A', 28, 52), pos('RA', 'A', 72, 52)],
        },
      },
    },
    8: {
      naam: '8 tegen 8',
      standaard: { perioden: 4, minuten: 20, wissel: 10 },
      opstellingen: {
        ruit: {
          naam: 'Dubbele ruit',
          veld: [
            pos('LV', 'V', 17, 100),
            pos('CV', 'V', 50, 104),
            pos('RV', 'V', 83, 100),
            pos('6', 'M', 50, 82),
            pos('LF', 'M', 20, 60),
            pos('RF', 'M', 80, 60),
            pos('SP', 'A', 50, 30),
          ],
        },
        pijl: {
          naam: 'Pijl 2-4-1',
          veld: [
            pos('CVL', 'V', 32, 104),
            pos('CVR', 'V', 68, 104),
            pos('6', 'M', 50, 86),
            pos('LM', 'M', 15, 66),
            pos('RM', 'M', 85, 66),
            pos('10', 'M', 50, 54),
            pos('SP', 'A', 50, 28),
          ],
        },
      },
    },
    11: {
      naam: '11 tegen 11',
      standaard: { perioden: 2, minuten: 40, wissel: 20 },
      opstellingen: {
        '433': {
          naam: '4-3-3',
          veld: [
            pos('LV', 'V', 14, 98),
            pos('CVL', 'V', 37, 106),
            pos('CVR', 'V', 63, 106),
            pos('RV', 'V', 86, 98),
            pos('6', 'M', 50, 86),
            pos('8', 'M', 30, 68),
            pos('10', 'M', 70, 64),
            pos('LA', 'A', 16, 40),
            pos('SP', 'A', 50, 28),
            pos('RA', 'A', 84, 40),
          ],
        },
        '442': {
          naam: '4-4-2',
          veld: [
            pos('LV', 'V', 14, 98),
            pos('CVL', 'V', 37, 106),
            pos('CVR', 'V', 63, 106),
            pos('RV', 'V', 86, 98),
            pos('LM', 'M', 14, 66),
            pos('CML', 'M', 38, 76),
            pos('CMR', 'M', 62, 76),
            pos('RM', 'M', 86, 66),
            pos('SPL', 'A', 36, 34),
            pos('SPR', 'A', 64, 34),
          ],
        },
      },
    },
  }

  // ---------- Toestand ----------

  var st = standaardToestand()
  laad()

  function standaardToestand() {
    var s = SPELVORMEN[8].standaard
    return {
      inst: { spelvorm: 8, opstelling: 'ruit', perioden: s.perioden, minuten: s.minuten, wissel: s.wissel },
      spelers: [],
      schema: null,
      blok: 0,
    }
  }

  function laad() {
    try {
      var d = JSON.parse(localStorage.getItem(OPSLAG) || 'null')
      if (!d || !d.inst || !Array.isArray(d.spelers)) return
      var vorm = SPELVORMEN[d.inst.spelvorm]
      if (!vorm || !vorm.opstellingen[d.inst.opstelling]) return
      st.inst = d.inst
      st.spelers = d.spelers.filter(function (s) {
        return s && typeof s.id === 'string' && typeof s.naam === 'string' && Array.isArray(s.lijnen)
      })
      if (d.schema && Array.isArray(d.schema.opst) && Array.isArray(d.schema.blokken)) st.schema = d.schema
      if (st.schema && d.blok >= 0 && d.blok < st.schema.blokken.length) st.blok = d.blok
    } catch (e) {}
  }

  function bewaar() {
    try {
      localStorage.setItem(OPSLAG, JSON.stringify(st))
    } catch (e) {}
  }

  function nieuwId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  }

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  function $(id) {
    return document.getElementById(id)
  }

  function opstelling() {
    return SPELVORMEN[st.inst.spelvorm].opstellingen[st.inst.opstelling]
  }

  function speler(id) {
    for (var i = 0; i < st.spelers.length; i++) if (st.spelers[i].id === id) return st.spelers[i]
    return null
  }

  function naam(id) {
    var s = speler(id)
    return s ? s.naam || '?' : '?'
  }

  function initialen(id) {
    var n = naam(id).trim()
    var w = n.split(/\s+/)
    if (w.length > 1) return (w[0][0] + w[w.length - 1][0]).toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }

  function aanwezig() {
    return st.spelers.filter(function (s) {
      return s.aanwezig
    })
  }

  // De sleutel van alles wat het schema beïnvloedt. Verandert hij, dan is het schema verouderd.
  // Namen horen er niet bij: een tikfout verbeteren mag het schema niet weggooien.
  function sleutel() {
    return JSON.stringify([
      st.inst,
      aanwezig().map(function (s) {
        return [s.id, s.lijnen.slice().sort().join('')]
      }),
    ])
  }

  // ---------- Blokken ----------

  function periodeNaam(p, n) {
    if (n === 4) return 'Q' + (p + 1)
    if (n === 2) return (p + 1) + 'e helft'
    if (n === 1) return ''
    return 'P' + (p + 1)
  }

  function maakBlokken(inst) {
    var b = []
    for (var p = 0; p < inst.perioden; p++) {
      var t = 0
      while (t < inst.minuten) {
        var eind = inst.wissel > 0 ? Math.min(t + inst.wissel, inst.minuten) : inst.minuten
        b.push({ periode: p, van: t, tot: eind, duur: eind - t })
        t = eind
      }
    }
    return b
  }

  function blokNaam(b, kort) {
    var pn = periodeNaam(b.periode, st.inst.perioden)
    var tijd = b.van + '-' + b.tot + "'"
    if (kort) return tijd
    return pn ? pn + ' · ' + tijd : tijd
  }

  // ---------- Het algoritme ----------

  function kan(s, lijn) {
    return s.lijnen.indexOf(lijn) >= 0
  }

  // Deterministisch toeval, zodat een seed altijd hetzelfde voorstel geeft.
  function mulberry32(a) {
    return function () {
      a |= 0
      a = (a + 0x6d2b79f5) | 0
      var t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }

  // Hongaarse methode voor een rechthoekige kostmatrix: n rijen (posities) <= m kolommen
  // (spelers). Geeft per rij de gekozen kolom, met de laagste totale kost.
  function hongaars(kost) {
    var n = kost.length
    var m = kost[0].length
    var u = new Array(n + 1).fill(0)
    var v = new Array(m + 1).fill(0)
    var p = new Array(m + 1).fill(0)
    var way = new Array(m + 1).fill(0)
    for (var i = 1; i <= n; i++) {
      p[0] = i
      var j0 = 0
      var minv = new Array(m + 1).fill(Infinity)
      var used = new Array(m + 1).fill(false)
      do {
        used[j0] = true
        var i0 = p[j0]
        var delta = Infinity
        var j1 = 0
        for (var j = 1; j <= m; j++) {
          if (used[j]) continue
          var cur = kost[i0 - 1][j - 1] - u[i0] - v[j]
          if (cur < minv[j]) {
            minv[j] = cur
            way[j] = j0
          }
          if (minv[j] < delta) {
            delta = minv[j]
            j1 = j
          }
        }
        for (var k = 0; k <= m; k++) {
          if (used[k]) {
            u[p[k]] += delta
            v[k] -= delta
          } else minv[k] -= delta
        }
        j0 = j1
      } while (p[j0] !== 0)
      do {
        var jj = way[j0]
        p[j0] = p[jj]
        j0 = jj
      } while (j0)
    }
    var res = new Array(n)
    for (var c = 1; c <= m; c++) if (p[c]) res[p[c] - 1] = c - 1
    return res
  }

  function controleer(spelers, veld) {
    var nodig = veld.length + 1
    if (spelers.length < nodig)
      return 'Er zijn ' + spelers.length + ' spelers aanwezig, maar er moeten er ' + nodig + ' op het veld staan.'
    if (!spelers.some(function (s) { return kan(s, 'K') }))
      return 'Niemand heeft K aangevinkt. Duid minstens één keeper aan.'
    var fouten = []
    ;['V', 'M', 'A'].forEach(function (l) {
      var n = veld.filter(function (p) { return p.lijn === l }).length
      var c = spelers.filter(function (s) { return kan(s, l) }).length
      if (c < n) fouten.push(LIJNNAAM[l] + ' (' + n + ' nodig, ' + c + ' aangevinkt)')
    })
    if (fouten.length) return 'Te weinig spelers voor: ' + fouten.join(', ') + '.'
    return null
  }

  function probeer(blokken, veld, spelers, perioden, rng) {
    var min = {}
    var bank = {}
    var gkTel = {}
    spelers.forEach(function (s) {
      min[s.id] = 0
      bank[s.id] = 0
      gkTel[s.id] = 0
    })

    var keepersKand = spelers.filter(function (s) { return kan(s, 'K') })
    var keepers = []
    for (var p = 0; p < perioden; p++) {
      var k = keepersKand
        .map(function (s) { return { id: s.id, w: gkTel[s.id] + rng() * 0.5 } })
        .sort(function (a, b) { return a.w - b.w })[0].id
      gkTel[k]++
      keepers.push(k)
    }

    var opst = []
    var vorige = null
    var laatst = {}
    for (var bi = 0; bi < blokken.length; bi++) {
      var blok = blokken[bi]
      var gk = keepers[blok.periode]
      var kand = spelers.filter(function (s) { return s.id !== gk })
      var kost = veld.map(function (ps) {
        return kand.map(function (s) {
          var c = kan(s, ps.lijn) ? 0 : ONMOGELIJK
          // Eerlijkheid: 10 per gespeelde minuut. Wie net op de bank zat, schuift een blok naar voor.
          c += (min[s.id] - bank[s.id] * blok.duur) * 10
          // Plaatsvastheid: wie blijft staan, verandert liefst niet van plek; wie terugkomt van
          // de bank, gaat liefst terug naar waar hij het laatst stond.
          var was = laatst[s.id]
          if (was && was !== ps.id) {
            var blijft = vorige && vorige[s.id]
            c += lijnVan(was, veld) === ps.lijn ? (blijft ? 20 : 10) : blijft ? 45 : 25
          }
          c += rng() * 30
          return c
        })
      })
      var toew = hongaars(kost)
      var kaart = {}
      kaart[gk] = 'K'
      for (var r = 0; r < veld.length; r++) {
        var s = kand[toew[r]]
        if (!kan(s, veld[r].lijn)) return null
        kaart[s.id] = veld[r].id
        laatst[s.id] = veld[r].id
      }
      spelers.forEach(function (s) {
        if (kaart[s.id]) {
          min[s.id] += blok.duur
          bank[s.id] = 0
        } else bank[s.id]++
      })
      opst.push(kaart)
      vorige = kaart
    }
    return { opst: opst, score: beoordeel(opst, blokken, spelers) }
  }

  function lijnVan(id, veld) {
    if (id === 'K') return 'K'
    for (var i = 0; i < veld.length; i++) if (veld[i].id === id) return veld[i].lijn
    return null
  }

  function minutenVan(opst, blokken, id) {
    var m = 0
    for (var i = 0; i < opst.length; i++) if (opst[i][id]) m += blokken[i].duur
    return m
  }

  function beoordeel(opst, blokken, spelers) {
    // Wie alleen keeper kan, kan niet eerlijk mee verdeeld worden: die telt niet mee.
    var veldsp = spelers.filter(function (s) {
      return s.lijnen.some(function (l) { return l !== 'K' })
    })
    var mins = veldsp.map(function (s) { return minutenVan(opst, blokken, s.id) })
    var gem = mins.reduce(function (a, b) { return a + b }, 0) / (mins.length || 1)
    var eerlijk = mins.reduce(function (a, m) { return a + (m - gem) * (m - gem) }, 0)
    var spreiding = mins.length ? Math.max.apply(null, mins) - Math.min.apply(null, mins) : 0

    var langeBank = 0
    spelers.forEach(function (s) {
      var reeks = 0
      for (var i = 0; i < opst.length; i++) {
        if (opst[i][s.id]) reeks = 0
        else {
          reeks++
          if (reeks > 1) langeBank += reeks - 1
        }
      }
    })

    var schuif = 0
    var drukte = 0
    for (var i = 1; i < opst.length; i++) {
      var a = opst[i - 1]
      var b = opst[i]
      var wissels = 0
      Object.keys(b).forEach(function (id) {
        if (a[id] && a[id] !== b[id]) schuif++
        if (!a[id]) wissels++
      })
      // Tussen twee periodes ligt het spel toch stil: daar tellen wissels minder zwaar.
      var rust = blokken[i].periode !== blokken[i - 1].periode
      drukte += wissels * wissels * (rust ? 2 : 8)
    }
    return eerlijk * 10 + spreiding * 40 + langeBank * 300 + schuif * 25 + drukte
  }

  function maakSchema(seed) {
    var veld = opstelling().veld
    var spelers = aanwezig()
    var fout = controleer(spelers, veld)
    if (fout) return { fout: fout }
    var blokken = maakBlokken(st.inst)
    var rng = mulberry32(seed)
    var beste = null
    for (var t = 0; t < POGINGEN; t++) {
      var r = probeer(blokken, veld, spelers, st.inst.perioden, rng)
      if (r && (!beste || r.score < beste.score)) beste = r
    }
    if (!beste) return { fout: 'Met deze posities lukt geen geldige opstelling. Vink bij meer spelers meer posities aan.' }
    return { sleutel: sleutel(), blokken: blokken, opst: beste.opst, seed: seed, bewerkt: false }
  }

  // ---------- Wissels tussen twee blokken ----------

  // Wie gaat eruit, wie komt erin, en wie schuift daarvoor op. Vanuit de vrijgekomen plek van
  // wie eruit gaat volg je wie daar nu staat; stond die al op het veld, dan volg je zijn oude
  // plek, tot je bij een nieuwe speler uitkomt.
  function wisselsVoor(b) {
    var vorige = st.schema.opst[b - 1]
    var nu = st.schema.opst[b]
    var opPlek = {}
    Object.keys(nu).forEach(function (id) { opPlek[nu[id]] = id })
    var volgorde = ['K'].concat(opstelling().veld.map(function (p) { return p.id }))
    var uit = Object.keys(vorige)
      .filter(function (id) { return !nu[id] })
      .sort(function (a, c) { return volgorde.indexOf(vorige[a]) - volgorde.indexOf(vorige[c]) })
    var genoemd = {}
    var paren = uit.map(function (o) {
      var plek = vorige[o]
      var wie = opPlek[plek]
      var zet = []
      var wacht = 0
      while (wie && vorige[wie] && wacht++ < 30) {
        zet.push({ id: wie, van: vorige[wie], naar: nu[wie] })
        genoemd[wie] = true
        plek = vorige[wie]
        wie = opPlek[plek]
      }
      if (wie) genoemd[wie] = true
      return { uit: o, in: wie, inPos: wie ? nu[wie] : '', zet: zet }
    })
    var los = Object.keys(nu)
      .filter(function (id) { return vorige[id] && vorige[id] !== nu[id] && !genoemd[id] })
      .map(function (id) { return { id: id, van: vorige[id], naar: nu[id] } })
    return { paren: paren, los: los }
  }

  function zetTekst(z) {
    return esc(naam(z.id)) + ' ' + z.van + '→' + z.naar
  }

  function wisselHTML(w) {
    if (!w.paren.length && !w.los.length) return '<p class="note">Geen wissels.</p>'
    var h = '<ul class="pairs">'
    w.paren.forEach(function (p) {
      h +=
        '<li><span class="pin">' + esc(naam(p.in)) + '</span><span class="for">in voor</span>' +
        '<span class="pout">' + esc(naam(p.uit)) + '</span><span class="pp">' + p.inPos +
        (p.zet.length ? ' · ' + p.zet.map(zetTekst).join(', ') : '') + '</span></li>'
    })
    if (w.los.length) h += '<li><span class="pp">Schuiven: ' + w.los.map(zetTekst).join(', ') + '</span></li>'
    return h + '</ul>'
  }

  function momentNaam(b) {
    var blok = st.schema.blokken[b]
    var pn = periodeNaam(blok.periode, st.inst.perioden)
    if (blok.van === 0) return pn ? 'Start ' + pn : 'Aftrap'
    return (pn ? pn + ' · ' : '') + 'op ' + blok.van + "'"
  }

  // ---------- Invoer: wedstrijd ----------

  function vulKeuzes() {
    var sv = $('spelvorm')
    sv.innerHTML = Object.keys(SPELVORMEN)
      .map(function (k) { return '<option value="' + k + '">' + SPELVORMEN[k].naam + '</option>' })
      .join('')
    sv.value = String(st.inst.spelvorm)

    var os = $('opstelling')
    var opst = SPELVORMEN[st.inst.spelvorm].opstellingen
    os.innerHTML = Object.keys(opst)
      .map(function (k) { return '<option value="' + k + '">' + opst[k].naam + '</option>' })
      .join('')
    os.value = st.inst.opstelling

    $('perioden').value = String(st.inst.perioden)
    $('minuten').value = String(st.inst.minuten)

    var w = $('wissel')
    var opties = [3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 35, 40, 45].filter(function (m) {
      return m < st.inst.minuten
    })
    if (st.inst.wissel && opties.indexOf(st.inst.wissel) < 0 && st.inst.wissel < st.inst.minuten) {
      opties.push(st.inst.wissel)
      opties.sort(function (a, b) { return a - b })
    }
    w.innerHTML =
      '<option value="0">Alleen tussen de periodes</option>' +
      opties.map(function (m) { return '<option value="' + m + '">Om de ' + m + ' minuten</option>' }).join('')
    w.value = String(opties.indexOf(st.inst.wissel) >= 0 ? st.inst.wissel : 0)
    st.inst.wissel = +w.value

    var blokken = maakBlokken(st.inst)
    var tot = st.inst.perioden * st.inst.minuten
    $('samenvatting').textContent =
      st.inst.perioden + ' × ' + st.inst.minuten + "' = " + tot + ' minuten, in ' + blokken.length +
      ' blokken. De keeper wisselt alleen tussen de periodes.'
  }

  $('spelvorm').addEventListener('change', function () {
    var v = +this.value
    var s = SPELVORMEN[v].standaard
    st.inst = { spelvorm: v, opstelling: Object.keys(SPELVORMEN[v].opstellingen)[0], perioden: s.perioden, minuten: s.minuten, wissel: s.wissel }
    na()
  })
  $('opstelling').addEventListener('change', function () {
    st.inst.opstelling = this.value
    na()
  })
  $('perioden').addEventListener('change', function () {
    st.inst.perioden = +this.value
    na()
  })
  $('minuten').addEventListener('change', function () {
    var m = Math.round(+this.value)
    st.inst.minuten = Math.max(5, Math.min(60, m || 20))
    if (st.inst.wissel >= st.inst.minuten) st.inst.wissel = 0
    na()
  })
  $('wissel').addEventListener('change', function () {
    st.inst.wissel = +this.value
    na()
  })

  // Na elke wijziging van de invoer.
  function na() {
    vulKeuzes()
    tekenSpelers()
    tekenSchema()
    bewaar()
  }

  // ---------- Invoer: spelers ----------

  function voegToe(namen) {
    namen
      .map(function (n) { return n.trim() })
      .filter(Boolean)
      .forEach(function (n) {
        st.spelers.push({ id: nieuwId(), naam: n, lijnen: ['V', 'M', 'A'], aanwezig: true })
      })
  }

  $('erbij').addEventListener('submit', function (e) {
    e.preventDefault()
    var inp = $('nieuw')
    voegToe(inp.value.split(/[\n,;]+/))
    inp.value = ''
    na()
    inp.focus()
  })

  $('nieuw').addEventListener('paste', function (e) {
    var t = (e.clipboardData || window.clipboardData).getData('text')
    if (!/\n/.test(t)) return
    e.preventDefault()
    voegToe(t.split(/\r?\n/))
    na()
  })

  function tekenSpelers() {
    var ul = $('spelers')
    ul.innerHTML = st.spelers
      .map(function (s) {
        return (
          '<li class="speler' + (s.aanwezig ? '' : ' afwezig') + '" data-id="' + s.id + '">' +
          '<input type="checkbox" class="aanw" ' + (s.aanwezig ? 'checked' : '') +
          ' aria-label="' + esc(s.naam) + ' is aanwezig" title="Aanwezig">' +
          '<input type="text" class="naam" value="' + esc(s.naam) + '" aria-label="Naam">' +
          '<div class="lijnen" role="group" aria-label="Posities van ' + esc(s.naam) + '">' +
          LIJNEN.map(function (l) {
            return (
              '<button type="button" data-lijn="' + l + '" aria-pressed="' + kan(s, l) + '" title="' +
              LIJNNAAM[l] + '">' + l + '</button>'
            )
          }).join('') +
          '</div><button type="button" class="weg" aria-label="' + esc(s.naam) + ' verwijderen" title="Verwijderen">×</button></li>'
        )
      })
      .join('')

    var n = aanwezig().length
    var nodig = opstelling().veld.length + 1
    var keepers = aanwezig().filter(function (s) { return kan(s, 'K') }).length
    var t = ''
    if (!st.spelers.length) t = 'Nog geen spelers.'
    else {
      t = n + ' aanwezig, ' + nodig + ' op het veld'
      if (n > nodig) t += ', dus ' + (n - nodig) + ' op de bank per blok.'
      else if (n === nodig) t += ', dus niemand op de bank.'
      else t += ': er ' + (nodig - n === 1 ? 'is' : 'zijn') + ' er nog ' + (nodig - n) + ' te weinig.'
      if (!keepers) t += ' Nog geen keeper aangeduid.'
      else if (keepers > 1) t += ' De keeper roteert over ' + keepers + ' spelers.'
    }
    $('telling').textContent = t
  }

  $('spelers').addEventListener('click', function (e) {
    var li = e.target.closest('.speler')
    if (!li) return
    var s = speler(li.dataset.id)
    if (!s) return
    var knop = e.target.closest('button')
    if (!knop) return
    if (knop.classList.contains('weg')) {
      st.spelers = st.spelers.filter(function (x) { return x !== s })
      na()
      return
    }
    var l = knop.dataset.lijn
    if (!l) return
    if (kan(s, l)) {
      if (s.lijnen.length === 1) return // minstens één plek
      s.lijnen = s.lijnen.filter(function (x) { return x !== l })
    } else s.lijnen.push(l)
    na()
  })

  $('spelers').addEventListener('change', function (e) {
    if (!e.target.classList.contains('aanw')) return
    var s = speler(e.target.closest('.speler').dataset.id)
    s.aanwezig = e.target.checked
    na()
  })

  // Een naam aanpassen tekent de lijst niet opnieuw, anders verlies je de focus.
  $('spelers').addEventListener('input', function (e) {
    if (!e.target.classList.contains('naam')) return
    var s = speler(e.target.closest('.speler').dataset.id)
    s.naam = e.target.value
    bewaar()
    if (st.schema) tekenSchema()
  })

  // ---------- Schema: knoppen ----------

  var bewerken = false
  var gekozen = null
  var gewapend = false

  $('maak').addEventListener('click', function () {
    if (st.schema && st.schema.bewerkt && !verouderd() && !gewapend) {
      gewapend = true
      tekenKnoppen()
      setTimeout(function () {
        gewapend = false
        tekenKnoppen()
      }, 3000)
      return
    }
    gewapend = false
    var r = maakSchema((Math.random() * 4294967296) >>> 0)
    if (r.fout) {
      st.schema = null
      toonMelding(r.fout)
    } else {
      st.schema = r
      st.blok = 0
      toonMelding('')
    }
    bewerken = false
    gekozen = null
    bewaar()
    tekenSchema()
  })

  $('afdrukken').addEventListener('click', function () {
    window.print()
  })

  $('aanpassen').addEventListener('click', function () {
    bewerken = !bewerken
    gekozen = null
    tekenSchema()
  })

  $('wissen').addEventListener('click', function () {
    if (!confirm('Alle spelers en het schema wissen?')) return
    try {
      localStorage.removeItem(OPSLAG)
    } catch (e) {}
    st = standaardToestand()
    toonMelding('')
    na()
  })

  var meldingTekst = ''
  function toonMelding(t) {
    meldingTekst = t
  }

  function verouderd() {
    return st.schema && st.schema.sleutel !== sleutel()
  }

  function tekenKnoppen() {
    var m = $('maak')
    if (verouderd()) gewapend = false
    if (gewapend) m.textContent = 'Aanpassingen kwijt. Zeker?'
    else m.textContent = st.schema && !verouderd() ? 'Nieuw voorstel' : 'Maak wisselschema'
    m.classList.toggle('gewapend', gewapend)
    $('afdrukken').hidden = !st.schema || verouderd()
  }

  // Twee spelers aantikken in het huidige blok: allebei op het veld = van plaats wisselen,
  // een veldspeler en een bankzitter = de bankzitter neemt zijn plaats in.
  function kies(id) {
    if (!bewerken) return
    if (!gekozen) {
      gekozen = id
      tekenSchema()
      return
    }
    if (gekozen === id) {
      gekozen = null
      tekenSchema()
      return
    }
    var kaart = st.schema.opst[st.blok]
    var a = kaart[gekozen]
    var b = kaart[id]
    if (a && b) {
      kaart[gekozen] = b
      kaart[id] = a
    } else if (a) {
      delete kaart[gekozen]
      kaart[id] = a
    } else if (b) {
      delete kaart[id]
      kaart[gekozen] = b
    } else {
      gekozen = id
      tekenSchema()
      return
    }
    gekozen = null
    st.schema.bewerkt = true
    bewaar()
    tekenSchema()
  }

  // ---------- Schema: weergave ----------

  var veldEl = $('veld')
  var poppetjes = {}

  function zorgVoorPoppetjes() {
    var ids = {}
    aanwezig().forEach(function (s) { ids[s.id] = true })
    Object.keys(poppetjes).forEach(function (id) {
      if (!ids[id]) {
        poppetjes[id].remove()
        delete poppetjes[id]
      }
    })
    Object.keys(ids).forEach(function (id) {
      if (poppetjes[id]) return
      var d = document.createElement('div')
      d.className = 'p off'
      d.innerHTML = '<div class="in"><div class="disc"></div><div class="name"></div><div class="pos"></div></div>'
      d.style.left = '50%'
      d.style.top = '100%'
      d.querySelector('.in').addEventListener('click', function () { kies(id) })
      veldEl.appendChild(d)
      poppetjes[id] = d
    })
  }

  function tekenSchema() {
    tekenKnoppen()
    var mel = $('melding')
    var tekst = meldingTekst
    if (!tekst && verouderd())
      tekst = 'Je spelers of de wedstrijd zijn veranderd sinds dit schema. Maak een nieuw voorstel.'
    mel.hidden = !tekst
    mel.textContent = tekst

    var toon = st.schema && !verouderd()
    $('schema').hidden = !toon
    if (!toon) return

    var sch = st.schema
    var n = sch.blokken.length
    var b = Math.max(0, Math.min(n - 1, st.blok))
    st.blok = b
    var nu = sch.opst[b]
    var vorige = b > 0 ? sch.opst[b - 1] : null
    var veld = opstelling().veld
    var xy = { K: KEEPER }
    veld.forEach(function (p) { xy[p.id] = p })

    // Blokknoppen, gegroepeerd per periode.
    var bl = $('blokken')
    bl.style.setProperty('--kol', st.inst.perioden)
    var h = ''
    for (var p = 0; p < st.inst.perioden; p++) {
      h += '<div class="q"><div class="qh">' + (periodeNaam(p, st.inst.perioden) || 'Wedstrijd') + '</div>'
      sch.blokken.forEach(function (blok, i) {
        if (blok.periode !== p) return
        h += '<button type="button" data-b="' + i + '" aria-pressed="' + (i === b) + '">' + blokNaam(blok, true) + '</button>'
      })
      h += '</div>'
    }
    bl.innerHTML = h

    $('nu').textContent = blokNaam(sch.blokken[b])
    $('mnu').textContent = blokNaam(sch.blokken[b])
    $('vorige').disabled = $('mvorige').disabled = b === 0
    $('volgende').disabled = $('mvolgende').disabled = b === n - 1

    // Het veld.
    zorgVoorPoppetjes()
    Object.keys(poppetjes).forEach(function (id) {
      var d = poppetjes[id]
      var plek = nu[id]
      d.querySelector('.disc').textContent = initialen(id)
      d.querySelector('.name').textContent = naam(id)
      if (plek && xy[plek]) {
        d.style.left = xy[plek].x + '%'
        d.style.top = (xy[plek].y / 140) * 100 + '%'
        d.classList.remove('off')
        d.querySelector('.pos').textContent = plek
      } else {
        d.classList.add('off')
        d.style.top = '100%'
      }
      d.classList.toggle('gk', plek === 'K')
      d.classList.toggle('new', !!(vorige && plek && !vorige[id]))
      d.classList.toggle('sel', gekozen === id)
    })

    // Wissels van dit moment.
    var titel = $('wisseltitel')
    var body = $('wisselbody')
    if (!vorige) {
      titel.textContent = 'Aftrap'
      body.innerHTML =
        '<p class="note">Startopstelling.' +
        (n > 1 ? ' De eerste wissel komt ' + (sch.blokken[1].van ? "op " + sch.blokken[1].van + "'" : 'bij de volgende periode') + '.' : '') +
        '</p>'
    } else {
      titel.textContent = 'Wissels · ' + momentNaam(b)
      body.innerHTML = wisselHTML(wisselsVoor(b))
    }

    // De bank.
    var bankEl = $('bank')
    var opBank = aanwezig().filter(function (s) { return !nu[s.id] })
    bankEl.innerHTML = opBank.length
      ? opBank
          .map(function (s) {
            return '<button type="button" data-id="' + s.id + '" class="' + (gekozen === s.id ? 'sel' : '') + '">' + esc(s.naam) + '</button>'
          })
          .join('')
      : '<p class="note">Niemand.</p>'

    document.querySelector('.wrap').classList.toggle('editing', bewerken)
    var tg = $('aanpassen')
    tg.setAttribute('aria-pressed', bewerken)
    tg.textContent = bewerken ? '✓ Klaar' : '✎ Aanpassen'
    $('ehint').innerHTML = bewerken
      ? gekozen
        ? '<b>' + esc(naam(gekozen)) + '</b> gekozen. Tik op de speler of bankzitter waarmee hij wisselt.'
        : 'Tik twee spelers aan om ze te wisselen in <b>' + esc(blokNaam(sch.blokken[b])) + '</b>.'
      : sch.bewerkt
        ? 'Je hebt dit voorstel aangepast.'
        : ''

    // Alle wisselmomenten.
    var ov = ''
    for (var i = 1; i < n; i++) {
      ov +=
        '<button type="button" class="mom' + (i === b ? ' on' : '') + '" data-b="' + i + '"><span class="mt">' +
        esc(momentNaam(i)) + '</span>' + wisselHTML(wisselsVoor(i)) + '</button>'
    }
    $('overzicht').innerHTML = ov || '<p class="note">Er zijn geen wisselmomenten.</p>'

    // Speeltijdtabel.
    var t = '<thead><tr><th>Speler</th>'
    sch.blokken.forEach(function (blok, i) {
      var sep = i > 0 && blok.periode !== sch.blokken[i - 1].periode
      var pn = periodeNaam(blok.periode, st.inst.perioden)
      t +=
        '<th class="' + (i === b ? 'cur' : '') + (sep ? ' qsep' : '') + '"><button type="button" data-b="' + i + '">' +
        (pn ? esc(pn) + '<br>' : '') + blok.van + '-' + blok.tot + '</button></th>'
    })
    t += '<th>Min</th></tr></thead><tbody>'
    aanwezig().forEach(function (s) {
      var m = 0
      t += '<tr><td>' + esc(s.naam) + '</td>'
      sch.blokken.forEach(function (blok, i) {
        var plek = sch.opst[i][s.id]
        if (plek) m += blok.duur
        var sep = i > 0 && blok.periode !== sch.blokken[i - 1].periode
        t +=
          '<td class="' + (plek ? (plek === 'K' ? 'gk' : '') : 'b') + (i === b ? ' cur' : '') + (sep ? ' qsep' : '') + '">' +
          (plek || 'bank') + '</td>'
      })
      t += '<td class="tot">' + m + "'</td></tr>"
    })
    $('tabel').innerHTML = t + '</tbody>'
  }

  function ga(i) {
    if (!st.schema) return
    st.blok = Math.max(0, Math.min(st.schema.blokken.length - 1, i))
    gekozen = null
    bewaar()
    tekenSchema()
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-b]')
    if (el && el.closest('#schema')) ga(+el.dataset.b)
    var bk = e.target.closest('#bank button[data-id]')
    if (bk) kies(bk.dataset.id)
  })
  $('vorige').addEventListener('click', function () { ga(st.blok - 1) })
  $('volgende').addEventListener('click', function () { ga(st.blok + 1) })
  $('mvorige').addEventListener('click', function () { ga(st.blok - 1) })
  $('mvolgende').addEventListener('click', function () { ga(st.blok + 1) })

  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input, select, textarea')) return
    if (e.key === 'ArrowRight') ga(st.blok + 1)
    if (e.key === 'ArrowLeft') ga(st.blok - 1)
  })

  var sx = null
  var sy = null
  veldEl.addEventListener('touchstart', function (e) {
    sx = e.touches[0].clientX
    sy = e.touches[0].clientY
  }, { passive: true })
  veldEl.addEventListener('touchend', function (e) {
    if (sx === null) return
    var dx = e.changedTouches[0].clientX - sx
    var dy = e.changedTouches[0].clientY - sy
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) ga(st.blok + (dx < 0 ? 1 : -1))
    sx = null
  }, { passive: true })

  na()

  // Voor tests in de console of met node: het algoritme los aanroepen.
  window.wisselschema = { maakSchema: maakSchema, toestand: function () { return st } }
})()

/**
 * Simple Analytics, dezelfde twee scripts als de rest van de blog (zie
 * layouts/_partials/head/simple_analytics.html en static/huiswerkbladen/blad.js). Alleen op
 * bckn.be zelf, zodat lokaal testen niet meetelt.
 */
if (location.hostname === 'bckn.be') {
  ;['latest.js', 'auto-events.js'].forEach(function (bestand) {
    var s = document.createElement('script')
    s.async = true
    s.src = 'https://scripts.simpleanalyticscdn.com/' + bestand
    document.head.appendChild(s)
  })
}
