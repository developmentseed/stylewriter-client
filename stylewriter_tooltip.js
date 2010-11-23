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

StyleWriterTooltips.getToolTip = function(feature, context, index) {
  var tooltip = $('div.openlayers-tooltip-' + index + ':not(.removed)', $(context));
  if (tooltip.size() === 0) {
    tooltip = $("<div class='openlayers-tooltip openlayers-tooltip-"+index+"'><div class='openlayers-tooltip-name'></div><div class='openlayers-tooltip-description'></div></div>");
    $(context).append(tooltip);
  }
  $('div.openlayers-tooltip-name', tooltip).html(feature.name || '');
  $('div.openlayers-tooltip-description', tooltip).html(feature.description || '');

  // Hide any active tooltips for layers beneath this one.
  for (var i = (index - 1); i > 0; i--) {
    var fallback = $('div.openlayers-tooltip-' + i + ':not(.removed)');
    if (fallback.size() > 0) {
      fallback.addClass('hidden').hide();
    }
  }

  return tooltip;
};

StyleWriterTooltips.select = function(feature, layer, evt) {
  var index = $.inArray(layer, layer.map.layers);
  var tooltip = StyleWriterTooltips.getToolTip(feature, layer.map.div, index);
  $(layer.map.div).css('cursor', 'pointer');
};

StyleWriterTooltips.unselect = function(feature, layer) {
  var index = $.inArray(layer, layer.map.layers);

  $(layer.map.div).css('cursor', 'default');
  $(layer.map.div).children('div.openlayers-tooltip-' + index)
    .addClass('removed')
    .fadeOut('fast', function() { $(this).remove(); });

  // Iterate through any active tooltips on layers beneath this one and show
  // the highest one found.
  for (var i = (index - 1); i > 0; i--) {
    var fallback = $('div.openlayers-tooltip-' + i + ':not(.removed)');
    if (fallback.size() > 0) {
      fallback.removeClass('hidden').show();
      break;
    }
  }
};
