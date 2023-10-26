<template>
    <div id="mapcontainer"></div>
    <div id="country-details" class="hidden">
        <!-- Country details will be displayed here -->

    </div>
    {{ propertyToDisplay }}
</template>
    
<script>
import * as d3 from 'd3';
import * as topojson from 'topojson';
import { geoAlbers, geoEquirectangular, geoEqualEarth } from 'd3-geo';
import { scaleSequential } from 'd3-scale';
import { useCollaborationStore } from '../stores/collaborationStore';

import { ref, watch, getCurrentInstance } from 'vue';

let svg, g, countryDataSet;

const countryDetailsBox = document.getElementById("country-details");

let thePropertyToDisplay
let findCollaboratingCountries
export default {
    name: 'WorldMap',
    setup(props, emit) {
        const collaborationStore = useCollaborationStore();
        findCollaboratingCountries = collaborationStore.findCollaboratingCountries
        const heatmapData = collaborationStore.heatmapDataSet
        const emitCountryClicked = (countryRecord) => {
            emit('country-clicked', countryRecord);
        };
        //   const propertyToDisplay = ref('Mitigation_Potential(GtCO2e)')
        const propertyToDisplay = ref('Mitigation_Cost($/GtCO2e)')
        
        console.log(`setup prop ${propertyToDisplay.value}`)
        watch(propertyToDisplay, (newValue) => {
            console.log(`${newValue} new value for property`)
        });

        return { collaborationStore, heatmapData, propertyToDisplay }
    },

    props: {
        countries: Array,
        preSelectedCountries: Array
    },
    emits: ['country-clicked'],

    mounted() {
        console.log(`mounted prop heatmap ${this.heatmapData}`)
        console.log(`mounted prop ${this.propertyToDisplay}`)
        thePropertyToDisplay = ref(this.propertyToDisplay)
        watch(thePropertyToDisplay, (newValue) => {
            // WHAT SHOULD HAPPEN WHEN THE TOGGLEBOX IS UPDATED?
            // redefine colorScale2
            // redraw countries
            // redefine color legend

            colorScale2 = createColorScaleForHeatmapProperty(this.heatmapData, thePropertyToDisplay.value)
            yAxisScale = createYAxisScaleForHeatmapProperty(this.heatmapData, thePropertyToDisplay.value)

            drawAllCountries(countryDataSet);
            console.log(`${newValue} new value for property`)
            //drawHeatmapLegend()
            drawVerticalAxis();
        });

        // Watch for changes in the property preSelectedCountries coming from outside the component
        watch(() => this.preSelectedCountries, (newValue, oldValue) => {
            if (this.preSelectedCountries.length > 0) {
                selectedCountries.length =0
                for (let i = 0; i < this.preSelectedCountries.length; i++) {
                    selectedCountries.push(findIsoN3CountryCodeforIsoA2(this.preSelectedCountries[i]));
                }
            }
            console.log(`selected countries ${JSON.stringify(selectedCountries)}`)
            // undo marking of previously selected countries
            unmarkAllSelectedCountries();
            synchronizeCurrentCollaborationCandidatesWithCurrentlySelectedCountries()
            highlightCollaborationCandidates()
            zoomInOnSelectedCountries()          
        });

        const width = 1650,
            height = 950;
        const t0 = { k: width / 2 / Math.PI, x: width / 2, y: height / 2 };
        const toggleBoxCoordinates = { x: -10, y: 170, height: 130, width: 250 }
        svg = d3
            .select('#mapcontainer')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('preserveAspectRatio', 'xMinYMin');



        const projection = d3.geoEquirectangular()
            .rotate([-148, 0]) // rotate sets the spherical rotation angles. The default rotation is [0, 0], which centers the map on Greenwich (0° longitude). By adjusting the first value (longitude), you can center the map on a different region.
            .translate([t0.x, t0.y]).scale(t0.k);

        const pathGenerator = d3.geoPath().projection(projection);
        let zoooom;

        g = svg.append('g');

        // const colorLegendG = svg
        //     .append('g')
        //     .attr('transform', `translate(40,310)`);

        const heatmapLegendG = svg
            .append('g')
            .attr('transform', `translate(-10,470)`);

        const toggleBoxG = svg
            .append('g')
            .attr('transform', `translate(${toggleBoxCoordinates.x},${toggleBoxCoordinates.y})`);

        // // show a box with country details  
        // const countryLegendG = svg
        //     .append('g')
        //     .attr('transform', `translate(1450,610)`);

        g.append('path')
            .attr('class', 'sphere')
            .attr('d', pathGenerator({ type: 'Sphere' }));

        let colorScale2, yAxisScale


        function findMinMax(collection, theProperty) {
            const values = collection.map(item => item[theProperty]);
            return {
                min: Math.min(...values),
                max: Math.max(...values)
            };
        }
        function createColorScaleForHeatmapProperty(heatmapData, property) {
            const result = findMinMax(heatmapData, property)
            return scaleSequential(d3.interpolateBlues)
                .domain([result.min, result.max]);
        }
        colorScale2 = createColorScaleForHeatmapProperty(this.heatmapData, thePropertyToDisplay.value)


        function createYAxisScaleForHeatmapProperty(heatmapData, property) {
            const result = findMinMax(heatmapData, property)
            return d3.scaleLinear()
                .domain([result.min, result.max])
                .range([300, 0]);  // Adjust the range to match the desired height of your axis 

        }

        yAxisScale = createYAxisScaleForHeatmapProperty(this.heatmapData, thePropertyToDisplay.value)

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

                    countryN3toA2Map[d.id] = d.properties.iso_a2
                    countryA2toN3Map[d.properties.iso_a2] = d.id

                    // using the ISo2 country code (iso_a2), check heatmapData array for an object with the right COUnTRY property value  
                    const countryCode = d.properties.iso_a2
                    this.heatmapData.filter(h => h["Country"] == countryCode).forEach((c) => {
                        // copy properties from c to d.properties
                        for (let key in c) {
                            if (key !== "Country") {
                                d.properties[key] = c[key];
                            }
                        }
                        // set the property in_heatmap to true to indicate that there is heatmap data for this country 
                        d.properties['in_heatmap'] = true
                    })

                    // todo - these properties are added in a not very efficient way
                    // "Mitigation_Potential(GtCO2e)":"234","Mitigation_Cost($/GtCO2e)":"5","Mitigation_Potential(GtCO2e)_at_50":"234","Mitigation_Potential(GtCO2e)_at_100":"250","Mitigation_Potential(GtCO2e)_at_200":"300"}
                });

                return countries;
            });

        const heatmapLegend = (selection, props) => {
            const {
                spacing,
                textOffset,
                backgroundRectWidth,
            } = props;

            const backgroundRect = selection.selectAll('rect').data([null]);

            backgroundRect
                .enter()
                .append('rect')
                .merge(backgroundRect)
                .attr('x', 10 * 2)
                .attr('y', 10 * 2)
                .attr('rx', 10 * 2)
                .attr('width', backgroundRectWidth)
                .attr('fill', 'white')
                .attr('height', 350);

        };

        const toggleBox = (selection, props) => {
            const {
                spacing,
                textOffset,
                backgroundRectWidth,
            } = props;

            const backgroundRect = selection.selectAll('rect').data([null]);

            backgroundRect
                .enter()
                .append('rect')
                .merge(backgroundRect)
                .attr('x', 10 * 2)
                .attr('y', 10 * 2)
                .attr('rx', 10 * 2)
                .attr('width', toggleBoxCoordinates.width)
                .attr('fill', 'white')
                .attr('height', toggleBoxCoordinates.height);

            // Remove any existing foreignObject in the legend
            svg.select(".togglebox-html").remove();

            // Append the foreignObject to the SVG
            const foreign = svg.append("foreignObject")
                .attr("class", "togglebox-html")
                .attr("x", toggleBoxCoordinates.x + 30)
                .attr("y", toggleBoxCoordinates.y + 35)
                .attr("width", toggleBoxCoordinates.width - 20)
                .attr("height", toggleBoxCoordinates.height - 20);

            const foDiv = foreign.append('xhtml:div')
                .style("font-family", "Arial")
                .style("font-size", "12px");

            // Add radio buttons for five colors
            const colors = ['Mitigation_Potential(GtCO2e)', 'Mitigation_Cost($/GtCO2e)', 'Mitigation_Potential(GtCO2e)_at_50', 'Mitigation_Potential(GtCO2e)_at_100', 'Mitigation_Potential(GtCO2e)_at_200'];
            colors.forEach((color, i) => {
                const input = foDiv.append('xhtml:input')
                    .attr('type', 'radio')
                    .attr('name', 'colorChoice')
                    .attr('value', color)
                    .attr('id', `color_${color}`)
                    .on('change', function () {
                        thePropertyToDisplay.value = this.value;

                    });
                if (color === thePropertyToDisplay.value) {
                    input.attr('checked', true);
                }

                foDiv.append('xhtml:label')
                    .attr('for', `color_${color}`)
                    .text(color)
                    .append('xhtml:br');
            });

        };

        loadAndProcessData().then((countries) => {
            countryDataSet = countries;
            // "Mitigation_Potential(GtCO2e)":"234","Mitigation_Cost($/GtCO2e)":"5","Mitigation_Potential(GtCO2e)_at_50":"234","Mitigation_Potential(GtCO2e)_at_100":"250","Mitigation_Potential(GtCO2e)_at_200":"300"}
            // now we can determine - depending on the toggle that indicates which category of these data properties should be used for the heatmap
            // the color scale - get min and max for the desired property from the heatmap data


            heatmapLegendG.call(heatmapLegend, {
                spacing: 20,
                textOffset: 15,
                backgroundRectWidth: 100,
            });
            toggleBoxG.call(toggleBox, {
                spacing: 20,
                textOffset: 15,
                backgroundRectWidth: 200,
            });
            drawHeatmapLegend()
            drawAllCountries(countries);
            if (this.preSelectedCountries.length > 0) {
                for (let i = 0; i < this.preSelectedCountries.length; i++) {
                    selectedCountries.push(findIsoN3CountryCodeforIsoA2(this.preSelectedCountries[i]));
                }

            }
            synchronizeCurrentCollaborationCandidatesWithCurrentlySelectedCountries()
            highlightCollaborationCandidates()
            zoomInOnSelectedCountries()
            // if (selectedCountries.length > 0) {
            //     console.log(`after drawing all countries let 's mark  each and zoom in on the combination'`)

            //     var minX = Number.POSITIVE_INFINITY;
            //     var minY = Number.POSITIVE_INFINITY;
            //     var maxX = Number.NEGATIVE_INFINITY;
            //     var maxY = Number.NEGATIVE_INFINITY;
            //     selectedCountries.forEach((c) => {
            //         markSelectedCountry(c)
            //         var selectedCountryGeoJSON = countryDataSet.features.filter((d) => d.id == c)

            //         // Calculate zoom parameters
            //         //                var bounds = d3.geoBounds(selectedCountryGeoJSON[0]);
            //         const bounds = pathGenerator.bounds(selectedCountryGeoJSON[0]);
            //         minX = Math.min(minX, bounds[0][0]);
            //         minY = Math.min(minY, bounds[0][1]);
            //         maxX = Math.max(maxX, bounds[1][0]);
            //         maxY = Math.max(maxY, bounds[1][1]);
            //     })


            //     const dx = maxX - minX;
            //         const dy = maxY - minY;
            //         const x = (minX + maxX) / 2;
            //         const y = (minY + maxY) / 2;
            //         const scale = Math.max(1, Math.min(3, 0.9 / Math.max(dx / width, dy / height)));

            //         // Transition to the selected feature's position and scale
            //         svg.transition()
            //             .duration(750)
            //             .call(zoooom.transform, d3.zoomIdentity
            //                 .translate(width / 2, height / 2)
            //                 .scale(scale)
            //                 .translate(-x, -y)
            //             );


            // }


        });

        let countryNodes = [];


        function zoomInOnSelectedCountries() {
            if (selectedCountries.length > 0) {
                console.log(`after drawing all countries let 's mark  each and zoom in on the combination'`)

                var minX = Number.POSITIVE_INFINITY;
                var minY = Number.POSITIVE_INFINITY;
                var maxX = Number.NEGATIVE_INFINITY;
                var maxY = Number.NEGATIVE_INFINITY;
                selectedCountries.forEach((c) => {
                    markSelectedCountry(c)
                    var selectedCountryGeoJSON = countryDataSet.features.filter((d) => d.id == c)

                    // Calculate zoom parameters
                    //                var bounds = d3.geoBounds(selectedCountryGeoJSON[0]);
                    const bounds = pathGenerator.bounds(selectedCountryGeoJSON[0]);
                    minX = Math.min(minX, bounds[0][0]);
                    minY = Math.min(minY, bounds[0][1]);
                    maxX = Math.max(maxX, bounds[1][0]);
                    maxY = Math.max(maxY, bounds[1][1]);
                })


                const dx = maxX - minX;
                const dy = maxY - minY;
                const x = (minX + maxX) / 2;
                const y = (minY + maxY) / 2;
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

        }

        function drawHeatmapLegend() {

            // Define gradient
            const gradient = svg.append("defs")
                .append("linearGradient")
                .attr("id", "gradient")
                .attr("x1", "0%")
                .attr("x2", "0%")
                .attr("y1", "100%")
                .attr("y2", "0%");

            // Define stops for the gradient based on the color scale
            for (let i = 0; i <= 1; i += 0.1) {
                gradient.append("stop")
                    .attr("offset", `${i * 100}%`)
                    .attr("stop-color", d3.interpolateBlues(i));
            }

            // Add rectangle with gradient fill
            svg.append("rect")
                .attr("x", 40)
                .attr("y", 10)
                .attr("width", 30)
                .attr("height", 300)
                .style("fill", "url(#gradient)")
                .attr("transform", "translate(0, 500)")


            // Draw the vertical axis using the scaleLinear
            drawVerticalAxis();

        }
        function removeElementIfExists(id) {

            const existing = svg.select(`#${id}`);
            if (!existing.empty()) {
                existing.remove();
            }
        }

        function drawVerticalAxis() {
            const yAxis = d3.axisRight(yAxisScale)
                .ticks(5);

            removeElementIfExists("legend-axis")

            svg.append('g')
                .attr("id", "legend-axis")
                .attr('transform', 'translate(75, 510) scale(1)') // Position the axis; adjust as needed
                .call(yAxis);
            removeElementIfExists("legend-axis-title")
            svg.append("text")
                .attr("id", "legend-axis-title")
                .attr("transform", "rotate(-90)") // Rotate the text for vertical axis
                .attr("y", 10) // Position it 40 pixels to the left of the axis
                .attr("x", -640) // Position it at the middle of the axis
                .attr("dy", "1em") // Adjustments for positioning
                .style("text-anchor", "middle") // Center the text
                .text(thePropertyToDisplay.value);
        }

        function drawAllCountries(countries) {
            // draw all countries
            countryNodes = g.selectAll('path').data(countries.features);
            countryNodes
                // fill with gray (#dcdcdc) when the country's data is unknown
                .attr('fill', d => d.properties.hasOwnProperty(thePropertyToDisplay.value) ? colorScale2(d.properties[thePropertyToDisplay.value]) : '#dcdcdc')
                .select("title")  // Select the child title of each path
                .text((d) => d.properties.name + ' : ' + (d.properties.hasOwnProperty(thePropertyToDisplay.value) ? d.properties[thePropertyToDisplay.value] + ` ${thePropertyToDisplay.value}` : ''))


            countryNodes
                .enter()
                .append('path')
                .attr('d', pathGenerator)
                // fill with gray (#dcdcdc) when the country's data is unknown
                .attr('fill', d => d.properties.hasOwnProperty(thePropertyToDisplay.value) ? colorScale2(d.properties[thePropertyToDisplay.value]) : '#dcdcdc')
                .on('mouseover', handleMouseOver)
                .on('mouseleave', handleMouseLeave)
                .on('click', handleCountryClick)
                .append('title')
                .text((d) => d.properties.name + ' : ' + (d.properties.hasOwnProperty(thePropertyToDisplay.value) ? d.properties[thePropertyToDisplay.value] + ` ${thePropertyToDisplay.value}` : ''))
                .attr('class', 'country');

            zoooom = d3.zoom()
                .scaleExtent([1, 5]) // Set the zoom extent
                .on("zoom", zoomed);

            // Attach the zoom behavior to the SVG
            svg.call(zoooom);


            function handleCountryClick(event, d) {
                // TODO only respond to click if
                // - the country is a collaboration candidate in case of already one or more country selected
                // - the country is in the initial MVP dataset in case of no countries selected yet
                if (!d.properties['in_heatmap']) return;

                const countryPath = d3.select(this);

                //zoomInOnCountry(d);
                zoomToCountry(event, d)
                toggleCountrySelection(event, d, countryPath)

            }

        }



        // Function to handle zooming
        // zooming applies to all paths in a specific group - that includes countries but not legend etc
        function zoomed(event) {
            g.selectAll("path")
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

        function getCountryNodes() {
            return g.selectAll('path').data(countryDataSet.features);
        }

        function markSelectedCountry(countryCode) {
            //countryNodes = g.selectAll('path').data(countryDataSet.features);
            getCountryNodes()
                .filter((d) => d.id === countryCode)
                .classed('selected-country', true);
        }

        function synchronizeCurrentCollaborationCandidatesWithCurrentlySelectedCountries() {
            const currentlySelectedCountries = []
            selectedCountries.forEach((c) => { currentlySelectedCountries.push(countryN3toA2Map[c]) })
            // invoke function on store:  
            const collaborationCandidates = findCollaboratingCountries(currentlySelectedCountries)
            // for each country in function result, set class collaboration-candidate to true
            collaborationCandidatesForSelectedCountries.length = 0;
            collaborationCandidates.forEach((c) => { collaborationCandidatesForSelectedCountries.push(countryA2toN3Map[c]) })
            console.log(`current collaboration candidates ${JSON.stringify(collaborationCandidatesForSelectedCountries)}`)
        }

        function highlightCollaborationCandidates() {
            // unhighlight all currently highlighted collaboration candidates
            getCountryNodes()
                .classed('collaboration-candidate', false);

            // given the the currently selected countries in selectedCountries
            // find the collaboration candidates and highlight each of them;
            if (selectedCountries.length > 0) {
                getCountryNodes()
                    .filter((d) => collaborationCandidatesForSelectedCountries.includes(d.id))
                    .classed('collaboration-candidate', true);
            }
        }


        function unmarkAllSelectedCountries() {
            //countryNodes = g.selectAll('path').data(countryDataSet.features);
            getCountryNodes()
                                .classed('selected-country', false);
        }

        function handleMouseOver(event, d) {
            // Add the hover effect on mouse over`
            // TODO but only for countries that can be selected
            if (!d.properties['in_heatmap']) return;
            // QUESTION: if one or more countries are selected and this country is not a collaboration candidate, then it has no hover effect
            // if (selectedCountries.length > 0 && !(collaborationCandidatesForSelectedCountries.includes(d.id))) return;

            d3.select(this).classed('hover-country', true);
        }

        // Function to handle mouse leave
        function handleMouseLeave(event, d) {
            // Remove the hover effect on mouse leave
            d3.select(this).classed('hover-country', false);
        }


        function writeHTMLInLegend(htmlContent) {
            // Define the legend's dimensions and position
            const legendWidth = 370;
            const legendHeight = 180;
            const legendX = 1450;  // X position
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
                <li>Mitigation_Potential(GtCO2e): ${d.properties["Mitigation_Potential(GtCO2e)"]}</li>
                <li>Mitigation_Cost($/GtCO2e): ${d.properties["Mitigation_Cost($/GtCO2e)"]}</li>
                <hr/>
                <li>Mitigation_Potential(GtCO2e) at 50: ${d.properties["Mitigation_Potential(GtCO2e)_at_50"]}</li>
                <li>Mitigation_Potential(GtCO2e) at 100: ${d.properties["Mitigation_Potential(GtCO2e)_at_100"]}</li>
                <li>Mitigation_Potential(GtCO2e) at 200: ${d.properties["Mitigation_Potential(GtCO2e)_at_200"]}</li>
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
            const countryCode = d.id;
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
            } else {
                zoomInOnSelectedCountries()
            }
            synchronizeCurrentCollaborationCandidatesWithCurrentlySelectedCountries()
            highlightCollaborationCandidates()
            console.log(`selected countries = ${JSON.stringify(selectedCountries)}`);
        }

        function programmaticallyAddCountry(event, d) {
            selectCountry('USA');
            // TODO implement zoom for selected countr

        }

        function selectUSAHandler() {
            selectCountry('USA');

        }

        function findIsoN3CountryCodeforIsoA2(iso_a2CountryCode) {
            const country = countryDataSet.features.filter(
                (c) => c.properties['iso_a2'] == iso_a2CountryCode
            );
            // TODO handle no country was found (country is an empty array)
            const iso_n3_countryCode = country[0].properties['iso_n3'];
            return iso_n3_countryCode;
        }

        function selectCountry(iso_a3CountryCode) {
            // find iso_n3 for country in countryDataSet where iso_a3 ==  iso3CountryCode
            const country = countryDataSet.features.filter(
                (c) => c.properties['iso_a3'] == iso_a3CountryCode
            );
            const iso_n3_countryCode = country[0].properties['iso_n3'];
            const isSelected = selectedCountries.includes(iso_n3_countryCode);
            if (!isSelected) {
                selectedCountries.push(iso_n3_countryCode);
            }
            console.log(selectedCountries);
            markSelectedCountry(iso_n3_countryCode);
        }

    },
    methods: {
        selectUSAHandler(event) {
            console.log('now???')
            selectCountry('USA');
        }
    }
};

// Array to store selected countries
const selectedCountries = [];
const collaborationCandidatesForSelectedCountries = [];

const countryN3toA2Map = {};
const countryA2toN3Map = {};


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

.collaboration-candidate {
    fill: orange;

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
    