<script >
import * as d3 from 'd3';

export default {
    props: {
        countries: Array
    },
    emits: ['bar-clicked'],
    mounted() {
        this.createBarChart();
    },
    methods: {
        createBarChart() {
            // Create an SVG container
            const margin = { top: 20, right: 30, bottom: 40, left: 40 };
            const width = 900 - margin.left - margin.right;
            const height = 600 - margin.top - margin.bottom;

            const svg = d3
                .select('#chart')
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            var tooltip = d3.select("body")
                .append("div")
                .attr('class', 'popup-container')
                .style("position", "absolute")
                .style("z-index", "10")
                .style("visibility", "hidden")
                .text("");
            // Create a color scale for the series
            const color = d3
                .scaleOrdinal()
                .domain(Object.keys(data[0]).filter((key) => key !== 'x'))
                .range(d3.schemeCategory10);

            // Create x and y scales
            const xScale = d3
                .scaleLinear()
                .domain([d3.min(data, (d) => d.x), d3.max(data, (d) => d.x)])
                .range([0, width]);

            function xValueFromMouse(mouseX) {
                return xScale.invert(mouseX);
            }

            const yScale = d3
                .scaleLinear()
                .domain([0, d3.max(data, (d) => d3.sum(Object.values(d).slice(1)))])
                .range([height, 0]);

            function yValueFromMouse(mouseY) {
                return yScale.invert(mouseY);
            }
            // Create a stack generator
            const stack = d3
                .stack()
                .keys(Object.keys(data[0]).filter((key) => key !== 'x'))
                .order(d3.stackOrderNone)
                .offset(d3.stackOffsetNone);

            // Compute the stacked data
            const seriesData = stack(data);

            // Create an area generator with curveBasis interpolation
            const area = d3
                .area()
                .x((d) => xScale(d.data.x))
                .y0((d) => yScale(d[0]))
                .y1((d) => yScale(d[1]))
                .curve(d3.curveMonotoneX); // Use curved shape  d3.curveBasis , curveLinear

            // Draw the stacked areas
            svg
                .selectAll('.area')
                .data(seriesData)
                .enter()
                .append('path')
                .attr('class', 'area')
                .attr('fill', (d) => color(d.key))
                .attr('d', area)
                .on("mouseover", function (event, d) {
                    let tooltipText = `Technology:  ${d.key}`;
                    var coordinates = d3.pointer(event);

                    var x = coordinates[0];
                    var y = coordinates[1];
                    const xValue = xValueFromMouse(x); 
                    const yValue = yValueFromMouse(y);
                    tooltipText= `${tooltipText}: Reductions: ${xValue}` 
                    tooltip.text(tooltipText);

                    
                    return tooltip.style("visibility", "visible");
                })
                .on("mousemove", function (event, d) {
                    let tooltipText = `Technology:  ${d.key}`;
                    var coordinates = d3.pointer(event);

                    var x = coordinates[0];
                    var y = coordinates[1];
                    // find the X value for the selected series
                    const xValue = xValueFromMouse(x); 
                    // find the Y value for the selected series
                    const yValue = yValueFromMouse(y);
                    tooltipText= `${tooltipText}: Reductions: ${xValue.toFixed(2)} Cost: ${yValue.toFixed(2)}` 
                    tooltip.text(tooltipText);

  

                    return tooltip.style("top", (y + 50 + margin.top ) + "px").style("left", (x + 10) + "px");
                })
                .on("mouseout", function () { return tooltip.style("visibility", "hidden"); })
                .on('click', function (event, d) {
                    var coordinates = d3.pointer(event);
                    var x = coordinates[0];
                    var y = coordinates[1];
                    // Determine which series was clicked
                    const series = d.key;

                    // Log or display the information as needed
                    console.log(`Clicked on x: ${x}, y: ${y}`);

                    const xCoordToFind = xValueFromMouse(x); // Replace with the desired x-coordinate - translate mouse x to value on x-axis
                    const yValue = yValueFromMouse(y);

                    console.log(
                        `x value for click is ${xCoordToFind}, y value at click point = ${yValue}`
                    );
                    const valuesAtX = findValuesAtX(xCoordToFind, data);
                    console.log(
                        `Values at x=${xCoordToFind}:`,
                        JSON.stringify(valuesAtX)
                    );
                    console.log(`Clicked on series: ${series}`);

                    const updatedBarData = [
                        /*        { series: "transport", value: 1 },
                      { series: "windenergy", value: 22 },
                      { series: "nuclear", value: 5 },
                      { series: "biomass", value: 5 },
                      { series: "waterenergy", value: 8 },
                      { series: "newtech", value: 8 },
                      { series: "wonderstuff", value: 3 }
                  */
                    ];
                    for (const areaValue of valuesAtX) {
                        updatedBarData.push({
                            series: areaValue.series,
                            value: areaValue.value,
                        });
                    }

                    repaintBar(updatedBarData);
                });

            // Add x and y axes
            const xAxis = d3.axisBottom(xScale);
            const yAxis = d3.axisLeft(yScale);

            svg
                .append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0,${height})`)
                .call(xAxis);

            svg.append('g').attr('class', 'y-axis').call(yAxis);

            // Add x-axis and y-axis titles to the area chart
            svg
                .append('text')
                .attr('class', 'x-axis-title')
                .attr('x', margin.left + 100)
                .attr('y', height + 35) // Adjusted y position
                .style('text-anchor', 'middle')
                .text('Total Emissions Reductions (Mt CO2)');

            svg
                .append('g')
                .attr('transform', 'translate(' + -25 + ', ' + 530 + ')')
                .append('text')
                .attr('text-anchor', 'start')
                .attr('transform', 'rotate(-90)')
                .text('Capacity (GW) / Total System Cost (Billion $)');

            // Create the vertical line
            const verticalLine = svg
                .append('line')
                .attr('class', 'vertical-line')
                .attr('x1', 410)
                .attr('x2', 410)
                .attr('y1', 0)
                .attr('y2', height + 40);

            // vertical line Marker
            const verticalLineMarker = svg
                .append('rect')
                .attr('class', 'marker')
                .attr('x', 400)
                .attr('y', height + 20)
                .attr('width', 20)
                .attr('height', 20);

            // Drag behavior vertical line marker
            const drag = d3.drag().on('drag', function () {
                var coordinates = d3.pointer(event);
                var x = coordinates[0] - 40;
                var y = coordinates[1];

                x = Math.max(0, Math.min(width - 20, x)); // Limit the marker within the SVG
                d3.select(this).attr('x', x); // Move marker
                verticalLine.attr('x1', x + 10).attr('x2', x + 10); // Move line

                // find current x coordinate and synchronize bar chart
                const xCoordToFind = xValueFromMouse(x); // Replace with the desired x-coordinate - translate mouse x to value on x-axis
                const valuesAtX = findValuesAtX(xCoordToFind, data);

                // TODO only if the values have changed should we proceed (to prevent unnecessary repaints)
                const updatedBarData = [];
                let sum = 0;
                for (const areaValue of valuesAtX) {
                    updatedBarData.push({
                        series: areaValue.series,
                        value: areaValue.value,
                    });
                    sum = sum + areaValue.value;
                }

                const newY = yScale(sum);

                // update horizontal line and marker
                horizontalLine.attr('y1', newY).attr('y2', newY); // Move line
                horizontalLineMarker.attr('y', newY - 10); // Move marker

                repaintBar(updatedBarData);
            });

            verticalLineMarker.call(drag);

            // Create the horizontal line
            const horizontalLine = svg
                .append('line')
                .attr('class', 'vertical-line')
                .attr('x1', -20)
                .attr('x2', width)
                .attr('y1', 100)
                .attr('y2', 100);

            // vertical line Marker
            const horizontalLineMarker = svg
                .append('rect')
                .attr('class', 'marker')
                .attr('x', -30)
                .attr('y', 90)
                .attr('width', 20)
                .attr('height', 20);

            // Drag behavior horizontal line marker
            const dragHorizontalLine = d3.drag().on('drag', function () {
                var coordinates = d3.pointer(event);
                var x = coordinates[0] - 40;
                var y = coordinates[1];

                x = Math.max(0, Math.min(width - 20, x)); // Limit the marker within the SVG
                d3.select(this).attr('y', y); // Move marker
                horizontalLine.attr('y1', y + 10).attr('y2', y + 10); // Move line
            });

            horizontalLineMarker.call(dragHorizontalLine);

            function updateLines(x, y) {
                verticalLine.attr('x1', x).attr('x2', x);
                horizontalLine.attr('y1', y).attr('y2', y);
            }

            // Function to find values for every area at a given x-coordinate
            function findValuesAtX(xCoord, data) {
                // Filter the data to find the data point with the closest x-coordinate
                const closestDataPoint = data.reduce((closest, current) => {
                    const xDiff = Math.abs(current.x - xCoord);
                    if (xDiff < Math.abs(closest.x - xCoord)) {
                        return current;
                    }
                    return closest;
                });

                // Extract values for each series at the specified x-coordinate
                const values = Object.keys(closestDataPoint)
                    .filter((key) => key !== 'x')
                    .map((series) => ({
                        series,
                        value: closestDataPoint[series],
                    }));

                return values;
            }

            // bar

            // Create an SVG container for the bar chart
            const barMargin = { top: 20, right: 30, bottom: 40, left: 40 };
            const barWidth = 900 - barMargin.left - barMargin.right;
            const barHeight = 250 - barMargin.top - barMargin.bottom;

            const barSvg = d3
                .select('#bar-chart')
                .append('svg')
                .attr('width', barWidth + barMargin.left + barMargin.right)
                .attr('height', barHeight + barMargin.top + barMargin.bottom)
                .append('g')
                .attr('transform', `translate(${barMargin.left},${barMargin.top})`);

            // Create x and y scales for the bar chart
            const barXScale = d3
                .scaleBand()
                .domain(barData.map((d) => d.series))
                .range([0, barWidth])
                .padding(0.1);

            const barYScale = d3
                .scaleLinear()
                .domain([0, d3.max(barData, (d) => d.value)])
                .nice()
                .range([barHeight, 0]);

            // Create the bars for the bar chart
            barSvg
                .selectAll('.bar')
                .data(barData)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', (d) => barXScale(d.series))
                .attr('y', (d) => barYScale(d.value))
                .attr('width', barXScale.bandwidth())
                .attr('height', (d) => barHeight - barYScale(d.value))
                .attr('fill', (d, i) => d3.schemeCategory10[i])
                .on('click', (d, i) => {
                    // Emit a custom event when a bar is clicked
                    this.$emit('bar-clicked', { value: d, index: i });
                })
                ;
            // Add x and y axes for the bar chart
            const barXAxis = d3.axisBottom(barXScale);
            const barYAxis = d3.axisLeft(barYScale);

            barSvg
                .append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0,${barHeight})`)
                .call(barXAxis);

            barSvg.append('g').attr('class', 'y-axis').call(barYAxis);

            function repaintBar(updatedBarData) {
                // Replace the bar chart data with the updated dataset
                barSvg
                    .selectAll('.bar')
                    .data(updatedBarData)
                    .transition()
                    .duration(1) // Add a transition for a smooth update
                    .attr('x', (d) => barXScale(d.series))
                    .attr('y', (d) => barYScale(d.value))
                    .attr('width', barXScale.bandwidth())
                    .attr('height', (d) => barHeight - barYScale(d.value));

                // Update the x and y domains of the bar chart scales
                barXScale.domain(updatedBarData.map((d) => d.series));
                barYScale.domain([0, d3.max(updatedBarData, (d) => d.value)]);

                // Update the x and y axes
                barSvg.select('.x-axis').transition().duration(1000).call(barXAxis);

                barSvg.select('.y-axis').transition().duration(1000).call(barYAxis);
            }

        },
    },
};

const data = [
    {
        x: 1,
        transport: 10,
        windenergy: 4,
        nuclear: 10,
        biomass: 15,
        waterenergy: 0,
        newtech: 2,
        wonderstuff: 0,
    },
    {
        x: 2,
        transport: 6,
        windenergy: 5,
        nuclear: 20,
        biomass: 10,
        waterenergy: 1,
        newtech: 5,
        wonderstuff: 0,
    },
    {
        x: 3,
        transport: 4,
        windenergy: 3,
        nuclear: 15,
        biomass: 8,
        waterenergy: 8,
        newtech: 5,
        wonderstuff: 0,
    },
    {
        x: 4,
        transport: 1,
        windenergy: 0,
        nuclear: 9,
        biomass: 13,
        waterenergy: 2,
        newtech: 2,
        wonderstuff: 2,
    },
    {
        x: 5,
        transport: 0,
        windenergy: 0,
        nuclear: 4,
        biomass: 2,
        waterenergy: 0,
        newtech: 1,
        wonderstuff: 4,
    },
    {
        x: 7.3,
        transport: 0,
        windenergy: 0,
        nuclear: 5,
        biomass: 2,
        waterenergy: 0,
        newtech: 1,
        wonderstuff: 1,
    },
];

// Sample data for the bar chart
const barData = [
    { series: 'transport', value: 10 },
    { series: 'windenergy', value: 20 },
    { series: 'nuclear', value: 15 },
    { series: 'biomass', value: 25 },
    { series: 'waterenergy', value: 18 },
    { series: 'newtech', value: 18 },
    { series: 'wonderstuff', value: 18 },
];


</script>
<template>
    Stacked Area Chart for {{ countries }}

    <!-- Create a container for the chart -->
    <div id="chart">


    </div>
    <!-- Create a container for the bar chart -->
    <div id="bar-chart"></div>
</template>
<style>
/* Style the line */
.vertical-line {
    stroke: steelblue;
    stroke-width: 2;
    stroke-dasharray: 5, 5;
    /* Add dashed line style */
}

/* Style the lines */
.line {
    stroke-width: 2;
    stroke-dasharray: 5, 5;
    /* Add dashed line style */
}

#chart {
    position: relative;
}

.marker {
    cursor: pointer;
    fill: red;
}


.popup-container {
    background-color: #fff;
    border: 1px solid #ccc;
    padding: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    /* Add other styling properties as needed */
}
</style>