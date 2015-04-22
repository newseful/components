window.NF = window.NF || {};

window.NF.BRAND = window.NF.BRAND || {}

window.NF.BRAND.primaryColor = '#40C693';
window.NF.BRAND.interfaceColors = {
	blue : '#83AFBA',
	red : '#DB8D61',
	yellow : '#B09E52'
};
window.NF.BRAND.interfaceColorsDark = {
	blue : '#63848C',
	red : '#8F5C40',
	yellow : '#87793F'
};
window.NF.BRAND.interfaceColorsLight = {
	blue : '#D3E6ED',
	red : '#F2D8C7',
	yellow : '#F2E7B8'
};

window.NF.BRAND.grayScale = ['#1A2326','#404E54','#53646B','#799099','#9EBBC6','#D3E6ED'];

window.NF.BRAND.dataScale = ['#9385B1','#91E789'];

var NFTimelineView = function(options) {
	this.data = {
		events : [],
		reactions : [],
		rangeMin : Infinity,
		rangeMax : 0
	};

	this.container = options.container || null;
	this.labelFrequency = options.labelFrequency || 1;

	this.timeStampFormat = d3.time.format('%a %b %d %Y %I:%M%p');
	this.shortDateFormat = d3.time.format('%b %d');
	this.abbreviatedTimeStampFormat = d3.time.format('%I:%M%p %b %d');

	if (options.dataURL) {
		this.initWithSheetsUrl(options.dataURL)
	}

	if (options.data) {
		this.initWithFormattedData(options.data);
	}

};

//---------------------------------------------------------------------------------
// Helper Functions
//---------------------------------------------------------------------------------

NFTimelineView.prototype.helpers = {};

NFTimelineView.prototype.helpers.sortReverseChronological = function(a,b) {
	if (typeof a.time.getMonth !== 'function') {
		a.time = new Date(a.time);
	}

	if (typeof b.time.getMonth !== 'function') {
		b.time = new Date(b.time);
	}

	if (a.time.getTime() < b.time.getTime())
		return 1;

	if (a.time.getTime() > b.time.getTime())
		return -1;

	return 0;
};

NFTimelineView.prototype.helpers.elementOffset = function(el, offsetParent) {
	return el.getBoundingClientRect().top - offsetParent.getBoundingClientRect().top;
};

NFTimelineView.prototype.helpers.lastMidnightForTime = function(t) {
	var date = new Date(t);
	var lastMidnight = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			0,0,0
		)

	return lastMidnight.getTime();
};

//---------------------------------------------------------------------------------
// Data Management
//---------------------------------------------------------------------------------

// Really should only be called by sortData
NFTimelineView.prototype.orderData = function() {
	this.data.events.sort(this.sortFunction);
	this.data.reactions.sort(this.sortFunction);

	this.data.rangeMin = new Date(this.data.rangeMin);
	this.data.rangeMax = new  Date(this.data.rangeMax);
	this.data.daysInRange = [];

	var midnight = this.helpers.lastMidnightForTime( this.data.rangeMax.getTime() - 1 );
	while (midnight > this.data.rangeMin) {
		this.data.daysInRange.push(new Date(midnight));
		midnight --;
		midnight = this.helpers.lastMidnightForTime( midnight );
	}
};

NFTimelineView.prototype.sortData = function(data) {
	for (var i = 0; i < data.length; ++i) {
		data[i].time = new Date(data[i].time);
		data[i].is_event = data[i].is_event.match(/true/i);

		//Find min range + max range
		if (data[i].time.getTime() < this.data.rangeMin)
			this.data.rangeMin = data[i].time.getTime();

		if (data[i].time.getTime() > this.data.rangeMax)
			this.data.rangeMax = data[i].time.getTime();

		// Ship to this.data
		data[i].is_event ? this.data.events.push(data[i]) : this.data.reactions.push(data[i]);
	}

	this.orderData();
};

//---------------------------------------------------------------------------------
// Layout Helpers
//---------------------------------------------------------------------------------

NFTimelineView.prototype.offsetForTime = function(t) {
	for (var i = 0; i < this.data.events.length; ++i) {
		var e = this.data.events[i];

		if (t < e.time.getTime())
			continue;

		var mostRecent = this.data.events[i-1];
		var leastRecent = e;

		var unitTimeDif = (mostRecent.time.getTime() - t)/(mostRecent.time.getTime() - leastRecent.time.getTime());
		var totalOffsetDif = (leastRecent.offset - mostRecent.offset) * unitTimeDif;

		return totalOffsetDif + mostRecent.offset;
	}
}

NFTimelineView.prototype.calculateRelativePositions = function() {
	for (var i = 0; i < this.data.reactions.length; ++i) {
		var c = this.data.reactions[i];
		c.offset = this.offsetForTime(c.time.getTime());
	}

	for (var i = 0; i < this.data.daysInRange.length; ++i) {
		var d = this.data.daysInRange[i];
		d.offset = this.offsetForTime(d.getTime());
	}
}

//---------------------------------------------------------------------------------
// Drawing
//---------------------------------------------------------------------------------

NFTimelineView.prototype.renderEventBlocks = function() {
	var _ = this;

	var eventContainer = d3.select(this.container).append('div')
		.classed('newseful-timeline__event-container', true);

	eventContainer.append('div')
		.classed({'newseful-timeline__label' : true,'newseful-timeline__label--right' : true})
		.text('Events');

	this.eventBlock = eventContainer.selectAll('.newseful-timeline__event-block')
		.data(this.data.events)
		.enter()
			.append('div')
			.classed('newseful-timeline__event-block', true)

	this.eventBlock.append('p')
		.classed({'newseful-timeline__timestamp':true, 'newseful-timeline__timestamp--event':true})
		.text(function(d) { return _.timeStampFormat( d.time ) });

	this.eventBlock.append('p')
		.classed('newseful-timeline__event-text-content', true)
		.text(function(d) { return d.text });

	// Add the vertical offset of each element back into its dataset to position things with later
	this.eventBlock.each(function(d) {
		var offset = _.helpers.elementOffset(this, eventContainer[0][0]);
		d3.select(this).datum().offset = offset;
	})
}

NFTimelineView.prototype.renderReactionBlocks = function() {
	var _ = this;

	var reactionContainer = d3.select(this.container).append('div')
		.classed('newseful-timeline__reaction-container', true)

	reactionContainer.append('div')
		.classed({'newseful-timeline__label' : true, 'newseful-timeline__label--left': true})
		.text('Reactions');

	this.reactionBlock = reactionContainer.selectAll('.newseful-timeline__reaction-block')
		.data(this.data.reactions)
		.enter()
			.append('div')
			.classed('newseful-timeline__reaction-block',true)
			.style('top', function(d) { return d.offset + 'px' });

	this.reactionBlock.append('p')
		.classed('newseful-timeline__reaction-title', true)
		.text(function(d) { return d.source });

	var reactionContent = this.reactionBlock.append('div')
		.classed('newseful-timeline__reaction-text-content', true)
	
	reactionContent.append('p')
		.text(function(d) { return d.text });

	reactionContent.append('p')
		.classed({ 'newseful-timeline__timestamp': true, 'newseful-timeline__timestamp--reaction' : true})
		.text(function(d) { return _.abbreviatedTimeStampFormat( d.time ) });
}

NFTimelineView.prototype.addTicksForTimeline = function(timeline) {
	var _ = this;
	var timelineTicksData = d3.range(this.data.daysInRange.length + 1);
	timelineTicksData = timelineTicksData.map(function(d) {
		return {
			index : d,
			data : d3.range(_.numTicksPerSegment)
		}
	});

	var timelineTicksGroup = timeline.selectAll('.newseful-timeline__ticks-group')
		.data(timelineTicksData)
		.enter()
			.append('g')
			.classed('newseful-timeline__ticks-group', true)
			.each(function(data, index) {

				d3.select(this).selectAll('.newseful-timeline__tick')
					.data(data.data)
					.enter()
						.append('line')
						.classed('newseful-timeline__tick', true)
						.attr('x1', '35%')
						.attr('x2', '65%')
						.attr('y1', function(d, i) {
							var pad = 20;

							var startPos = (function() {
								if (index == 0)
									return -45;

								return _.offsetForTime(new Date(_.data.daysInRange[index - 1]).getTime());
							})();

							var endPos = (function() {
								if (index == timelineTicksData.length - 1)
									return _.data.events[_.data.events.length - 1].offset;

								return _.offsetForTime(new Date( _.data.daysInRange[index].getTime() ));
							})();

							var length = (endPos - startPos) - (pad * 2);

							var position = startPos + pad + ((length / (_.numTicksPerSegment - 1)) * i);

							return position;
						})
						.attr('y2', function(d) { return this.getAttribute('y1') });
			})
}

NFTimelineView.prototype.renderTimeline = function() {
	var _ = this;
	var eventContainer = d3.select('.newseful-timeline__event-container');
	var timelineContainer = d3.select(this.container).append('svg','.newseful-timeline__event-container')
		.classed('newseful-timeline__timeline-container', true)
		.attr('width', '10%')
		.style('margin-top', '24px')

	var dateTimeline = timelineContainer.append('g')
		.classed('newseful-timeline__date-timeline', true)

	if (this.ticks)
		this.addTicksForTimeline(dateTimeline);

	dateTimeline.append('line')
		.classed('newseful-timeline__date-line', true)
		.attr('x1', '50%')
		.attr('x2', '50%')
		.attr('y1', -45)
		.attr('y2', this.data.events[this.data.events.length - 1].offset );

	dateTimeline.append('circle')
		.classed('newseful-timeline__range-circle', true)
		.attr('cx', '50%')
		.attr('cy', -45)
		.attr('r', 10);

	dateTimeline.append('circle')
		.classed('newseful-timeline__range-circle', true)
		.attr('cx', '50%')
		.attr('cy', this.data.events[this.data.events.length - 1].offset)
		.attr('r', 10)

	dateTimeline.append('circle')
		.classed('newseful-timeline__activity-circle', true)
		.attr('cx', '50%')
		.attr('cy', -45)
		.attr('r', 5);
	
	dateTimeline.selectAll('.newseful-timeline__date-marker-bg')
		.data(function() {
			return _.data.daysInRange.reduce(function(a, d, i) {
				if (i % _.labelFrequency == 0) {
					a.push(d);
				}

				return a;
			}, []);
		})
		.enter()
			.append('rect')
			.classed('newseful-timeline__date-marker-bg', true)
			.attr('x', '10%')
			.attr('y', function(d) { return d.offset })
			.attr('rx', 4)
			.attr('ry', 4)
			.attr('width', '80%')
			.attr('height', '24')

	dateTimeline.selectAll('.newseful-timeline__date-marker')
		.data(function() {
			return _.data.daysInRange.reduce(function(a, d, i) {
				if (i % _.labelFrequency == 0) {
					a.push(d);
				}

				return a;
			}, []);
		})
		.enter()
			.append('text')
			.classed('newseful-timeline__date-marker', true)
			.attr('x', '50%')
			.attr('y', function(d){ return d.offset })
			.attr('text-anchor', 'middle')
			.attr('alignment-baseline', 'middle')
			.text(function(d) { return _.shortDateFormat(d) });

	var eventsTimeline = timelineContainer.append('g')
		.classed('newseful-timeline__event-timeline', true)

	// Only draw the actual line if there's more than one event
	if (this.data.events.length > 1) {
		eventsTimeline.append('line')
			.classed('newseful-timeline__event-line', true)
			.attr('x1', '100%')
			.attr('x2', '100%')
			.attr('y1', this.data.events[0].offset)
			.attr('y2', this.data.events[this.data.events.length - 1].offset);
	}

	eventsTimeline.selectAll('.newseful-timeline__event-node')
		.data(this.data.events)
		.enter()
			.append('circle')
			.classed('newseful-timeline__event-node', true)
			.attr('cx', '100%')
			.attr('cy', function(d) { return d.offset })
			.attr('r', 5);

	var reactionTimeline = timelineContainer.append('g')
		.classed('newseful-timeline__reaction-timeline', true);

	if (this.data.reactions.length > 1) {
		reactionTimeline.append('line')
			.classed('newseful-timeline__reaction-line', true)
			.attr('x1', '0')
			.attr('x2', '0')
			.attr('y1', this.data.reactions[0].offset)
			.attr('y2', this.data.reactions[this.data.reactions.length - 1].offset);
	}

	reactionTimeline.selectAll('.newseful-timeline__reaction-node')
		.data(this.data.reactions)
		.enter()
			.append('circle')
			.classed('newseful-timeline__reaction-node', true)
			.attr('cx', 0)
			.attr('cy', function(d) { return d.offset })
			.attr('r', 5);
}

//---------------------------------------------------------------------------------
// Initializers
//---------------------------------------------------------------------------------

NFTimelineView.prototype.dataDidLoad = function(data) {
	this.sortData(data);
	this.renderEventBlocks();
	this.calculateRelativePositions();
	this.renderTimeline();
	this.renderReactionBlocks();
}

NFTimelineView.prototype.initWithSheetsUrl = function(dataURL) {
	var tTopOpts = {
		key : dataURL,
		callback : this.dataDidLoad,
		callbackContext : this,
		simpleSheet : true
	};

	Tabletop.init(tTopOpts);
	this.sortFunction = this.helpers.sortReverseChronological;
}

NFTimelineView.prototype.initWithFormattedData = function(data) {
	this.data.events = data.events;
	this.data.reactions = data.reactions;

	this.sortFunction = this.helpers.sortReverseChronological;
	this.orderData();
	this.renderEventBlocks();
	this.calculateRelativePositions();
	this.renderTimeline();
	this.renderReactionBlocks();
}