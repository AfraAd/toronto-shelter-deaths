
/*
 * StackedAreaChart - ES6 Class
 * @param  parentElement 	-- the HTML element in which to draw the visualization
 * @param  data             -- the data the that's provided initially
 * @param  displayData      -- the data that will be used finally (which might vary based on the selection)
 *
 */

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
  			.range(["#f9f0f0", "#7b1a28"]);
		
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
	wrangleData(){
		let vis = this;

        vis.displayData = vis.data.filter(d => +d.variable <= vis.yearCutoff);

		// Update the visualization
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

		categories.enter().append("rect")
			.attr("class", "value")
			.merge(categories)
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
					<span style="font-weight:500;">Female:</span> ${d.Female || 0}
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
	}
}