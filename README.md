# Deaths of Shelter Residents - Data Visualization Dashboard

## File Structure

This project consists of one HTML file, one main JavaScript file, three visualization JavaScript files, and four CSS files:

### HTML
- **index.html** - Main HTML file with tabbed interface and global filters

### JavaScript Files
- **main.js** - Controls tab navigation, global filters, and brush chart for year range selection
- **heatmap.js** - Heatmap visualization showing monthly deaths by year
- **linegraph.js** - Line chart showing deaths over time
- **bargraph.js** - Stacked bar chart showing average monthly deaths

### CSS Files
- **main.css** - Global styles, layout, tabs, filters, and shared components
- **heatmap.css** - Styles specific to the heatmap visualization
- **linegraph.css** - Styles specific to the line chart visualization
- **bargraph.css** - Styles specific to the bar chart visualization

## Features

### Global Filters (Apply to All Visualizations)
1. **Gender Filters** - Toggle Male, Female, and Trans/NB/2S data
2. **Year Range Filter** - Interactive brush chart to select date range

### Three Visualization Tabs

#### 1. Heatmap View
- Color-coded grid showing deaths by month and year
- Darker colors indicate higher death counts
- Includes dynamic color legend
- Hover tooltips show detailed breakdown by gender

#### 2. Timeline View
- Line chart showing deaths over time
- Multiple lines for Male, Female, Trans/NB/2S, and Total
- Interactive data points with hover effects
- Responds to both gender and year range filters

#### 3. Monthly Average
- Stacked bar chart showing average deaths per month
- Averages calculated across selected year range
- Shows seasonal patterns in the data
- Bars stack to show gender breakdown

## Color Scheme

- **Male**: #4f88caff (Blue)
- **Female**: #d472bfff (Pink)
- **Trans/NB/2S**: #7f23bdff (Purple)
- **Total**: #2d5d2f (Green)
- **Primary**: #134fbdff (Blue)
- **Accent**: #d31c34 (Red)

## CSS Organization

### main.css
- Reset and global styles
- Header and typography
- Tab system (buttons, content, animations)
- Global filters and controls
- Brush chart styling
- Responsive design utilities

### heatmap.css
- Heatmap cell styling and interactions
- Color legend styles
- Heatmap-specific tooltip
- Axis customization for heatmap
- Animations for wave effect

### linegraph.css
- Line path styling (stroke, width, colors)
- Data point (dot) styling
- Legend positioning and styling
- Line chart tooltip
- Hover effects and animations
- Grid lines

### bargraph.css
- Bar element styling
- Stacked bar interactions
- Bar chart legend
- Tooltip styling
- Bar animations (grow up effect)
- Optional features (gradient bars, patterns)

## Responsive Design

All CSS files include responsive breakpoints:
- **Desktop**: 1400px+ (full features)
- **Tablet**: 1024px - 1399px (adjusted spacing)
- **Mobile**: 768px and below (compact layout)

## Usage

1. Place all files in your project directory:
   ```
   /project
   ├── index.html
   ├── /js
   │   ├── main.js
   │   ├── heatmap.js
   │   ├── linegraph.js
   │   └── bargraph.js
   ├── /css
   │   ├── main.css
   │   ├── heatmap.css
   │   ├── linegraph.css
   │   └── bargraph.css
   └── /data
       └── Deaths of Shelter Residents.json
   ```

2. Ensure D3.js is loaded (already included via CDN in index.html)

3. Open index.html in a web browser

## Data Format

The visualization expects data in the following JSON format:
```json
[
  {
    "Year": 2007,
    "Month": "Jan",
    "Total decedents": 5,
    "Male": 4,
    "Female": 1,
    "Transgender/Non-binary/Two-Spirit": 0
  },
  ...
]
```

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

All modern browsers with SVG and ES6 support.

## Customization

### Changing Colors
Edit color variables in respective CSS files:
- Heatmap colors: `heatmap.css` (color scale range)
- Line colors: `linegraph.css` (gender-specific classes)
- Bar colors: `bargraph.css` (fill attributes)

### Adjusting Dimensions
Modify margin and size variables in JavaScript constructors:
- `vis.margin = {top, right, bottom, left}`
- `vis.width` and `vis.height`

### Adding New Filters
1. Add filter UI in `index.html` global filters section
2. Update `globalFilters` object in `main.js`
3. Modify `wrangleData()` methods in visualization files

## Performance Notes

- Heatmap uses wave animation only on first load
- Transitions are optimized with D3's update pattern
- Large datasets (>5000 points) may benefit from data aggregation

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- High contrast color scheme
- Responsive text sizing

## License

[Add your license information here]

## Credits

Visualization built with D3.js v7
Data: City of Toronto - Deaths of Shelter Residents
