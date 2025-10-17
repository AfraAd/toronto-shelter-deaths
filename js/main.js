
// Variables for the visualization instances
let heatmap;


// Start application by loading the data
loadData();

function loadData() {


	d3.json("data/Deaths of Shelter Residents.json").then(function(data) {
		// Prepare the data so that it can be converted into a heatmap
		let clean_data = prepareData(data)

		console.log("data is loaded");

		// Create heatmap visualizations
		heatmap = new HeatMap("heatmap", clean_data)
		heatmap.initVis();
        d3.select("#yearRange").on("input", function() {
        let selectedYear = +this.value;
        d3.select("#yearValue").text(`Up to ${selectedYear}`);
        heatmap.yearCutoff = selectedYear;
        heatmap.wrangleData();
        });
	
	});


}


// helper function to prepare raw data
function prepareData(data) {

    // Helper function to safely parse a value to an integer, treating non-numeric (like "n/a") as 0
    const parseCount = (val) => {
        // Use unary plus operator for quick conversion, then check if it's a valid number.
        // Also check if the original value is null/undefined/empty string, in which case it should be 0.
        let num = +val; 
        if (isNaN(num) || val === null || val === undefined || val === "n/a") {
            return 0;
        }
        return num;
    };

    // Map the raw data array to the new structure
    let preparedData = data.map(d => {
        return {
            // Y-axis variable: Year (converted to string for categorical axis)
            variable: d.Year,

            // X-axis group: Month
            group: d.Month,

            // Heatmap value (color intensity): Total decedents
            value: parseCount(d["Total decedents"]),

            // Keep separate gender counts as requested
            Male: parseCount(d.Male),
            Female: parseCount(d.Female),
            
            // Shortened key for Transgender/Non-binary/Two-Spirit
            Trans: parseCount(d["Transgender/Non-binary/Two-Spirit"])
        }
    });

	console.log(preparedData);

    return preparedData;
}


