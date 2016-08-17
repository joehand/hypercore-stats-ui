var speedometer = require('speedometer')
var prettyBytes = require('pretty-bytes')
var pixels = require('pixel-grid')

var $ = document.querySelector.bind(document)

module.exports = Stats

var rows = Math.floor(window.innerHeight * 0.97 / 16) - 2
var columns = Math.floor(window.innerWidth * 0.97 / 16) - 1

function Stats (el, interval) {
  if (!(this instanceof Stats)) return new Stats(el, interval)
  var self = this
  self.feeds = {}
  self.el = el

  setInterval(function () {
    var keys = Object.keys(self.feeds)
    for (var i = 0; i < keys.length; i++) {
      var st = self.feeds[keys[i]]
      var down = st.downloadSpeed()
      if (down > st.peakDown) st.peakDown = down
      self.$$(keys[i], '.peak-speed').innerText = prettyBytes(st.peakDown) + '/s'
      self.$$(keys[i], '.upload-speed').innerText = prettyBytes(st.uploadSpeed()) + '/s'
      self.$$(keys[i], '.download-speed').innerText = prettyBytes(st.downloadSpeed()) + '/s'
    }
  }, interval || 500)
}

Stats.prototype.$$ = function (name, sel) {
  return this.el.querySelector('#' + (name || 'unknown') + ' ' + sel)
}

Stats.prototype._get = function (name) {
  var self = this
  if (!name) name = 'unknown'
  var st = self.feeds[name]
  if (!st) {
    var div = document.createElement('div')
    div.id = name
    div.innerHTML = self.el.querySelector('#template').innerHTML
    div.className = 'feed'

    if (name !== 'unknown') {
      div.querySelector('.name').innerText = name
    }

    self.el.appendChild(div)
    st = self.feeds[name] = {
      blocks: 0,
      peakDown: 0,
      uploadSpeed: speedometer(),
      downloadSpeed: speedometer(),
      div: div,
      gridData: []
    }
  }

  return st
}

Stats.prototype._update = function () {
  var self = this
  var keys = Object.keys(self.feeds)
  for (var i = 0; i < keys.length; i++) {
    var st = self.feeds[keys[i]]
    self.$$(keys[i], '.upload-speed').innerText = prettyBytes(st.uploadSpeed()) + '/s'
    self.$$(keys[i], '.download-speed').innerText = prettyBytes(st.downloadSpeed()) + '/s'
  }
}

Stats.prototype.onkey = function (data) {
  var self = this
  $('#key').innerText = data.key

  while ($('.feed')) self.el.removeChild($('.feed'))
  self.feeds = {}
}

Stats.prototype.updateHeader = function (data) {
  this.$$(data.name, '.overview').innerText = data.blocks.length + ' blocks (' + prettyBytes(data.bytes) + ')'
}

Stats.prototype.onpeerupdate = function (data) {
  $('#peers').innerText = 'Connected to ' + data.peers + ' peer' + (data.peers === 1 ? '' : 's')
}

Stats.prototype.ondownload = function (data) {
  var st = this._get(data.name)
  var speed = st.downloadSpeed(data.bytes)

  if (st.grid && data.index <= st.gridData.length) {
    st.gridData[data.index] = [.207,.705,.310]
  }
}

Stats.prototype.onupload = function (data) {
  var self = this
  this._get(data.name).uploadSpeed(data.bytes)
  this.$$(data.name, '.block-' + data.index).style.backgroundColor = '#35b44f'
  setTimeout(function () {
    self.$$(data.name, '.block-' + data.index).style.backgroundColor = 'gray'
  }, 500)
}

Stats.prototype.onfeed = function (data) {
  var self = this
  var st = this._get(data.name)
  var blocks = st.blocks = data.blocks.length
  self.updateHeader(data)

  if (data.name === 'metadata') return

  for (var i = 0; i < blocks; i++) {
    self._appendDot(data.name, data.blocks[i])
  }

  console.log('data', st.gridData.length)

  var size = 7
  var pad = 0
  var cols = Math.floor(window.innerWidth * 0.97 / (size + pad))
  var rows = Math.floor(blocks/cols) + 1

  console.log('size stuff', rows, cols, blocks)

  st.grid = pixels(st.gridData, {
    root: self.$$(data.name, '.blocks'),
    size: size,
    padding: pad,
    columns: cols,
    rows: rows,
    background: [.16,.21,.28],
    formatted: true
  })

  st.grid.canvas.style.marginLeft = (window.innerWidth * 0.03) / 2 + 'px'

  st.grid.frame(function () {
    st.grid.update(st.gridData)
  })
}

Stats.prototype.onupdate = function (data) {
  var self = this
  self.updateHeader(data)

  for (var i = self._get(data.name).blocks; i < data.blocks.length; i++) {
    self._get(data.name).blocks++
    self._appendDot(data.name, data.blocks[i])
  }
}

Stats.prototype._appendDot = function (name, downloaded) {
  if (downloaded) this._get(name).gridData.push([.207,.705,.310])
  else this._get(name).gridData.push([.91,.92,.93])
}
