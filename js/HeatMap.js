class HeatMap {

	// constructor method to initialize HeatMap object
	constructor(parentElement, data) {
		this.parentElement = parentElement;

		// Categories for x and y axis
		this.cols = Array.from(new Set(data.map(d=> d.group)));
		this.rows = Array.from(new Set(data.map(d=> d.variable)));
		this.data = data
		this.yearCutoff = 2025;
		this.displayData = [];
		this.yearStart = 2007;
		this.yearEnd = 2025;
		this.isFirstLoad = true;
	}

	/*
	 * Method that initializes the visualization (static content, e.g. SVG area or axes)
	*/
	initVis(){
		let vis = this;

		vis.margin = {top: 60, right: 40, bottom: 60, left: 40};

		vis.width = document.getElementById(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
		vis.height = document.getElementById(vis.parentElement).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;

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
		vis.tooltip = d3.select("#" + vis.parentElement)
							.append("div")
							.style("opacity", 0)
							.attr("class", "tooltip");
	
		vis.wrangleData();
	}

	/*
	* Data wrangling
	*/
	wrangleData() {
		let vis = this;
		vis.displayData = vis.data.filter(
			d => +d.variable >= vis.yearStart && +d.variable <= vis.yearEnd
		);
		vis.updateVis();
	}

	/*
	 * The drawing function - should use the D3 update sequence (enter, update, exit)
	* Function parameters only needed if different kinds of updates are needed
	*/
	updateVis(){
		let vis = this;

		const uniqueYears = [...new Set(vis.displayData.map(d => d.variable))];
		vis.y = d3.scaleBand()
			.domain(uniqueYears)
			.range([vis.height, 0])
			.padding(0.01);

		let maxValue = d3.max(vis.displayData, d => +d.value);
		vis.colorScale.domain([0, maxValue || 1]);

		let categories = vis.svg.selectAll(".value")
			.data(vis.displayData, d => d.group + "-" + d.variable);

		let entered = categories.enter().append("rect")
			.attr("class", "value")
			.attr("x", d => vis.x(d.group))
			.attr("y", d => vis.y(d.variable))
			.attr("width", vis.x.bandwidth())
			.attr("height", vis.y.bandwidth())
			.style("fill", d => vis.colorScale(+d.value))
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
			.style("fill", d => vis.colorScale(+d.value));

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
			})
			.on("click", (event, d) => {
				// Check if shift key is pressed for area chart, otherwise show gender chart
				if (event.shiftKey) {
					vis.showYearAreaChart(d.variable);
				} else {
					vis.showGenderChart(d.group);
				}
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

	showYearAreaChart(selectedYear) {
		let vis = this;

		// Filter data for selected year
		const data = vis.data.filter(d => 
			+d.variable === +selectedYear
		);

		// If no data, return
		if (data.length === 0) {
			console.log("No data for", selectedYear);
			return;
		}

		// Sort by month order
		const monthOrder = ["January", "February", "March", "April", "May", "June", 
							"July", "August", "September", "October", "November", "December"];
		
		const sortedData = data.sort((a, b) => 
			monthOrder.indexOf(a.group) - monthOrder.indexOf(b.group)
		);

		// Clear existing chart
		d3.select("#areaChart").selectAll("*").remove();

		const margin = { top: 30, right: 50, bottom: 100, left: 50 },
			width = 450 - margin.left - margin.right,
			height = 350 - margin.top - margin.bottom;

		const svg = d3.select("#areaChart")
			.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		// Scales
		const x = d3.scalePoint()
			.domain(sortedData.map(d => d.group))
			.range([0, width])
			.padding(0.5);

		const maxValue = d3.max(sortedData, d => 
			Math.max(+d.Male || 0, +d.Female || 0, +d.Trans || 0)
		);

		const y = d3.scaleLinear()
			.domain([0, maxValue])
			.nice()
			.range([height, 0]);

		// Gender categories and colors
		const genders = [
			{ key: "Male", color: "#4f88caff", name: "Male" },
			{ key: "Female", color: "#d472bfff", name: "Female" },
			{ key: "Trans", color: "#7f23bdff", name: "Trans/NB/2S" }
		];

		// Create gradients for each gender
		const defs = svg.append("defs");
		
		genders.forEach(gender => {
			const gradient = defs.append("linearGradient")
				.attr("id", `area-gradient-${gender.key}`)
				.attr("x1", "0%")
				.attr("x2", "0%")
				.attr("y1", "0%")
				.attr("y2", "100%");

			gradient.append("stop")
				.attr("offset", "0%")
				.attr("stop-color", gender.color)
				.attr("stop-opacity", 0.5);

			gradient.append("stop")
				.attr("offset", "100%")
				.attr("stop-color", gender.color)
				.attr("stop-opacity", 0.1);
		});

		// Create area and line generators
		const area = d3.area()
			.x(d => x(d.group))
			.y0(height)
			.y1(d => y(d.value))
			.curve(d3.curveMonotoneX);

		const line = d3.line()
			.x(d => x(d.group))
			.y(d => y(d.value))
			.curve(d3.curveMonotoneX);

		// Draw areas and lines for each gender
		genders.forEach(gender => {
			const genderData = sortedData.map(d => ({
				group: d.group,
				value: +d[gender.key] || 0
			}));

			// Draw area
			svg.append("path")
				.datum(genderData)
				.attr("class", `area-${gender.key}`)
				.attr("fill", `url(#area-gradient-${gender.key})`)
				.attr("d", area);

			// Draw line
			svg.append("path")
				.datum(genderData)
				.attr("class", `line-${gender.key}`)
				.attr("fill", "none")
				.attr("stroke", gender.color)
				.attr("stroke-width", 2)
				.attr("d", line);

			// Add dots
			svg.selectAll(`.dot-${gender.key}`)
				.data(genderData)
				.enter()
				.append("circle")
				.attr("class", `dot-${gender.key}`)
				.attr("cx", d => x(d.group))
				.attr("cy", d => y(d.value))
				.attr("r", 3.5)
				.attr("fill", gender.color)
				.attr("stroke", "white")
				.attr("stroke-width", 1.5)
				.style("cursor", "pointer")
				.on("mouseover", function(event, d) {
					d3.select(this)
						.transition()
						.duration(150)
						.attr("r", 5.5);
					
					// Remove any existing tooltips first
					d3.selectAll(".area-tooltip").remove();
					
					// Show tooltip
					d3.select("body")
						.append("div")
						.attr("class", "area-tooltip")
						.style("position", "absolute")
						.style("background", "rgba(255, 255, 255, 0.95)")
						.style("border", `2px solid ${gender.color}`)
						.style("border-radius", "6px")
						.style("padding", "8px 10px")
						.style("font-size", "12px")
						.style("pointer-events", "none")
						.style("z-index", "10000")
						.style("box-shadow", "0 2px 4px rgba(0,0,0,0.2)")
						.html(`<strong>${d.group}</strong><br><span style="color:${gender.color}">${gender.name}:</span> ${d.value}`)
						.style("left", (event.pageX + 10) + "px")
						.style("top", (event.pageY - 30) + "px")
						.style("opacity", 0)
						.transition()
						.duration(200)
						.style("opacity", 1);
				})
				.on("mouseout", function() {
					d3.select(this)
						.transition()
						.duration(150)
						.attr("r", 3.5);
					
					d3.selectAll(".area-tooltip")
						.transition()
						.duration(200)
						.style("opacity", 0)
						.remove();
				});
		});

		// X axis
		svg.append("g")
			.attr("transform", `translate(0,${height})`)
			.call(d3.axisBottom(x))
			.selectAll("text")
			.attr("transform", "rotate(-45)")
			.style("text-anchor", "end")
			.style("font-size", "10px");

		// Y axis
		svg.append("g")
			.call(d3.axisLeft(y).ticks(6))
			.style("font-size", "11px");

		// Y axis label
		svg.append("text")
			.attr("transform", "rotate(-90)")
			.attr("y", 0 - margin.left)
			.attr("x", 0 - (height / 2))
			.attr("dy", "1em")
			.style("text-anchor", "middle")
			.style("font-size", "12px")
			.style("font-weight", "500")
			.text("Deaths");

		// Legend
		const legend = svg.append("g")
			.attr("transform", `translate(${width - 250}, -35)`);

		genders.forEach((gender, i) => {
			const legendItem = legend.append("g")
				.attr("transform", `translate(${i * 90}, 0)`);

			legendItem.append("line")
				.attr("x1", 0)
				.attr("x2", 20)
				.attr("y1", 6)
				.attr("y2", 6)
				.attr("stroke", gender.color)
				.attr("stroke-width", 2);

			legendItem.append("circle")
				.attr("cx", 10)
				.attr("cy", 6)
				.attr("r", 3)
				.attr("fill", gender.color)
				.attr("stroke", "white")
				.attr("stroke-width", 1);

			legendItem.append("text")
				.attr("x", 25)
				.attr("y", 10)
				.text(gender.name)
				.style("font-size", "11px")
				.attr("alignment-baseline", "middle");
		});

		// Update panel title and show panel
		d3.select("#areaPanelTitle").text(`Deaths by Gender — ${selectedYear}`);
		d3.select("#areaPanel").style("display", "block");
	}

	showGenderChart(selectedMonth) {
		let vis = this;

		// Filter data for selected month and current year range
		const data = vis.data.filter(d =>
			d.group === selectedMonth &&
			+d.variable >= vis.yearStart &&
			+d.variable <= vis.yearEnd
		);

		// If no data, just return
		if (data.length === 0) {
			console.log("No data for", selectedMonth);
			return;
		}

		// Aggregate by year
		const grouped = d3.rollups(
			data,
			v => ({
				Male: d3.sum(v, d => d.Male),
				Female: d3.sum(v, d => d.Female),
				Trans: d3.sum(v, d => d.Trans)
			}),
			d => +d.variable
		).map(([year, vals]) => ({ year, ...vals }));

		// Clear existing chart
		d3.select("#genderChart").selectAll("*").remove();

		const margin = { top: 30, right: 50, bottom: 100, left: 50 },
			width = 450 - margin.left - margin.right,
			height = 350 - margin.top - margin.bottom;

		const svg = d3.select("#genderChart")
			.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("transform", `translate(${margin.left},${margin.top})`);

		const subgroups = ["Male", "Female", "Trans"];
		const groups = grouped.map(d => d.year);

		const x = d3.scaleBand()
			.domain(groups)
			.range([0, width])
			.padding(0.2);

		const y = d3.scaleLinear()
			.domain([0, d3.max(grouped, d => d.Male + d.Female + d.Trans)])
			.nice()
			.range([height, 0]);

		const color = d3.scaleOrdinal()
			.domain(subgroups)
			.range(["#4f88caff", "#d472bfff", "#7f23bdff"]);

		const stackedData = d3.stack().keys(subgroups)(grouped);

		// X axis
		svg.append("g")
			.attr("transform", `translate(0,${height})`)
			.call(d3.axisBottom(x)
				.tickFormat(d3.format("d"))
				.tickPadding(8))
			.selectAll("text")
			.attr("transform", "rotate(-40)")
			.style("text-anchor", "end")
			.style("font-size", "10.5px");

		// Y axis
		svg.append("g")
			.call(d3.axisLeft(y).ticks(5))
			.style("font-size", "11px");

		// Bars
		svg.selectAll("g.layer")
			.data(stackedData)
			.join("g")
			.attr("fill", d => color(d.key))
			.selectAll("rect")
			.data(d => d)
			.join("rect")
			.attr("x", d => x(d.data.year))
			.attr("y", d => y(d[1]))
			.attr("height", d => y(d[0]) - y(d[1]))
			.attr("width", x.bandwidth())
			.style("cursor", "pointer")
			.on("mouseover", function(event, d) {
				// Get the parent data to know which gender this is
				const genderKey = d3.select(this.parentNode).datum().key;
				const genderValue = d.data[genderKey];
				const total = d.data.Male + d.data.Female + d.data.Trans;
				
				// Highlight the bar
				d3.select(this)
					.style("opacity", 0.8)
					.style("stroke", "#333")
					.style("stroke-width", 1.5);
				
				// Remove any existing tooltips first
				d3.selectAll(".gender-tooltip").remove();
				
				// Show tooltip
				d3.select("body")
					.append("div")
					.attr("class", "gender-tooltip")
					.style("position", "absolute")
					.style("background", "rgba(255, 255, 255, 0.95)")
					.style("border", `2px solid ${color(genderKey)}`)
					.style("border-radius", "6px")
					.style("padding", "10px 12px")
					.style("font-size", "12px")
					.style("pointer-events", "none")
					.style("z-index", "10000")
					.style("box-shadow", "0 2px 6px rgba(0,0,0,0.2)")
					.html(`
						<strong>Year: ${d.data.year}</strong><br>
						<span style="color:${color(genderKey)}; font-weight:600;">${genderKey}:</span> ${genderValue}<br>
						<span style="color:#666;">Total: ${total}</span>
					`)
					.style("left", (event.pageX + 10) + "px")
					.style("top", (event.pageY - 50) + "px")
					.style("opacity", 0)
					.transition()
					.duration(200)
					.style("opacity", 1);
			})
			.on("mouseout", function() {
				// Remove highlight
				d3.select(this)
					.style("opacity", 1)
					.style("stroke", "none");
				
				// Remove tooltip
				d3.selectAll(".gender-tooltip")
					.transition()
					.duration(200)
					.style("opacity", 0)
					.remove();
			});

		// Legend
		const legend = svg.append("g")
			.attr("transform", `translate(${width - 220}, -25)`);

		subgroups.forEach((key, i) => {
			legend.append("rect")
				.attr("x", i * 75)
				.attr("y", 0)
				.attr("width", 12)
				.attr("height", 12)
				.attr("fill", color(key));

			legend.append("text")
				.attr("x", i * 75 + 17)
				.attr("y", 10)
				.text(key)
				.style("font-size", "11px")
				.attr("alignment-baseline", "middle");
		});

		// Update panel title and show panel
		d3.select("#panelTitle").text(`Deaths by Gender — ${selectedMonth}`);
		d3.select("#genderPanel").style("display", "block");
	}
}