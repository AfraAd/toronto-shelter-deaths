class BarGraph {

	// constructor method to initialize BarGraph object
	constructor(parentElement, data, globalFilters) {
		this.parentElement = parentElement;
		this.data = data;
		this.globalFilters = globalFilters;
		this.displayData = [];
		
		// Month names in order
		this.monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
						   'July', 'August', 'September', 'October', 'November', 'December'];
		
		// Add window resize listener
		window.addEventListener('resize', () => this.handleResize());
	}

	/*
	 * Method that initializes the visualization
	*/
	initVis(){
		let vis = this;

		vis.margin = {top: 40, right: 120, bottom: 80, left: 60};
		
		// Get container width with fallback
		const container = document.getElementById(vis.parentElement);
		let containerWidth = 1200;
		if (container) {
			const rect = container.getBoundingClientRect();
			if (rect.width > 0) {
				containerWidth = rect.width;
			} else {
				// If container width is 0 (hidden), try parent or use window width
				const parent = container.closest('.tab-content');
				if (parent) {
					const parentRect = parent.getBoundingClientRect();
					if (parentRect.width > 0) {
						containerWidth = parentRect.width;
					} else {
						// Use a percentage of window width as fallback
						containerWidth = Math.min(1200, window.innerWidth * 0.85);
					}
				} else {
					containerWidth = Math.min(1200, window.innerWidth * 0.85);
				}
			}
		}
		vis.width = containerWidth - vis.margin.left - vis.margin.right;
		vis.height = Math.max(400, Math.min(600, vis.width * 0.4));

		// SVG drawing area with responsive viewBox
		vis.svg = d3.select("#" + vis.parentElement).append("svg")
			.attr("width", "100%")
			.attr("viewBox", `0 0 ${vis.width + vis.margin.left + vis.margin.right} ${vis.height + vis.margin.top + vis.margin.bottom}`)
			.attr("preserveAspectRatio", "xMidYMid meet")
			.style("max-width", "100%")
			.style("height", "auto")
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");

		// Scales
		vis.x = d3.scaleBand()
			.range([0, vis.width])
			.padding(0.2);

		vis.y = d3.scaleLinear()
			.range([vis.height, 0]);

		// Axes groups
		vis.xAxisGroup = vis.svg.append("g")
			.attr("class", "x-axis axis")
			.attr("transform", `translate(0,${vis.height})`);

		vis.yAxisGroup = vis.svg.append("g")
			.attr("class", "y-axis axis");

		// Axis labels
		vis.svg.append("text")
			.attr("class", "x-axis-label")
			.attr("x", vis.width / 2)
			.attr("y", vis.height + 65)
			.style("text-anchor", "middle")
			.style("font-size", "13px")
			.style("font-weight", "500")
			.text("Month");

		vis.yAxisLabel = vis.svg.append("text")
			.attr("class", "y-axis-label")
			.attr("transform", "rotate(-90)")
			.attr("y", -45)
			.attr("x", -vis.height / 2)
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.style("font-size", "13px")
			.style("font-weight", "500")
			.text("Average Monthly Deaths");

		// Legend group
		vis.legendGroup = vis.svg.append("g")
			.attr("class", "legend")
			.attr("transform", `translate(${vis.width + 20}, 20)`);

		// Tooltip
		vis.tooltip = d3.select("body")
			.append("div")
			.attr("class", "bar-tooltip")
			.style("opacity", 0)
			.style("position", "absolute")
			.style("background", "rgba(255, 255, 255, 0.95)")
			.style("border", "2px solid #134fbdff")
			.style("border-radius", "6px")
			.style("padding", "10px 12px")
			.style("font-size", "13px")
			.style("pointer-events", "none")
			.style("z-index", "10000")
			.style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)");
		
		vis.wrangleData();
	}

	handleResize() {
		let vis = this;
		
		// Debounce resize events
		clearTimeout(vis.resizeTimer);
		vis.resizeTimer = setTimeout(() => {
			const container = document.getElementById(vis.parentElement);
			if (!container) return;
			
			let containerWidth = 1200;
			if (container) {
				const rect = container.getBoundingClientRect();
				if (rect.width > 0) {
					containerWidth = rect.width;
				} else {
					// If container width is 0 (hidden), try parent or use window width
					const parent = container.closest('.tab-content');
					if (parent) {
						const parentRect = parent.getBoundingClientRect();
						if (parentRect.width > 0) {
							containerWidth = parentRect.width;
						} else {
							// Use a percentage of window width as fallback
							containerWidth = Math.min(1200, window.innerWidth * 0.85);
						}
					} else {
						containerWidth = Math.min(1200, window.innerWidth * 0.85);
					}
				}
			}
			const newWidth = containerWidth - vis.margin.left - vis.margin.right;
			const newHeight = Math.max(400, Math.min(600, newWidth * 0.4));
			
			// Only update if size actually changed significantly
			if (Math.abs(newWidth - vis.width) > 50) {
				vis.width = newWidth;
				vis.height = newHeight;
				
				// Update viewBox
				d3.select("#" + vis.parentElement).select("svg")
					.attr("viewBox", `0 0 ${vis.width + vis.margin.left + vis.margin.right} ${vis.height + vis.margin.top + vis.margin.bottom}`);
				
				// Update scales
				vis.x.range([0, vis.width]);
				vis.y.range([vis.height, 0]);
				
				// Update axis positions
				vis.xAxisGroup.attr("transform", `translate(0,${vis.height})`);
				vis.svg.select(".x-axis-label")
					.attr("x", vis.width / 2)
					.attr("y", vis.height + 65);
				vis.svg.select(".y-axis-label")
					.attr("x", -vis.height / 2);
				vis.legendGroup.attr("transform", `translate(${vis.width + 20}, 20)`);
				
				// Redraw visualization
				vis.updateVis();
			}
		}, 250);
	}

	/*
	* Data wrangling
	*/
	wrangleData() {
		let vis = this;
		
		// Apply year range filter
		let filteredData = vis.data.filter(d => 
			d.variable >= vis.globalFilters.yearRange[0] && 
			d.variable <= vis.globalFilters.yearRange[1]
		);
		
		// Calculate average deaths per month across selected years
		const monthGroups = d3.group(filteredData, d => d.group);
		
		vis.displayData = vis.monthNames.map(month => {
			const monthData = monthGroups.get(month) || [];
			
			return {
				month: month,
				monthIndex: vis.monthNames.indexOf(month),
				Male: d3.mean(monthData, d => d.Male || 0) || 0,
				Female: d3.mean(monthData, d => d.Female || 0) || 0,
				Trans: d3.mean(monthData, d => d.Trans || 0) || 0,
				Total: d3.mean(monthData, d => d.value || 0) || 0
			};
		});
		
		vis.updateVis();
	}

	/*
	 * The drawing function
	*/
	updateVis(){
		let vis = this;

		// Update scales
		vis.x.domain(vis.monthNames);
		
		// Y-axis: Based on total average
		const maxY = d3.max(vis.displayData, d => d.Total);
		vis.y.domain([0, maxY * 1.15]).nice();

		// Update axes
		vis.xAxisGroup.call(d3.axisBottom(vis.x))
			.selectAll("text")
			.style("font-size", "11px")
			.attr("transform", "rotate(-45)")
			.style("text-anchor", "end");
		
		vis.yAxisGroup.call(d3.axisLeft(vis.y))
			.style("font-size", "12px");

		// Define gender categories to stack
		const allGenders = [
			{ key: 'Male', name: 'Male', color: '#4f88caff', enabled: vis.globalFilters.genderFilters.male },
			{ key: 'Female', name: 'Female', color: '#d472bfff', enabled: vis.globalFilters.genderFilters.female },
			{ key: 'Trans', name: 'Trans/NB/2S', color: '#7f23bdff', enabled: vis.globalFilters.genderFilters.trans }
		];
		
		const enabledGenders = allGenders.filter(g => g.enabled);

		// Create stack layout
		const stack = d3.stack()
			.keys(enabledGenders.map(g => g.key))
			.order(d3.stackOrderNone)
			.offset(d3.stackOffsetNone);

		const stackedData = stack(vis.displayData);

		// Bind data to groups (one per gender category)
		const layers = vis.svg.selectAll(".bar-layer")
			.data(stackedData);

		// Enter new layers
		const layersEnter = layers.enter()
			.append("g")
			.attr("class", "bar-layer");

		// Merge enter + update
		const layersMerge = layersEnter.merge(layers);

		layersMerge.attr("fill", d => {
			const gender = enabledGenders.find(g => g.key === d.key);
			return gender ? gender.color : "#999";
		});

		// Remove old layers
		layers.exit().remove();

		// Bind rectangles within each layer
		const bars = layersMerge.selectAll("rect")
			.data(d => d);

		// Enter new bars
		const barsEnter = bars.enter()
			.append("rect")
			.attr("x", d => vis.x(d.data.month))
			.attr("y", vis.height)
			.attr("height", 0)
			.attr("width", vis.x.bandwidth());

		// Merge and transition
		barsEnter.merge(bars)
			.on("mouseover", function(event, d) {
				const gender = enabledGenders.find(g => g.key === this.parentNode.__data__.key);
				vis.showTooltip(event, d, gender);
			})
			.on("mouseout", function() {
				vis.tooltip.transition().duration(200).style("opacity", 0);
			})
			.transition()
			.duration(800)
			.attr("x", d => vis.x(d.data.month))
			.attr("y", d => vis.y(d[1]))
			.attr("height", d => vis.y(d[0]) - vis.y(d[1]))
			.attr("width", vis.x.bandwidth())
			.style("cursor", "pointer");

		// Remove old bars
		bars.exit().remove();

		// Update legend
		vis.updateLegend(enabledGenders);
	}

	updateLegend(genders) {
		let vis = this;

		vis.legendGroup.selectAll("*").remove();

		genders.forEach((gender, i) => {
			const legendItem = vis.legendGroup.append("g")
				.attr("transform", `translate(0, ${i * 25})`);

			legendItem.append("rect")
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", 20)
				.attr("height", 12)
				.attr("fill", gender.color);

			legendItem.append("text")
				.attr("x", 28)
				.attr("y", 10)
				.text(gender.name)
				.style("font-size", "12px")
				.style("pointer-events", "none")
				.attr("alignment-baseline", "middle");
		});
	}

	showTooltip(event, d, gender) {
		let vis = this;
		
		const value = d[1] - d[0];
		
		vis.tooltip.transition().duration(200).style("opacity", 1);
		vis.tooltip
			.html(`
				<strong>${d.data.month}</strong><br>
				<span style="color:${gender.color}; font-weight:600;">${gender.name}:</span> ${value.toFixed(1)}<br>
				<span style="font-weight:500;">Total Average:</span> ${d.data.Total.toFixed(1)}
			`)
			.style("left", (event.pageX + 10) + "px")
			.style("top", (event.pageY - 40) + "px");
	}
}