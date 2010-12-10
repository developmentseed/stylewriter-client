var StyleWriterUtil = {
  // url-safe base64 encoding for mapfile urls in tile urls
  encode_base64: function(data) {
    var out = '', c1, c2, c3, e1, e2, e3, e4;
    var tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij' +
        'klmnopqrstuvwxyz0123456789+/=';
    for (var i = 0; i < data.length; ) {
       c1 = data.charCodeAt(i++);
       c2 = data.charCodeAt(i++);
       c3 = data.charCodeAt(i++);
       e1 = c1 >> 2;
       e2 = ((c1 & 3) << 4) + (c2 >> 4);
       e3 = ((c2 & 15) << 2) + (c3 >> 6);
       e4 = c3 & 63;
       if (isNaN(c2))
         e3 = e4 = 64;
       else if (isNaN(c3))
         e4 = 64;
       out += tab.charAt(e1) + tab.charAt(e2) + tab.charAt(e3) + tab.charAt(e4);
    }
    return out;
  },
  // decompress run-length encoding
  decompressRLE: function(data) {
    var elements = data.split('|');
    var x = [];
    for (var i = 0; i < elements.length; i++) {
      a = elements[i].split(':');
      l = parseInt(a[0], 10);
      if (a.length === 1) {
        for (j = 0; j < l; j++) { x.push(false); }
      }
      else {
        for (j = 0; j < l; j++) { x.push(a[1]); }
      }
    }
    var grid = [];
    for (var i = 0; i < 64; i++) {
      grid[i] = x.splice(0, 64);
    }
    return grid;
  },
  // Create a cross-browser event object
  makeEvent: function(evt) {
    return {
      'target': evt.target || evt.srcElement,
      'pX': evt.pageX || evt.clientX,
      'pY': evt.pageY || evt.clientY,
      'evt': evt
    };
  },
  // Generate a function-safe string from a URL string
  fString: function(src) {
    if (!src) return;
    var pts = src.split('/').slice(-4)
        .join('_').replace(/=/g, '_').split('.');
    pts.pop();
    return pts.pop();
  }
};

/**
 * Class: OpenLayers.Control.StyleWriterInteraction
 * Inherits from:
 *  - <OpenLayers.Control>
 */
OpenLayers.Control.StyleWriterInteraction =
    OpenLayers.Class(OpenLayers.Control, {
    feature: {},
    format: null,
    handlerOptions: null,
    handlers: null,
    hoverRequest: null,
    archive: {},
    tileRes: 4,

    initialize: function(options) {
      options = options || {};
      options.handlerOptions = options.handlerOptions || {};
      OpenLayers.Control.prototype.initialize.apply(this, [options || {}]);

      this.format = new OpenLayers.Format.GeoJSON();

      this.handlers = {
        hover: new OpenLayers.Handler.Hover(
          this, {
            'move': this.cancelHover,
            'pause': this.getInfoForHover
          },
          OpenLayers.Util.extend(this.handlerOptions.hover || {}, {
            'delay': ($.browser.msie) ? 40 : 10
          })
        ),
        click: new OpenLayers.Handler.Click(
          this, {
            'click': this.getInfoForClick
        })
      };

      this.callbacks = {
          'out': StyleWriterTooltips.unselect,
          'over': StyleWriterTooltips.select,
          'click': StyleWriterTooltips.click
      };
    },

    setMap: function(map) {
      this.handlers.hover.setMap(map);
      this.handlers.click.setMap(map);
      OpenLayers.Control.prototype.setMap.apply(this, arguments);
      this.activate();
      // Respond to new layers  for new layers so we can load keymap
      var that = this;
      map.events.on({addlayer: function(e) {
        if (e.layer.CLASS_NAME === 'OpenLayers.Layer.StyleWriter' && typeof e.layer.keymap === 'string') {
          that.loadKeymap(e.layer);
        }
      }});
    },

    activate: function() {
      if (!this.active) {
        this.handlers.hover.activate();
        this.handlers.click.activate();
      }
      return OpenLayers.Control.prototype.activate.apply(
        this, arguments
      );
    },

    deactivate: function() {
      return OpenLayers.Control.prototype.deactivate.apply(
        this, arguments
      );
    },

    getGridFeature: function(sevt, tile) {
      var grid = this.archive[StyleWriterUtil.fString(tile.url)];
      if (grid === true) { // is downloading
        return;
      }
      else {
        var offset = [
          Math.floor((sevt.pX - $(tile.imgDiv).offset().left) / this.tileRes),
          Math.floor((sevt.pY - $(tile.imgDiv).offset().top) / this.tileRes)];
        var key = grid[offset[1]] && grid[offset[1]][offset[0]];
        return tile.layer.options.keymap[key];
      }
    },

    getPointFeature: function(sevt, tile) {
      var grid = this.archive[StyleWriterUtil.fString(tile.url)];
      var lonLat = this.map.getLonLatFromPixel(sevt.evt.xy);
      lonLat.transform(
        new OpenLayers.Projection('EPSG:900913'),
        new OpenLayers.Projection('EPSG:4326'));
      var here = new OpenLayers.Geometry.Point(lonLat.lon, lonLat.lat);
      for (var i = 0; i < grid.length; i++) {
        if (grid[i].geometry.containsPoint(here)) {
          var a = grid[i].attributes;
          a.description = a[tile.layer.options.value_field];
          a.name = a[tile.layer.options.name_field];
          return a;
        }
      }
    },

    getTileStack: function(layers, sevt) {
      var found = false;
      var gridpos = {};
      var tiles = [];
      for (var x = 0; x < layers[0].grid.length && !found; x++) {
        for (var y = 0; y < layers[0].grid[x].length && !found; y++) {
          var divpos = $(layers[0].grid[x][y].imgDiv).offset();
          found = ((divpos.top < sevt.pY) &&
            ((divpos.top + 256) > sevt.pY) &&
             (divpos.left < sevt.pX) &&
            ((divpos.left + 256) > sevt.pX));
          if (found) {
            gridpos = {'x': x, 'y': y};
          }
        }
      }
      if (found) {
        for (var j = 0; j < layers.length; j++) {
          layers[j].grid[gridpos.x] && layers[j].grid[gridpos.x][gridpos.y] &&
            tiles.push(layers[j].grid[gridpos.x][gridpos.y]);
        }
      }
      return tiles;
    },

    tileDataUrl: function(tile) {
      return (tile.layer.options.symbolizer === 'point') ?
        tile.url.replace('png', 'json') :
        tile.url.replace('png',
        StyleWriterUtil.encode_base64(tile.layer.options.join_field) +
          '.grid.json'
      );
    },

    // Request and save a tile
    reqTile: function(tile) {
      return $.jsonp({
        'url': this.tileDataUrl(tile),
        context: this,
        success: this.readDone,
        error: function() {},
        callback: StyleWriterUtil.fString(tile.url),
        callbackParameter: 'callback'
      });
    },

    // Get all interactable layers
    viableLayers: function() {
      var overlays = this.map.getLayersBy('isBaseLayer', false);
      return $(overlays).filter(
        function(i) {
          return (overlays[i].visibility === true) &&
            (overlays[i].CLASS_NAME === 'OpenLayers.Layer.StyleWriter');
        }
      );
    },

    getInfoForClick: function(evt) {
      var layers = this.viableLayers();
      var sevt = StyleWriterUtil.makeEvent(evt);
      var tiles = this.getTileStack(this.viableLayers(), sevt);
      var feature = null;
      this.target = sevt.target;
      for (var t = 0; t < tiles.length; t++) {
        var code_string = StyleWriterUtil.fString(tiles[t].url);
        if (this.archive[code_string]) {
          if (tiles[t].layer.options.symbolizer == 'polygon') {
            feature = this.getGridFeature(sevt, tiles[t]);
          }
          else {
            feature = this.getPointFeature(sevt, tiles[t]);
          }
          feature && this.callbacks['click'](feature, tiles[t].layer);
        }
      }
    },

    getInfoForHover: function(evt) {
      var layers = this.viableLayers();
      var sevt = StyleWriterUtil.makeEvent(evt);
      var tiles = this.getTileStack(this.viableLayers(), sevt);
      var feature = null;
      this.target = sevt.target;

      for (var t = 0; t < tiles.length; t++) {
        var code_string = StyleWriterUtil.fString(tiles[t].url);
        if (this.archive[code_string]) {
          if (tiles[t].layer.options.symbolizer == 'polygon') {
            feature = this.getGridFeature(sevt, tiles[t]);
          }
          else {
            feature = this.getPointFeature(sevt, tiles[t]);
          }
          if (feature) {
            if (feature !== this.feature[t]) {
              this.feature[t] = feature;
              this.callbacks['out'](feature, tiles[t].layer, sevt);
              if (feature) {
                this.callbacks['over'](feature, tiles[t].layer, sevt);
              }
            }
          }
          else {
            this.callbacks['out'](feature, tiles[t].layer, sevt);
            this.feature[t] = null;
          }
        }
        else {
          // TODO: figure out better way to do hover-sim
          this.callbacks['out']({}, tiles[t].layer);
          this.feature[t] = null;
          if (!this.archive[code_string]) {
            try {
              this.archive[code_string] = true;
              this.target.hoverRequest = this.reqTile(tiles[t]);
            } catch (err) {
              this.archive[code_string] = false;
            }
          }
        }
      }
    },

    readDone: function(data) {
      if (typeof data.features === 'string') { // Grid
        this.archive[data.code_string] =
          StyleWriterUtil.decompressRLE(data.features);
      }
      else { // GeoJSON
        this.archive[data.code_string] = this.format.read(data.features);
      }
    },

    loadKeymap: function(layer) {
      $.jsonp({
        'url': layer.keymap,
        context: this,
        success: function(data) {
          if (typeof data !== 'undefined') {
            layer.keymap = layer.options.keymap = data;
          }
        },
        error: function() {},
        callback: 'keymapCallback'
      });
    },

    CLASS_NAME: 'OpenLayers.Control.StyleWriterInteraction'
});
