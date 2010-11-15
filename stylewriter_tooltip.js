StyleWriterTooltips = {};

StyleWriterTooltips.click = function(feature) {
  var html = '';
  if (feature.name) {
    html += feature.name;
  }
  if (feature.description) {
    html += feature.description;
  }
  var link;
  if ($(html).is('a')) {
    link = $(html);
  }
  else if ($(html).children('a').size() > 0) {
    link = $(html).children('a')[0];
  }
  if (link) {
    var href = $(link).attr('href');
    window.location = href;
    return false;
  }
  return;
};

StyleWriterTooltips.getToolTip = function(feature) {
  var text = "<div class='openlayers-tooltip'>";
  if (feature.name) {
    text += "<div class='openlayers-tooltip-name'>" + feature.name + '</div>';
  }
  if (feature.description) {
    text += "<div class='openlayers-tooltip-description'>" +
        feature.description + '</div>';
  }
  text += '</div>';
  return $(text);
};

StyleWriterTooltips.select = function(feature, layer) {
  var tooltip = StyleWriterTooltips.getToolTip(feature);
  $(layer.map.div).css('cursor', 'pointer');
  $(tooltip).data('layername', layer.name);
  $(layer.map.div).append(tooltip);
};

StyleWriterTooltips.positionedSelect = function(feature, layer, evt) {
  var tooltip = StyleWriterTooltips.getToolTip(feature);
  // var point  = new OpenLayers.LonLat(feature.geometry.x, feature.geometry.y);
  // var offset = feature.layer.getViewPortPxFromLonLat(point);
  // $(tooltip).css({zIndex: '1000', position: 'absolute',
  //   left: evt.pageX, top: evt.pageY});
  $('body').append(tooltip);
};

StyleWriterTooltips.unselect = function(feature, layer) {
  $(layer.map.div).css('cursor', 'default');
  $(layer.map.div).children('div.openlayers-tooltip').filter(
      function() {
          return $(this).data('layername') == layer.name;
      }).fadeOut('fast', function() { $(this).remove(); });
};
