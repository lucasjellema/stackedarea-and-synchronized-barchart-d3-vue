<template>
    <div id="mapcontainer"></div>
    <div id="country-details" class="hidden">
        <!-- Country details will be displayed here -->
    </div>
</template>
    
<script>
import * as d3 from 'd3';
import * as topojson from 'topojson';
import { geoAlbers, geoEquirectangular,geoEqualEarth } from 'd3-geo';



let svg, g, countryDataSet;

const countryDetailsBox = document.getElementById("country-details");



export default {
    name: 'WorldMap',
    mounted() {
        const width = 1850,
            height = 950;
        const t0 = { k: width / 2 / Math.PI, x: width / 2, y: height / 2 };
        svg = d3
            .select('#mapcontainer')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('preserveAspectRatio', 'xMinYMin');



            //const projection = d3.geoNaturalEarth1().translate([t0.x, t0.y]).scale(t0.k);
            const projection = d3.geoEquirectangular().translate([t0.x, t0.y]).scale(t0.k);
            //const projection = d3.geoAlbers().translate([t0.x, t0.y]).scale(t0.k);


        const pathGenerator = d3.geoPath().projection(projection);
        let zoooom;

        g = svg.append('g');

        const colorLegendG = svg
            .append('g')
            .attr('transform', `translate(40,310)`);


        // show a box with country details  
        const countryLegendG = svg
            .append('g')
            .attr('transform', `translate(1450,610)`);

        const countryDetailsBackgroundRect = countryLegendG.selectAll('rect').data([null]);

        countryDetailsBackgroundRect
            .enter()
            .append('rect')
            .merge(countryDetailsBackgroundRect)
            .attr('x', -20 * 2)
            .attr('y', -20 * 2)
            .attr('rx', 20 * 2)
            .attr('width', 400)
            .attr('fill', '#eeffff')
            .attr('height', 160)
            .attr("display", "none")
            .attr("id", "my-rectangle")
            ;

        countryDetailsBackgroundRect
            .append('text')
            .merge(countryDetailsBackgroundRect.select('text'))
            .text("(d) => d")
            .attr('dy', '0.32em')
            .attr('x', 10)




        g.append('path')
            .attr('class', 'sphere')
            .attr('d', pathGenerator({ type: 'Sphere' }));


        const colorScale = d3.scaleOrdinal();
        //      const colorValue = (d) => d.properties.economy;
        //      const colorValue = (d) => d.properties.continent ;
        //      const colorValue = (d) => d.properties.income_grp ;
        const colorValue = function (d) {
            const nameLength = d.properties.name.length;
            const nameLengthCategory =
                nameLength < 6 ? 'Short' : 'Long' + ' ' + nameLength;
            return d.properties.continent;
        };

        const loadAndProcessData = () =>
            Promise.all([
                d3.tsv('https://unpkg.com/world-atlas@1.1.4/world/50m.tsv'),
                d3.json('https://unpkg.com/world-atlas@1.1.4/world/50m.json'),
            ]).then(([tsvData, topoJSONdata]) => {
                const rowById = tsvData.reduce((accumulator, d) => {
                    accumulator[d.iso_n3] = d;
                    return accumulator;
                }, {});

                const countries = topojson.feature(
                    topoJSONdata,
                    topoJSONdata.objects.countries
                );

                countries.features.forEach((d) => {
                    // add all country properties from the TSV file to the features of the countries
                    Object.assign(d.properties, rowById[d.id]);
                    const nameLength = parseInt(d.properties.name_len);
                    d.properties['nameLengthCategory'] =
                        nameLength < 6 ? 'Short' : 'Long' + ' ' + nameLength;
                });

                return countries;
            });

        // function to create colorLegend
        const colorLegend = (selection, props) => {
            const {
                colorScale,
                circleRadius,
                spacing,
                textOffset,
                backgroundRectWidth,
            } = props;

            const backgroundRect = selection.selectAll('rect').data([null]);

            const n = colorScale.domain().length;
            backgroundRect
                .enter()
                .append('rect')
                .merge(backgroundRect)
                .attr('x', -circleRadius * 2)
                .attr('y', -circleRadius * 2)
                .attr('rx', circleRadius * 2)
                .attr('width', backgroundRectWidth)
                .attr('fill', 'white')
                .attr('height', spacing * n + circleRadius * 2);

            const groups = selection.selectAll('.tick').data(colorScale.domain());

            const groupsEnter = groups.enter().append('g').attr('class', 'tick');
            groupsEnter
                .merge(groups)
                .attr('transform', (d, i) => `translate(0, ${i * spacing})`);
            groups.exit().remove();

            groupsEnter
                .append('circle')
                .merge(groups.select('circle'))
                .attr('r', circleRadius)
                .attr('fill', colorScale);

            groupsEnter
                .append('text')
                .merge(groups.select('text'))
                .text((d) => d)
                .attr('dy', '0.32em')
                .attr('x', textOffset)
                .on('click', programmaticallyAddCountry);
        };



        loadAndProcessData().then((countries) => {
            countryDataSet = countries;

            colorScale
                .domain(countries.features.map(colorValue))
                .domain(colorScale.domain().sort().reverse())
                .range(d3.schemeSpectral[colorScale.domain().length]);
            // draw legend
            colorLegendG.call(colorLegend, {
                colorScale,
                circleRadius: 8,
                spacing: 20,
                textOffset: 15,
                backgroundRectWidth: 240,
            });
            drawAllCountries(countries);
        });

        let countryNodes = [];

        function drawAllCountries(countries) {
            // draw all countries
            countryNodes = g.selectAll('path').data(countries.features);
            countryNodes
                .enter()
                .append('path')
                .attr('d', pathGenerator)
                .attr('fill', (d) => colorScale(colorValue(d)))
                .on('mouseover', handleMouseOver)
                .on('mouseleave', handleMouseLeave)
                .on('click', handleCountryClick)
                .append('title')
                .text((d) => d.properties.name + ' : ' + colorValue(d))
                .attr('class', 'country');

            zoooom = d3.zoom()
                .scaleExtent([1, 5]) // Set the zoom extent
                .on("zoom", zoomed);

            // Attach the zoom behavior to the SVG
            svg.call(zoooom);

            // // Let the zoom take care of modifying the projection:
            // // thanks to https://stackoverflow.com/questions/62228556/reactjs-d3-how-to-zoom-in-d3-geo-world-map
            // zoom = d3.zoom()
            //   .on("zoom", function () {
            //     g.attr("transform", d3.zoomTransform(this))
            //     countryNodes.style("stroke-width", 1 / d3.zoomTransform(this).k); // update stroke width.
            //   })

            // svg.call(zoom);

            function handleCountryClick(event, d) {
                const countryPath = d3.select(this);
                //zoomInOnCountry(d);
                zoomToCountry(event, d)
                toggleCountrySelection(event, d, countryPath)



            }


        }

        // Function to handle zooming
        function zoomed(event) {
            svg.selectAll("path")
                .attr("transform", event.transform); // Apply the zoom transform to map elements
        }
        // Function to zoom to a specific country
        function zoomToCountry(event, d) {
            // Calculate the bounding box of the selected feature
            const bounds = pathGenerator.bounds(d);
            const dx = bounds[1][0] - bounds[0][0];
            const dy = bounds[1][1] - bounds[0][1];
            const x = (bounds[0][0] + bounds[1][0]) / 2;
            const y = (bounds[0][1] + bounds[1][1]) / 2;
            const scale = Math.max(1, Math.min(3, 0.9 / Math.max(dx / width, dy / height)));

            // Transition to the selected feature's position and scale
            svg.transition()
                .duration(750)
                .call(zoooom.transform, d3.zoomIdentity
                    .translate(width / 2, height / 2)
                    .scale(scale)
                    .translate(-x, -y)
                );
        }

        function zoomToScale(scale) {
            svg.transition()
                .duration(750)
                .call(zoooom.transform, d3.zoomIdentity.translate(0, 0).scale(scale));
        }


        // function zoomInOnCountry(d) {
        //   let zoomFactor = 3;
        //   // this makes the country fit in a box defined by width / zoomfactor. increase zoomfactor, box becomes smaller and scalefacor is smaller
        //   // for small countries, the zoomfactor really should be much larger - otherwise too much zooming in
        //   // note: when multiple countries are selected, the last one selected determines focus and zoom
        //   fakeProjection.fitSize([width / zoomFactor, height / zoomFactor], d);
        //   let k = fakeProjection.scale() / t0.k; // relative to initial scale.
        //   let x = fakeProjection.translate()[0] - t0.x * k + 400; // relative to initial scale.
        //   let y = fakeProjection.translate()[1] - t0.y * k + 300; // relative to initial scale.
        //   svg.call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(k));
        // }


        function getCountryNodes() {
            return g.selectAll('path').data(countryDataSet.features);
        }

        function markSelectedCountry(countryCode) {
            //countryNodes = g.selectAll('path').data(countryDataSet.features);
            getCountryNodes()
                .filter((d) => d.id === countryCode)
                .classed('selected-country', true);
        }

        function unmarkAllSelectedCountries() {
            //countryNodes = g.selectAll('path').data(countryDataSet.features);
            getCountryNodes()
                .filter((d) => selectedCountries.includes(d.id))
                .classed('selected-country', false);
        }

        function handleMouseOver(event, d) {
            // Add the hover effect on mouse over
            d3.select(this).classed('hover-country', true);
        }

        // Function to handle mouse leave
        function handleMouseLeave(event, d) {
            // Remove the hover effect on mouse leave
            d3.select(this).classed('hover-country', false);
        }


        function writeHTMLInLegend(htmlContent) {
            // Define the legend's dimensions and position
            const legendWidth = 250;
            const legendHeight = 150;
            const legendX = 1550;  // X position
            const legendY = 650;  // Y position

            // Select the SVG
            const svg = d3.select("svg");

            // Check if the legend rectangle already exists
            let legendRect = svg.select(".legend-rect");
            if (legendRect.empty()) {
                // If it doesn't exist, append it
                legendRect = svg.append("rect")
                    .attr("class", "legend-rect")
                    .attr("x", legendX)
                    .attr("y", legendY)
                    .attr("width", legendWidth)
                    .attr("height", legendHeight)
                    .attr("fill", "#f5f5f5")  // Light gray background
                    .attr("stroke", "#000");  // Black border
            }

            // Remove any existing foreignObject in the legend
            svg.select(".legend-html").remove();

            // Append the foreignObject to the SVG
            const foreign = svg.append("foreignObject")
                .attr("class", "legend-html")
                .attr("x", legendX + 5)
                .attr("y", legendY + 5)
                .attr("width", legendWidth)
                .attr("height", legendHeight);

            // Append the HTML content to the foreignObject
            foreign.append("xhtml:div")
                .style("font-family", "Arial")
                .style("font-size", "14px")
                .html(htmlContent);
        }


        function showCountryDetails(d) {
            // show the country details legend
            const myRectangle = d3.select(".legend-rect");
            myRectangle.attr("display", "block");

            writeHTMLInLegend(`<strong>${d.properties.name_long}</strong><br/>
            <ul>
                <li>Continent: ${d.properties.continent}</li>
                <li>Economy: ${d.properties.economy}</li>
                <li>Population: ${d.properties.pop_est}</li>
                </ul>
        
            `);
        }

        function hideCountryDetails() {
            // show the country details legend
            const myRectangle = d3.select(".legend-rect");
            svg.select(".legend-html").remove();
            myRectangle.attr("display", "none");

        }

        // Function to toggle country selection
        function toggleCountrySelection(event, d, countryPath) {
            //   const countryPath = d3.select(this);
            const countryCode = d.id;

            // Check if Ctrl key is pressed
            console.log(JSON.stringify(event));
            showCountryDetails(d)


            if (event.ctrlKey) {
                // Toggle selection state
                const isSelected = selectedCountries.includes(countryCode);
                if (isSelected) {
                    // Deselect the country
                    selectedCountries.splice(selectedCountries.indexOf(countryCode), 1);
                    countryPath.classed('selected-country', false);

                } else {
                    // Select the country
                    selectedCountries.push(countryCode);
                    countryPath.classed('selected-country', true);
                }
            } else {
                // If Ctrl is not pressed, clear previous selections
                unmarkAllSelectedCountries();
                selectedCountries.length = 0;
                // Select the clicked country
                selectedCountries.push(countryCode);
                countryPath.classed('selected-country', true);
            }
            if (selectedCountries.length == 0) {
                zoomToScale(1)
                hideCountryDetails()
            }
        }

        function programmaticallyAddCountry(event, d) {
            selectCountry('USA');
            // TODO implement zoom for selected countr

        }

        function selectCountry(iso3CountryCode) {
            // find iso_n3 for country in countryDataSet where iso_a3 ==  iso3CountryCode
            const country = countryDataSet.features.filter(
                (c) => c.properties['iso_a3'] == iso3CountryCode
            );
            const countryCode = country[0].properties['iso_n3'];
            const isSelected = selectedCountries.includes(countryCode);
            if (!isSelected) {
                selectedCountries.push(countryCode);
            }
            console.log(selectedCountries);
            markSelectedCountry(countryCode);
        }

    },
};

// Array to store selected countries
const selectedCountries = [];
</script>
    
<style scoped>
.sphere {
    fill: #4242e4;
}

.country {
    stroke: black;
    stroke-width: 0.05px;
}

.hover-country {
    stroke: lightblue;
    stroke-width: 1.75px;
}

.country:hover {
    /* fill: red; */
}

/* Style for selected country */
.selected-country {
    fill: purple;
}

.tick text {
    font-size: 1em;
    font-family: sans-serif;
    fill: black;
}

rect {
    opacity: .7;
}

p {
    padding-left: 10px;
}

/* CSS styles for hiding the country details box by default */
.hidden {
    display: none;
    /* Add any other styling you need */
}

/* CSS styles for positioning the box at the lower-right corner */
#country-details {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background-color: white;
    border: 1px solid #ccc;
    padding: 10px;
    /* Add any other styling you need */
}
</style>
    