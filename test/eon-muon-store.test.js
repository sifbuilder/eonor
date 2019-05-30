
if (typeof fetch !== 'function') {
  global.fetch = require('node-fetch-polyfill')
}

global.urlPolyfill = require('url-polyfill')
global.path = require('path')
global.fs = require('fs')

const xEonify = require('../eon-x-eonify.js')

jest.useFakeTimers()

test('test store', async () => {
  let __eo = await xEonify.eonit({anitem: undefined})
  __eo = await xEonify.eocharge(__eo)
  let muonStore = await __eo('xs').m('store')

  let animas = []
  animas = muonStore.animasAll()
  console.log('animas:', animas)

  expect(animas.length).toEqual(0)

  let anima = {
    eoric: {
      cid: 'c',
      fid: 'f',
      gid: 'g',
      uid: 'c_f_g',
    }}

  muonStore.apply({type: 'UPDANIMA', animas: [anima]})
  animas = muonStore.animasAll()
  expect(animas.length).toEqual(1)

  expect(muonStore.animas().length).toEqual(1)

  anima.eodelled = 1 // deletes from store _e_
  muonStore.apply({type: 'UPDANIMA', animas: [anima]})

  expect(muonStore.animas().length).toEqual(0)
  expect(muonStore.animasAll().length).toEqual(0)

  let anima1 = {
    eoric: {
      gid: 'g',
      cid: 'c1',
      fid: 'f1',
      uid: 'g_c1_f1',
    }}

  let anima2a = {
    eoric: {
      gid: 'g',
      cid: 'c2',
      fid: 'f2a',
      uid: 'g_c2_f2a',
    }}

  let anima2b = {
    eoric: {
      gid: 'g',
      cid: 'c2',
      fid: 'f2b',
      uid: 'g_c2_f2b',
    }}
  muonStore.apply({type: 'UPDANIMA', animas: [anima1, anima2a, anima2b]})
  expect(muonStore.animas().length).toEqual(3)

  // in class means group_class _e_
  expect(muonStore.animasInClass(anima2a).length).toEqual(2)
  expect(muonStore.animasInClassHowMany(anima2a)).toEqual(2)

  expect(muonStore.animasInGroup(anima2a).length).toEqual(3)
  expect(muonStore.animasInGroupHowMany(anima2a)).toEqual(3)

  expect(muonStore.findAnima('g_c2_f2b').eoric.uid).toEqual('g_c2_f2b')
  expect(muonStore.findAnima({gid: 'g', cid: 'c2', fid: 'f2b'}).eoric.uid).toEqual('g_c2_f2b')
  expect(muonStore.findAnima(anima2b).eoric.uid).toEqual('g_c2_f2b')
})
