/**********************
 *    @eonXEonify
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports)
    : typeof define === 'function' && define.amd ? define(['exports'], factory)
      : (factory((global.eonXEonify = global.eonXEonify || {})))
}(this, function (exports) {
  'use strict'

  const metas = new Map()
  const queue = []
  const map = queue.map
  const some = queue.some
  const hasOwnProperty = queue.hasOwnProperty
  const origin = 'https://cdn.jsdelivr.net/npm/'
  const identifierRe = /^((?:@[^/@]+\/)?[^/@]+)(?:@([^/]+))?(?:\/(.*))?$/
  const versionRe = /^\d+\.\d+\.\d+(-[\w-.+]+)?$/
  const extensionRe = /\.[^/]*$/
  const mains = ['unpkg', 'jsdelivr', 'browser', 'main']

  class RequireError extends Error {
    constructor (message) {
      super(message)
    }
  }

  RequireError.prototype.name = RequireError.name

  function main (meta) {
    for (const key of mains) {
      const value = meta[key]
      if (typeof value === 'string') {
        return extensionRe.test(value) ? value : `${value}.js`
      }
    }
  }

  function parseIdentifier (identifier) {
    const match = identifierRe.exec(identifier)
    return match && {
      name: match[1],
      version: match[2],
      path: match[3],
    }
  }

  // resolveMeta
  async function resolveMeta (target) {
    const url = `${origin}${target.name}${target.version ? `@${target.version}` : ''}/package.json`

    let meta = metas.get(url)

    if (!meta) {
      let response = await fetch(url)

      if (!response.ok) throw new RequireError('unable to load package.json')

      if (response.redirected && !metas.has(response.url)) {
        metas.set(response.url, meta)
      } else {
        let json = await response.json()

        meta = json

        metas.set(url, json)
      }
    }

    return meta
  }

  async function resolve (name, base) {
    if (name.startsWith(origin)) name = name.substring(origin.length)
    if (/^(\w+:)|\/\//i.test(name)) {
      return name
    }
    if (/^[.]{0,2}\//i.test(name)) {
      let res
      if (inNode()) { // _e_
        // res = 'file:///E:/Dropbox/dBox/e/c/eons/eons/d3-interpolate.js'
        try {
          let p = path.normalize(name)
          res = new URL('file:///' + __dirname + '/' + p).href
        } catch (e) {
          console.log('resolve url error:', e)
        }
      } else {
        res = new URL(name, base == null ? location : base).href
      }

      return res
    }

    if (!name.length || /^[\s._]/.test(name) || /\s$/.test(name)) throw new RequireError('illegal name')
    const target = parseIdentifier(name)
    if (!target) return `${origin}${name}`

    if (!target.version && base != null && base.startsWith(origin)) {
      const meta = await resolveMeta(parseIdentifier(base.substring(origin.length)))

      target.version = meta.dependencies && meta.dependencies[target.name] || meta.peerDependencies && meta.peerDependencies[target.name]
    }
    if (target.path && !extensionRe.test(target.path)) target.path += '.js'
    if (target.path && target.version && versionRe.test(target.version)) {
      let res = `${origin}${target.name}@${target.version}/${target.path}`
      return res
    }

    const meta = await resolveMeta(target)

    let res = `${origin}${meta.name}@${meta.version}/${target.path || main(meta) || 'index.js'}`

    return res
  }

  const d3Require = requireFrom(resolve)

  function requireFrom (resolver) {
    const cache = new Map()
    const requireBase = requireRelative(null)

    async function requireAbsolute (url) {
      if (typeof url !== 'string') return url
      let module = cache.get(url)

      if (inNode()) { // _e_
        if (/^file:/i.test(url)) { // file:
          if (!module) {
            let response
            try {
              let filepath = path.basename(url)

              response = fs.readFileSync(filepath, 'utf8')
            } catch (e) {

            }
            let string = response
            // console.log('url:', url)
            module = eval(string)

            module = new Promise((resolve, reject) => {
              try {
                let f = queue.pop()
                let m = requireRelative(url)
                let p = f(m)
                resolve(p)
              } catch (error) {
                reject(new RequireError('invalid module'))
              }

              cache.set(url, module)
            })
          }
        } else { // if (/^(\w+:)|\/\//i.test(url)) {
          if (!module) {
            let response = await fetch(url)

            let string = await response.text()
            // console.log('url:', url)
            module = eval(string) //

            module = new Promise((resolve, reject) => {
              try {
                let f = queue.pop()
                let m = requireRelative(url)
                let p = f(m)
                resolve(p)
              } catch (error) {
                reject(new RequireError('invalid module'))
              }
              cache.set(url, module)
            })
          }
        }
      } else {
        if (!module) {
          module = new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.onload = () => {
              try {
                let f = queue.pop()
                let m = requireRelative(url)
                let p = f(m)
                resolve(p)
              } catch (error) {
                reject(new RequireError('invalid module'))
              }
              script.remove()
            }
            script.onerror = () => {
              reject(new RequireError('unable to load module'))
              script.remove()
            }
            script.async = true
            script.src = url
            window.define = define
            document.head.appendChild(script)
          })
          cache.set(url, module)
        }
      }

      return module
    }

    function requireRelative (base) {
      return name => Promise.resolve(resolver(name, base)).then(requireAbsolute)
    }

    function requireAlias (aliases) {
      return requireFrom((name, base) => {
        if (name in aliases) {
          name = aliases[name], base = null
          if (typeof name !== 'string') return name
        }
        return resolver(name, base)
      })
    }

    function d3Require (name) {
      return arguments.length > 1
        ? Promise.all(map.call(arguments, requireBase)).then(merge)
        : requireBase(name)
    }

    d3Require.alias = requireAlias
    d3Require.resolve = resolver

    return d3Require
  }

  function merge (modules) {
    const o = {}
    for (const m of modules) {
      for (const k in m) {
        if (hasOwnProperty.call(m, k)) {
          if (m[k] == null) Object.defineProperty(o, k, {get: getter(m, k)})
          else o[k] = m[k]
        }
      }
    }
    return o
  }

  function getter (object, name) {
    return () => object[name]
  }

  function isexports (name) {
    return (name + '') === 'exports'
  }

  function define (name, dependencies, factory) {
    const n = arguments.length
    if (n < 2) factory = name, dependencies = []
    else if (n < 3) factory = dependencies, dependencies = typeof name === 'string' ? [] : name

    let r = some.call(dependencies, isexports) ? d3Require => {
      const exports = {}
      return Promise.all(map.call(dependencies, name => {
        return isexports(name += '') ? exports : d3Require(name)
      })).then(dependencies => {
        factory.apply(null, dependencies)
        return exports
      })
    } : d3Require => {
      return Promise.all(map.call(dependencies, d3Require)).then(dependencies => {
        return typeof factory === 'function' ? factory.apply(null, dependencies) : factory
      })
    }

    queue.push(r)
  }

  define.amd = {}

  // ----------------------------------------------

  function inNode () {
    if (typeof window === 'undefined') return true
    let winisobject = typeof window === 'object'
    let isnode1 = window.name === 'nodejs'
    let isnode2 = navigator.userAgent.includes('Node.js') ||
      navigator.userAgent.includes('jsdom')
    return (winisobject && isnode1 && isnode2)
  }

  const capitalize = s => (s == null) ? '' : s.charAt(0).toUpperCase() + s.slice(1)
  const a = d => Array.isArray(d) ? d : Array.of(d)

  const filenize = function (nome, path = '.', ext = 'js') {
    return `${path}/${nome}.${ext}`
  }

  const ceonize = function (nome, pres = '') {
    let camelized
    if (pres === '' || pres === 'eon') {
      camelized = camelize(nome)
    } else {
      camelized = camelize('eon-' + pres + '-' + nome) // [uni-wen,muon] => muonUniWen
    }
    return camelized
  }

  const feonize = function (nome, pres = '') {
    let xeonized
    if (pres === '' || pres === 'eon') {
      xeonized = './' + nome + '.js'
    } else {
      xeonized = './' + 'eon-' + pres + '-' + nome + '.js'
    }
    return xeonized
  }

  const xeonize = function (nome, pres = '') {
    let xeonized
    if (pres === '' || pres === 'eon') {
      xeonized = nome
    } else {
      xeonized = 'eon-' + pres + '-' + nome
    }
    return xeonized
  }

  const precamelize = str => str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => index === 0 ? letter.toLowerCase() : letter.toUpperCase())
    .replace(/\s+/g, '') // remove white space
    .replace(/-+/g, '') // remove hyphen

  const snakefy = str => str
    .replace(/([a-z][A-Z])/g, function (g) { return g[0] + '-' + g[1].toLowerCase() })

  const eonpre = d => 'eon' + capitalize(d)

  const camelize = str => precamelize(str)

  async function getCell (e, n, m) { // eon, name, mapper returns enty
    console.assert(e !== undefined, `eon ${n} is undefined`)
    if (e[n] !== undefined && typeof e[n] === 'function') {
      // n is eon with e[n] async constructor eg. async function eonitem
      // n is ani with e[n] async constructor eg. async function anitem
      // e[n](m) is promise
      let cell = await e[n](m)
      return cell
    } else if (typeof e === 'object') {
      // n is d3Scale (e[n] is undefined)
      return e
    } else {
      return e
    }
  }
  const mapCell = (e, n, m) => m({[n]: e})[n]

  // ............................. xs
  //
  //  is retrieved by the mapper in the anitem
  //  to get eons, muons, bosons from the store or retrieves them from cms
  //

  const getCeonSync = (part, __eo) => __eo(part[0])

  // ............................. getCeon
  async function getCeon (part, __eo) {
    console.log('getCeon:', part)
    let ceon = part[0]
    let r = __eo(ceon)
    return r ? Promise.resolve(r) : Promise.reject(r)
  }

  // ............................. getFeon
  async function getFeon (part, __eo) { // d3Froce3d, ./d3-force-3d.js
    console.log('getFeon:', part)
    let eon = await d3Require(...a(part[1]))
    console.log('eon:', eon)

    console.assert(eon !== undefined, `eon undefined for part ${part[0]}`)

    let cell = await getCell(eon, part[0], __eo) // eon to cell

    let feon = await mapCell(cell, part[0], __eo) // map cell

    return feon
  }
  // ............................. getXeon
  async function getXeon (part, __eo) { // d3Froce3d, d3-force-3d
    console.log('getXeon:', part)
    let eon = await d3Require(...a(part[1]))
    let cell = await getCell(eon, part[0], __eo) // eon to cell
    let xeon = await mapCell(cell, part[0], __eo) // map cell
    return xeon
  }

  // ............................. getEon
  // nome is partName: eg 'eonMuonGraticule'
  async function getEon (inpart, __eo) {
    let part = (typeof inpart === 'string') ? [inpart, ''] : inpart

    let res = []
    if (part[0] === undefined) {

      // return empty array

    } else if (typeof part[0] === 'function') {
      let [eonfn, pres] = part
      let x = await eonfn(__eo)
      console.log('x:', pres, x)

      res = await x[pres]() // in eon-z expect the z function
    } else {
      let [name, pres] = part // [name, prefix] eg.: [versor, muon]

      let ceon = ceonize(name, pres) // eg.: 'eonMuonVersor' get from store
      let feon = feonize(name, pres) // eg.: './eon-muon-versor.js' get from file
      let xeon = xeonize(name, pres) // eg.: 'eon-muon-versor' get from cdn

      // array of promises
      var iterpromises = [
        () => getCeon([ceon, ''], __eo),
        () => getFeon([ceon, feon], __eo),
        () => getXeon([ceon, xeon], __eo),
      ]

      // Promise.prototype.catch() The catch() method returns a Promise and deals with rejected cases only
      // if reject, get the eon sync from mapper or call next promise in array
      // i: 0 eon from store
      // i: 1 eon from file
      // i: 2 eon from cdn

      res = await iterpromises.reduce( // _e_
        (promis, func, i) => promis.catch(failed => {
          return Promise.resolve(getCeonSync([ceon, ''], __eo) || func())
        }), Promise.reject('init reduce'))
        .catch(failed => { console.log('Failed: ', ceon, failed) })
    }

    return res
  }

  // ............................. xs tell how to get an eon
  let xs = function (__eo = {}) {
    const patterns = [

      ['boson', 'b', ''],
      ['ctl', 'c', 'ctl'],
      ['dat', 'd', 'dat'],
      ['eohal', 'e', 'eohal'],
      ['force', 'f', 'force'],
      ['geo', 'g', 'geo'],
      ['hal', 'h', 'hal'],
      ['lib', 'l', 'lib'],
      ['muon', 'm', 'muon'],
      ['proton', 'p', 'proton'],
      ['render', 'r', 'render'],
      ['zindex', 'z', 'z'],

    ]

    let eons = () => {}
    for (let i = 0; i < patterns.length; i++) {
      let pattern = patterns[i]
      let name = pattern[0]
      let code = pattern[1]
      let pres = pattern[2]
      eons[name] = eons[code] = (n, p = pres) => getEon([n, p], __eo)
    }

    return eons
  }

  // ............................. xEo
  //
  //    manage eons state
  //
  let eomap = function () {
    let state = {}

    let stater = function (_) {
      if (arguments.length < 1) return state

      if (Array.isArray(_)) {
        let ceon = ceonize(..._)

        if (state[ceon] !== undefined) {
          return state[ceon]
        } else {
          return null
        }
      } else if (typeof _ === 'object') return (state = Object.assign({}, state, _))
      else if (typeof _ === 'string' && state[_] !== undefined) return state[_]
      else if (typeof _ === 'string' && state[_] === undefined) return null
    }

    return stater
  }

  // ............................. eo
  let eostore = async function () {
    let __eo = eomap() // init mapper

    __eo({'xs': xs(__eo)}) // map xs
    __eo({'xD3Require': { require: d3Require, requireFrom: requireFrom } })

    await __eo('xs').b('eon-muon-store') // map store
    await __eo('xs').b('eon-eohal-core') // hal core
    return __eo
  }

  // ............................. eonit
  //
  // called in z-file with anitem and a time
  // anitem is async function that takes the mapper xEo{} as argument
  // xEo gets xs from the state to retrive eons
  //
  let eonit = async function ({anitem, time}) {
    let __eo = await eostore()
    let eonMuonStore = __eo('eonMuonStore')

    let getter //
    if (typeof anitem === 'string') {
      getter = await __eo('xs').b
    } else {
      getter = await __eo('xs').z
    }
    let aniset = await getter(anitem) // z eon

    let animas = aniset
    if (aniset['z'] !== undefined) { // anitem comes from string
      animas = aniset.z()
    }

    eonMuonStore.apply({type: 'UPDANIMA', animas: animas})
    await __eo('xs').b('eon-muon-animation') // map animation

    return __eo
  }

  // ............................. eon
  let eonify = async function ({anitem, time}) {
    let __eo = await eonit({anitem, time})
    return __eo('eonMuonAnimation').animate(time) // animate
  }

  // ............................. support debug
  let __anitem = async function (__eo) {
    let z = function () {
      let anima = {
        eohal: 'sol',
        eotim: {'td': 1000, 't0': 0, 't1': 1, 't2': 1, 't3': 1},
        eoric: {gid: 'g', cid: 'c', fid: 'f'},
        eofold: {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, [[[ 0, 110 ]]] ] },
        },
        eoload: {
          eocrom: {'csx': 0, 'cf': 777, 'cs': 777, 'cw': 0.99, 'co': 0.4, 'cp': 0.99},
        },
      }
      return Array.of(anima)
    }
    let enty = () => {}
    enty.z = z
    return enty
  }

  // ............................. eoeocharge
  let eocharge = async function (__eo) {
    await __eo('xs').b('eon-ctl-timer')
    await __eo('xs').b('eon-eohal-sol')
    await __eo('xs').b('eon-render-svg')

    return __eo
  }

  // ............................. eodebug
  let eodebug = async function ({anitem, time}) {
    let __eo = await eonit({anitem, time})
    __eo = await eocharge(__eo)

    let eonMuonAnimation = await __eo('xs').b('eon-muon-animation')

    let gjfc = {}, times = 0, dt = 100, t = 0, ntimes = 3
    // https://stackoverflow.com/questions/3144711/find-the-time-left-in-a-settimeout
    async function aniTimer (callback) {
      await callback()
      setTimeout(() => {
        t = times * dt
        ++times
        gjfc = eonMuonAnimation.animier(t) // animier
        aniTimer(callback)
      }, dt)
    }
    const callback = () => {}
    await aniTimer(callback)
    for (let i = 0; i < ntimes; i++) {
      dt = dt * ntimes
      await Promise.resolve() // allow any pending jobs in the PromiseJobs queue to run
    }
  }
  function getEonItem (input) { // _e_
    console.log('input:', input)
    const rfile1 = new RegExp('^.*/(?<filename>[^/]+)(?=.html).html(?:#)?(?<anchor>.*)$', 'u')
    let match1 = rfile1.exec(input) || {}
    let {filename, anchor} = (match1.groups || {})

    const rfile2 = new RegExp('.*/(?<filename>[^/?#]+)(.html)?[^#]*(?==)v?=?(?<val>.*)(?:#)?#?(?<anchor>[^#]*)$', 'u')
    let match2 = rfile2.exec(input) || {}
    let {val} = (match2.groups || {})

    let res
    if (val) res = val
    else if (anchor) res = anchor
    else if (filename) res = filename

    res = (res && res !== 'index') ? res : 'eon-z814m-d3heart'

    return res
  }
  // ............................. exports
  exports.getCeon = getCeon
  exports.getFeon = getFeon
  exports.getXeon = getXeon

  exports.inNode = inNode
  exports.getEonItem = getEonItem
  exports.eomap = eomap
  exports.eostore = eostore
  exports.eonit = eonit
  exports.eonify = eonify
  exports.eocharge = eocharge
  exports.eodebug = eodebug
  exports.capitalize = capitalize
  exports.filenize = filenize
  exports.ceonize = ceonize
  exports.feonize = feonize
  exports.camelize = camelize
  exports.getCell = getCell
  exports.getEon = getEon
  exports.mapCell = mapCell
  exports.xs = xs
  exports.require = d3Require
  exports.requireFrom = requireFrom

  Object.defineProperty(exports, '__esModule', { value: true })
}))
