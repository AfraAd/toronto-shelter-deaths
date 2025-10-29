class HeatMap {

	// constructor method to initialize HeatMap object
	constructor(parentElement, data, globalFilters) {
		this.parentElement = parentElement;
		this.data = data;
		this.globalFilters = globalFilters;
		this.displayData = [];
		this.isFirstLoad = true;
		
		// Categories for x and y axis
		this.cols = Array.from(new Set(data.map(d=> d.group)));
		this.rows = Array.from(new Set(data.map(d=> d.variable)));
	}

	/*
	 * Method that initializes the visualization (static content, e.g. SVG area or axes)
	*/
	initVis(){
		let vis = this;

		vis.margin = {top: 60, right: 40, bottom: 60, left: 60};

		// Get container width with fallback
		const container = document.getElementById(vis.parentElement);
		const containerWidth = container ? container.getBoundingClientRect().width : 1200;
		vis.width = containerWidth - vis.margin.left - vis.margin.right;
		vis.height = 600; // Fixed height for heatmap

		// SVG drawing area
		vis.svg = d3.select("#" + vis.parentElement).append("svg")
			.attr("width", vis.width + vis.margin.left + vis.margin.right)
			.attr("height", vis.height + vis.margin.top + vis.margin.bottom)
			.append("g")
			.attr("transform", "translate(" + vis.margin.left + "," + vis.margin.top + ")");


		// Scales and axes
		vis.x = d3.scaleBand()
			.range([0, vis.width])
			.domain(this.cols)
			.padding(0.01);

		vis.y = d3.scaleBand()
			.range([vis.height, 0])
			.domain(vis.rows)
			.padding(0.01);

		vis.xAxis = d3.axisTop()
			.scale(vis.x);

		vis.yAxis = d3.axisLeft()
			.scale(vis.y);

		vis.svg.append("g")
			.attr("class", "x-axis axis");

		vis.svg.append("g")
			.attr("class", "y-axis axis");


		// Set ordinal color scale
		vis.colorScale = d3.scaleLinear()
			.range(["#ffffff", "#7b1a28"]);
		
		// Add tooltip to heatmap
		vis.tooltip = d3.select("body")
							.append("div")
							.attr("class", "heatmap-tooltip")
							.style("opacity", 0)
							.style("position", "absolute")
							.style("pointer-events", "none")
							.style("z-index", "10000");
	
		vis.wrangleData();
	}

	/*
	* Data wrangling
	*/
	wrangleData() {
		let vis = this;
		
		// Filter by year range and apply gender filters
		vis.displayData = vis.data.filter(
			d => +d.variable >= vis.globalFilters.yearRange[0] && 
			     +d.variable <= vis.globalFilters.yearRange[1]
		).map(d => {
			// Calculate filtered value based on gender selections
			let filteredValue = 0;
			if (vis.globalFilters.genderFilters.male) filteredValue += d.Male || 0;
			if (vis.globalFilters.genderFilters.female) filteredValue += d.Female || 0;
			if (vis.globalFilters.genderFilters.trans) filteredValue += d.Trans || 0;
			
			return {
				...d,
				filteredValue: filteredValue
			};
		});
		
		vis.updateVis();
	}

	/*
	 * The drawing function - should use the D3 update sequence (enter, update, exit)
	*/
	updateVis(){
		let vis = this;

		const uniqueYears = [...new Set(vis.displayData.map(d => d.variable))];
		vis.y = d3.scaleBand()
			.domain(uniqueYears)
			.range([vis.height, 0])
			.padding(0.01);

		let maxValue = d3.max(vis.displayData, d => +d.filteredValue);
		vis.colorScale.domain([0, maxValue || 1]);

		let categories = vis.svg.selectAll(".value")
			.data(vis.displayData, d => d.group + "-" + d.variable);

		let entered = categories.enter().append("rect")
			.attr("class", "value")
			.attr("x", d => vis.x(d.group))
			.attr("y", d => vis.y(d.variable))
			.attr("width", vis.x.bandwidth())
			.attr("height", vis.y.bandwidth())
			.style("fill", d => vis.colorScale(+d.filteredValue))
			.style("cursor", "pointer")
			.style("opacity", 0);

		// Wave animation on first load
		if (vis.isFirstLoad) {
			entered.transition()
				.delay((d, i) => {
					// Calculate wave delay based on year and month
					const yearIndex = uniqueYears.indexOf(d.variable);
					const monthIndex = vis.cols.indexOf(d.group);
					return (yearIndex * 12 + monthIndex) * 15; // 15ms per cell
				})
				.duration(300)
				.style("opacity", 1);
			
			vis.isFirstLoad = false;
		} else {
			entered.style("opacity", 1);
		}

		categories
			.transition()
			.duration(600)
			.attr("x", d => vis.x(d.group))
			.attr("y", d => vis.y(d.variable))
			.attr("width", vis.x.bandwidth())
			.attr("height", vis.y.bandwidth())
			.style("fill", d => vis.colorScale(+d.filteredValue));

		categories.exit().remove();

		vis.svg.selectAll(".value")
			.on("mouseover", (event, d) => {
				vis.tooltip.transition().duration(150).style("opacity", 1);
				vis.tooltip
					.html(`
					<div style="
						background: rgba(255, 255, 255, 0.95);
						border: 1px solid #d31c34;
						border-radius: 6px;
						padding: 10px 12px;
						box-shadow: 0 2px 6px rgba(0,0,0,0.15);
						font-family: 'Roboto', sans-serif;
						color: #333;
						font-size: 13px;
						line-height: 1.4em;
						text-align: left;
						pointer-events: none;">
						<strong style="color:#d31c34;">${d.group} ${d.variable}</strong><br>
						<span style="font-weight:500;">Total deaths:</span> ${d.value}<br>
						<span style="font-weight:500;">Male:</span> ${d.Male || 0}<br>
						<span style="font-weight:500;">Female:</span> ${d.Female || 0}<br>
						<span style="font-weight:500;">Trans/NB/2S:</span> ${d.Trans || 0}
					</div>
					`)
					.style("left", (event.pageX + 15) + "px")
					.style("top", (event.pageY - 35) + "px");
			})
			.on("mouseleave", () => {
				vis.tooltip.transition().duration(300).style("opacity", 0);
			});

		vis.xAxis = d3.axisTop().scale(vis.x);
		vis.yAxis = d3.axisLeft().scale(vis.y);

		vis.svg.select(".x-axis")
			.attr("transform", `translate(0,${vis.y.range()[1]})`)
			.call(vis.xAxis);

		vis.svg.select(".y-axis").call(vis.yAxis);

		vis.updateLegend(maxValue);
	}

	updateLegend(maxValue) {
		let vis = this;

		// Clear existing legend
		d3.select("#colorLegend").selectAll("*").remove();

		// Legend dimensions
		const legendWidth = 450;
		const legendHeight = 18;

		// Create SVG inside the colorLegend div
		const legendSvg = d3.select("#colorLegend")
			.append("svg")
			.attr("width", legendWidth + 80)
			.attr("height", legendHeight + 40);

		// Define linear gradient
		const defs = legendSvg.append("defs");
		const gradient = defs.append("linearGradient")
			.attr("id", "legend-gradient")
			.attr("x1", "0%")
			.attr("x2", "100%");

		const numStops = 25;
		for (let i = 0; i <= numStops; i++) {
			const offset = (i / numStops) * 100;
			const value = (i / numStops) * maxValue;
			gradient.append("stop")
				.attr("offset", `${offset}%`)
				.attr("stop-color", vis.colorScale(value));
		}

		// Draw gradient rectangle
		legendSvg.append("rect")
			.attr("x", 60)
			.attr("y", 10)
			.attr("width", legendWidth)
			.attr("height", legendHeight)
			.style("fill", "url(#legend-gradient)")
			.style("stroke", "#999")
			.style("stroke-width", 0.6)
			.attr("rx", 4)
			.attr("ry", 4);

		// Axis for the legend
		const legendScale = d3.scaleLinear()
			.domain([0, maxValue])
			.range([60, 60 + legendWidth]);

		const legendAxis = d3.axisBottom(legendScale)
			.ticks(6)
			.tickFormat(d3.format(".0f"));

		legendSvg.append("g")
			.attr("transform", `translate(0, ${10 + legendHeight})`)
			.call(legendAxis)
			.style("font-size", "11px");

		// Legend label
		legendSvg.append("text")
			.attr("x", 60 + legendWidth / 2)
			.attr("y", 8)
			.attr("text-anchor", "middle")
			.style("font-size", "11px")
			.style("font-weight", "500")
			.text("Total Deaths per Month");
	}
}