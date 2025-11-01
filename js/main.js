// Variables for the visualization instances
let heatmap;
let linegraph;
let bargraph;

// Global filters that apply to all visualizations
let globalFilters = {
  yearRange: [2007, 2024],
  genderFilters: {
    male: true,
    female: true,
    trans: true
  }
};

// Store the clean data globally
let globalData = [];

// Start application by loading the data
loadData();

function loadData() {
  d3.json("data/Deaths of Shelter Residents.json").then(function (data) {
    // Prepare the data for visualization format
    globalData = prepareData(data);
    console.log("Data is loaded");
    console.log("Sample data:", globalData.slice(0, 5));

    // Initialize global filters
    setupGlobalFilters();

    // Build the brush chart for year range selection - with delay to ensure DOM is ready
    setTimeout(() => buildBrushChart(globalData), 100);

    // Create all visualizations
    heatmap = new HeatMap("heatmap", globalData, globalFilters);
    heatmap.initVis();

    linegraph = new LineGraph("lineChart", globalData, globalFilters);
    linegraph.initVis();

    bargraph = new BarGraph("barChart", globalData, globalFilters);
    bargraph.initVis();

    // Initialize tab functionality
    setupTabs();
    
    // Calculate and display statistics
    calculateStatistics(globalData);
  });
}

// Helper function to prepare raw data
function prepareData(data) {
  const parseCount = (val) => {
    let num = +val;
    if (isNaN(num) || val === null || val === undefined || val === "n/a") return 0;
    return num;
  };

  // Map abbreviated months to full names
  const monthMap = {
    'Jan': 'January',
    'Feb': 'February',
    'Mar': 'March',
    'Apr': 'April',
    'May': 'May',
    'Jun': 'June',
    'Jul': 'July',
    'Aug': 'August',
    'Sep': 'September',
    'Oct': 'October',
    'Nov': 'November',
    'Dec': 'December'
  };

  return data.map((d) => ({
    variable: d.Year,
    group: monthMap[d.Month] || d.Month,
    value: parseCount(d["Total decedents"]),
    Male: parseCount(d.Male),
    Female: parseCount(d.Female),
    Trans: parseCount(d["Transgender/Non-binary/Two-Spirit"]),
  }));
}

// =====================================================
// GLOBAL FILTERS SETUP
// =====================================================

function setupGlobalFilters() {
  // Gender filter listeners
  ['male', 'female', 'trans'].forEach(gender => {
    const checkbox = d3.select(`#filter-${gender}`);
    const label = checkbox.node().parentElement;
    
    checkbox.on('change', function() {
      globalFilters.genderFilters[gender] = this.checked;
      
      if (this.checked) {
        label.classList.add('checked');
      } else {
        label.classList.remove('checked');
      }
      
      // Update all visualizations
      updateAllVisualizations();
    });
  });

  // Reset brush button
  d3.select("#resetBrush").on("click", () => {
    globalFilters.yearRange = [2007, 2024];
    const brushGroup = d3.select("#brushGroup");
    if (!brushGroup.empty() && window.brush) {
      brushGroup.call(window.brush.move, null);
    }
    d3.select("#yearRangeDisplay").text("2007 — 2024");
    updateAllVisualizations();
  });
}

// Update all visualizations when filters change
function updateAllVisualizations() {
  if (heatmap) heatmap.wrangleData();
  if (linegraph) linegraph.wrangleData();
  if (bargraph) bargraph.wrangleData();
}

// =====================================================
// CALCULATE AND DISPLAY STATISTICS
// =====================================================

function calculateStatistics(data) {
  // Group data by year and calculate yearly totals
  const yearGroups = d3.group(data, d => d.variable);
  const yearlyTotals = Array.from(yearGroups, ([year, values]) => ({
    year: +year,
    total: d3.sum(values, v => v.value || 0)
  })).sort((a, b) => a.year - b.year);
  
  // Pre-pandemic period (2007-2019)
  const prePandemic = yearlyTotals.filter(d => d.year >= 2007 && d.year <= 2019);
  const prePandemicAvg = d3.mean(prePandemic, d => d.total);
  
  // Pandemic period (2020-2024)
  const pandemic = yearlyTotals.filter(d => d.year >= 2020 && d.year <= 2024);
  const pandemicAvg = d3.mean(pandemic, d => d.total);
  
  // Calculate percent increase
  const percentIncrease = ((pandemicAvg - prePandemicAvg) / prePandemicAvg) * 100;
  
  // Find peak year
  const peakYearData = yearlyTotals.reduce((max, current) => 
    current.total > max.total ? current : max
  );
  
  // Calculate total deaths
  const totalDeaths = d3.sum(yearlyTotals, d => d.total);
  
  // Update the DOM
  document.getElementById('prePandemicAvg').textContent = Math.round(prePandemicAvg);
  document.getElementById('pandemicAvg').textContent = Math.round(pandemicAvg);
  document.getElementById('percentIncrease').textContent = `+${Math.round(percentIncrease)}%`;
  document.getElementById('peakYear').textContent = `${peakYearData.year} (${peakYearData.total})`;
  document.getElementById('totalDeaths').textContent = totalDeaths.toLocaleString();
}

// =====================================================
// BRUSH CHART FOR YEAR RANGE SELECTION
// =====================================================

function buildBrushChart(clean_data) {
  // Prepare data for brush chart (yearly totals)
  const yearGroups = d3.group(clean_data, d => d.variable);
  const brushData = Array.from(yearGroups, ([year, values]) => ({
    year: +year,
    total: d3.sum(values, v => v.value || 0)
  })).sort((a, b) => a.year - b.year);
  
  // Get container width
  const container = document.getElementById('brushChart');
  if (!container) {
    console.error('brushChart container not found');
    return;
  }
  
  const margin = {top: 10, right: 30, bottom: 30, left: 50};
  const containerWidth = container.getBoundingClientRect().width || 800;
  const width = Math.max(300, containerWidth - margin.left - margin.right);
  const height = 80;
  
  // Clear any existing SVG
  d3.select("#brushChart").selectAll("*").remove();
  
  // Create SVG for brush chart
  const svg = d3.select("#brushChart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
  
  // Scales for brush chart
  const xScale = d3.scaleLinear()
    .domain(d3.extent(brushData, d => d.year))
    .range([0, width]);
  
  const yScale = d3.scaleLinear()
    .domain([0, d3.max(brushData, d => d.total)])
    .range([height, 0]);
  
  // Area generator
  const area = d3.area()
    .x(d => xScale(d.year))
    .y0(height)
    .y1(d => yScale(d.total))
    .curve(d3.curveMonotoneX);
  
  // Draw area
  svg.append("path")
    .datum(brushData)
    .attr("class", "brush-area")
    .attr("fill", "#134fbdff")
    .attr("fill-opacity", 0.3)
    .attr("stroke", "#134fbdff")
    .attr("stroke-width", 1.5)
    .attr("d", area);
  
  // X axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).ticks(10))
    .style("font-size", "10px");
  
  // Y axis
  svg.append("g")
    .call(d3.axisLeft(yScale).ticks(3))
    .style("font-size", "10px");
  
  // Y axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 10)
    .attr("x", -height / 2)
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "10px")
    .text("Deaths");
  
  // Add brush
  window.brush = d3.brushX()
    .extent([[0, 0], [width, height]])
    .on("end", function(event) {
      if (!event.selection) {
        globalFilters.yearRange = [2007, 2024];
        d3.select("#yearRangeDisplay").text("2007 — 2024");
      } else {
        const [x0, x1] = event.selection;
        globalFilters.yearRange = [
          Math.round(xScale.invert(x0)),
          Math.round(xScale.invert(x1))
        ];
        d3.select("#yearRangeDisplay").text(
          `${globalFilters.yearRange[0]} — ${globalFilters.yearRange[1]}`
        );
      }
      updateAllVisualizations();
    });
  
  svg.append("g")
    .attr("id", "brushGroup")
    .attr("class", "brush")
    .call(window.brush);
}

// =====================================================
// TAB FUNCTIONALITY
// =====================================================

function setupTabs() {
  const tabs = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab
      tab.classList.add('active');

      // Show corresponding content
      const tabId = tab.getAttribute('data-tab');
      const content = document.getElementById(tabId);
      if (content) {
        content.classList.add('active');
        
        // Recalculate sizes for visualizations when their tab becomes visible
        // Use setTimeout to ensure DOM has updated
        setTimeout(() => {
          if (tabId === 'linechart-tab' && linegraph && linegraph.recalculateSize) {
            linegraph.recalculateSize();
          } else if (tabId === 'barchart-tab' && bargraph && bargraph.recalculateSize) {
            bargraph.recalculateSize();
          } else if (tabId === 'heatmap-tab' && heatmap && heatmap.recalculateSize) {
            heatmap.recalculateSize();
          }
        }, 50);
      }
    });
  });

  // Activate first tab by default
  if (tabs.length > 0) {
    tabs[0].click();
  }
}