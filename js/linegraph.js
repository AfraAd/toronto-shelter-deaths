class LineGraph {

	// constructor method to initialize LineGraph object
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

		vis.margin = {top: 40, right: 120, bottom: 60, left: 60};
		
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
		vis.x = d3.scaleTime()
			.range([0, vis.width]);

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
			.attr("y", vis.height + 50)
			.style("text-anchor", "middle")
			.style("font-size", "13px")
			.style("font-weight", "500")
			.text("Year");

		vis.yAxisLabel = vis.svg.append("text")
			.attr("class", "y-axis-label")
			.attr("transform", "rotate(-90)")
			.attr("y", -45)
			.attr("x", -vis.height / 2)
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.style("font-size", "13px")
			.style("font-weight", "500")
			.text("Total Monthly Deaths");

		// Legend group
		vis.legendGroup = vis.svg.append("g")
			.attr("class", "legend")
			.attr("transform", `translate(${vis.width + 20}, 20)`);
		
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
					.attr("y", vis.height + 50);
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
		
		// Monthly deaths over time (all data points)
		vis.displayData = filteredData.map(d => ({
			date: new Date(d.variable, vis.monthNames.indexOf(d.group)),
			year: d.variable,
			month: d.group,
			Male: d.Male || 0,
			Female: d.Female || 0,
			Trans: d.Trans || 0,
			Total: d.value || 0
		})).sort((a, b) => a.date - b.date);
		
		vis.updateVis();
	}

	/*
	 * The drawing function
	*/
	updateVis(){
		let vis = this;

		// Update scales
		vis.x.domain(d3.extent(vis.displayData, d => d.date));
		
		// Y-axis: Find max across all genders
		const maxY = d3.max(vis.displayData, d => 
			Math.max(d.Male, d.Female, d.Trans, d.Total)
		);
		
		vis.y.domain([0, maxY * 1.1]).nice();

		// Update axes
		vis.xAxisGroup.call(d3.axisBottom(vis.x)
			.tickFormat(d3.timeFormat("%Y")))
			.selectAll("text")
			.style("font-size", "12px");
		
		vis.yAxisGroup.call(d3.axisLeft(vis.y))
			.style("font-size", "12px");

		// --- COVID-19 start indicator (Jan 2020) ---
		const covidDate = new Date(2020, 0); // January 2020
		const covidSelector = vis.svg.selectAll(".covid-line-group").data(
			(covidDate >= vis.x.domain()[0] && covidDate <= vis.x.domain()[1]) ? [covidDate] : []
		);

		// EXIT: Animate line retracting downward
		covidSelector.exit()
			.transition()
			.duration(800)
			.ease(d3.easeCubicInOut)
			.attr("opacity", 1)
			.select("line")
			.attr("y2", vis.height)
			.on("end", function() {
				d3.select(this.parentNode).remove();
			});

		// ENTER: Animate line drawing upward
		const covidEnter = covidSelector.enter()
			.append("g")
			.attr("class", "covid-line-group")
			.attr("opacity", 0);

		covidEnter.append("line")
			.attr("class", "covid-line")
			.attr("x1", d => vis.x(d))
			.attr("x2", d => vis.x(d))
			.attr("y1", vis.height)
			.attr("y2", vis.height)
			.attr("stroke", "red")
			.attr("stroke-width", 2)
			.attr("stroke-dasharray", "6 4");

		covidEnter.append("text")
			.attr("class", "covid-label")
			.attr("x", d => vis.x(d) + 6)
			.attr("y", 15)
			.attr("fill", "red")
			.attr("font-size", "13px")
			.attr("font-weight", "600")
			.text("COVID-19 Begins (Jan 2020)");

		// Animate appearance
		covidEnter.transition()
			.duration(800)
			.ease(d3.easeCubicInOut)
			.attr("opacity", 1)
			.on("start", function() {
				d3.select(this).select("line")
					.transition()
					.duration(800)
					.attr("y2", 0);
			});

		// UPDATE: Keep it aligned during resizes or transitions
		covidSelector.select("line")
			.transition()
			.duration(600)
			.attr("x1", d => vis.x(d))
			.attr("x2", d => vis.x(d))
			.attr("y1", 0)
			.attr("y2", vis.height);

		covidSelector.select("text")
			.transition()
			.duration(600)
			.attr("x", d => vis.x(d) + 6);

		// Define all gender lines based on global filters
		const allGenders = [
			{ key: 'Male', name: 'Male', color: '#4f88caff', enabled: vis.globalFilters.genderFilters.male },
			{ key: 'Female', name: 'Female', color: '#d472bfff', enabled: vis.globalFilters.genderFilters.female },
			{ key: 'Trans', name: 'Trans/NB/2S', color: '#7f23bdff', enabled: vis.globalFilters.genderFilters.trans }
		];
		
		// Always show Total line
		allGenders.push({ key: 'Total', name: 'Total', color: '#2d5d2f', enabled: true });
		
		const genders = allGenders.filter(g => g.enabled);

		// Line generator
		const line = d3.line()
			.x(d => vis.x(d.date))
			.y(d => vis.y(d.value))
			.curve(d3.curveMonotoneX);

		// Draw lines for each gender
		genders.forEach(gender => {
			const lineData = vis.displayData.map(d => ({
				date: d.date,
				value: d[gender.key],
				label: `${d.month} ${d.year}`
			}));

			// Update or create line path
			let path = vis.svg.selectAll(`.line-path-${gender.key}`)
				.data([lineData]);

			path.enter()
				.append("path")
				.attr("class", `line-path line-path-${gender.key}`)
				.merge(path)
				.transition()
				.duration(800)
				.attr("fill", "none")
				.attr("stroke", gender.color)
				.attr("stroke-width", 3)
				.attr("d", line);

			path.exit().remove();

			// Update or create dots
			let dots = vis.svg.selectAll(`.dot-${gender.key}`)
				.data(lineData);

			dots.enter()
				.append("circle")
				.attr("class", `dot dot-${gender.key}`)
				.attr("r", 0)
				.merge(dots)
				.on("mouseover", function(event, d) {
					d3.select(this)
						.transition()
						.duration(150)
						.attr("r", 6);
					
					vis.showTooltip(event, d, gender);
				})
				.on("mouseout", function() {
					d3.select(this)
						.transition()
						.duration(150)
						.attr("r", 3);
					
					d3.selectAll(".line-tooltip").remove();
				})
				.transition()
				.duration(800)
				.attr("cx", d => vis.x(d.date))
				.attr("cy", d => vis.y(d.value))
				.attr("r", 3)
				.attr("fill", gender.color)
				.attr("stroke", "white")
				.attr("stroke-width", 2)
				.style("cursor", "pointer");

			dots.exit().remove();
		});

		// Remove lines and dots for disabled genders
		['Male', 'Female', 'Trans'].forEach(key => {
			if (!genders.find(g => g.key === key)) {
				vis.svg.selectAll(`.line-path-${key}`).remove();
				vis.svg.selectAll(`.dot-${key}`).remove();
			}
		});

		// Update legend
		vis.updateLegend(genders);
	}

	updateLegend(genders) {
		let vis = this;

		vis.legendGroup.selectAll("*").remove();

		genders.forEach((gender, i) => {
			const legendItem = vis.legendGroup.append("g")
				.attr("transform", `translate(0, ${i * 25})`);

			legendItem.append("line")
				.attr("x1", 0)
				.attr("x2", 30)
				.attr("y1", 6)
				.attr("y2", 6)
				.attr("stroke", gender.color)
				.attr("stroke-width", 3);

			legendItem.append("circle")
				.attr("cx", 15)
				.attr("cy", 6)
				.attr("r", 4)
				.attr("fill", gender.color)
				.attr("stroke", "white")
				.attr("stroke-width", 2);

			legendItem.append("text")
				.attr("x", 38)
				.attr("y", 10)
				.text(gender.name)
				.style("font-size", "12px")
				.style("pointer-events", "none")
				.attr("alignment-baseline", "middle");
		});
	}

	showTooltip(event, d, gender) {
		d3.selectAll(".line-tooltip").remove();
		
		d3.select("body")
			.append("div")
			.attr("class", "line-tooltip")
			.style("position", "absolute")
			.style("background", "rgba(255, 255, 255, 0.95)")
			.style("border", `2px solid ${gender.color}`)
			.style("border-radius", "6px")
			.style("padding", "10px 12px")
			.style("font-size", "13px")
			.style("pointer-events", "none")
			.style("z-index", "10000")
			.style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)")
			.html(`
				<strong>${d.label}</strong><br>
				<span style="color:${gender.color}; font-weight:600;">${gender.name}:</span> ${d.value.toFixed(1)}
			`)
			.style("left", (event.pageX + 10) + "px")
			.style("top", (event.pageY - 40) + "px")
			.style("opacity", 0)
			.transition()
			.duration(200)
			.style("opacity", 1);
	}
}