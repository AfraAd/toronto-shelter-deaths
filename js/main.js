// Variables for the visualization instances
let heatmap;

// Start application by loading the data
loadData();

function loadData() {
  d3.json("data/Deaths of Shelter Residents.json").then(function (data) {
    // Prepare the data for heatmap format
    let clean_data = prepareData(data);
    console.log("data is loaded");
    console.log(clean_data.slice(0, 5));

    // Create heatmap visualization
    heatmap = new HeatMap("heatmap", clean_data);
    heatmap.initVis();

    // Build the dual-handle year range slider
    buildYearRangeSlider(clean_data);
  });
}

// Helper function to prepare raw data
function prepareData(data) {
  const parseCount = (val) => {
    let num = +val;
    if (isNaN(num) || val === null || val === undefined || val === "n/a") return 0;
    return num;
  };

  return data.map((d) => ({
    variable: d.Year,
    group: d.Month,
    value: parseCount(d["Total decedents"]),
    Male: parseCount(d.Male),
    Female: parseCount(d.Female),
    Trans: parseCount(d["Transgender/Non-binary/Two-Spirit"]),
  }));
}

// =====================================================
// DUAL-HANDLE D3 YEAR RANGE SLIDER
// =====================================================

function buildYearRangeSlider(clean_data) {
  const years = clean_data.map((d) => +d.variable);
  const minYear = d3.min(years);
  const maxYear = d3.max(years);

  const sliderWidth = 350;
  const sliderHeight = 60;

  const svgSlider = d3
    .select("#yearRange")
    .append("svg")
    .attr("width", sliderWidth)
    .attr("height", sliderHeight);

  const sliderGroup = svgSlider
    .append("g")
    .attr("transform", "translate(20,30)");

  const xScale = d3
    .scaleLinear()
    .domain([minYear, maxYear])
    .range([0, sliderWidth - 80])
    .clamp(true);

  // Slider track
  sliderGroup
    .append("line")
    .attr("class", "track")
    .attr("x1", xScale.range()[0])
    .attr("x2", xScale.range()[1])
    .attr("stroke", "#ccc")
    .attr("stroke-width", 6)
    .attr("stroke-linecap", "round");

  // Active range highlight
  const rangeHighlight = sliderGroup
    .append("line")
    .attr("class", "track-inset")
    .attr("x1", xScale(minYear))
    .attr("x2", xScale(maxYear))
    .attr("stroke", "#134fbdff")
    .attr("stroke-width", 6)
    .attr("stroke-linecap", "round");

  // Initialize handles
  let handles = [minYear, maxYear];

  // Define drag behavior
  const drag = d3
    .drag()
    .on("drag", function (event, d) {
      const index = +d3.select(this).attr("data-index");
      let newYear = Math.round(xScale.invert(event.x));

      // Clamp within bounds
      newYear = Math.max(minYear, Math.min(maxYear, newYear));
      handles[index] = newYear;

      // Keep handles ordered
      if (handles[0] > handles[1]) handles.reverse();

      updateHandles();
    })
    .on("end", updateHeatmap);

  // Create handle circles
  const handleElems = [0, 1].map((i) =>
    sliderGroup
      .append("circle")
      .attr("r", 8)
      .attr("fill", "#134fbdff")
      .attr("cy", 0)
      .attr("data-index", i)
      .call(drag)
  );

  // Update handle and label positions
  function updateHandles() {
    handleElems[0].attr("cx", xScale(handles[0]));
    handleElems[1].attr("cx", xScale(handles[1]));
    rangeHighlight
      .attr("x1", xScale(handles[0]))
      .attr("x2", xScale(handles[1]));
    d3.select("#yearValue").text(`${handles[0]} – ${handles[1]}`);
  }

  // Update heatmap when range changes
  function updateHeatmap() {
    heatmap.yearStart = handles[0];
    heatmap.yearEnd = handles[1];
    heatmap.wrangleData();
  }

  // Tick marks under the slider
  const ticks = xScale.ticks(maxYear - minYear > 10 ? 10 : maxYear - minYear);
  sliderGroup
    .selectAll(".tick-label")
    .data(ticks)
    .enter()
    .append("text")
    .attr("class", "tick-label")
    .attr("x", (d) => xScale(d))
    .attr("y", 25)
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .style("fill", "#555")
    .text((d) => d);

  // Initialize slider visually
  updateHandles();

  // Close button handlers for both panels
  d3.select("#closePanel").on("click", () => {
    d3.select("#genderPanel").style("display", "none");
  });

  d3.select("#closeAreaPanel").on("click", () => {
    d3.select("#areaPanel").style("display", "none");
  });
}