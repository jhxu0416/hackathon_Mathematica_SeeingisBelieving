const numberFormat = d3.format(",");

const usChart = dc.geoChoroplethChart("#us-chart");
const usLine = dc.lineChart("#line-chart");
const usTable = dc.dataTable("#data-table");

d3.csv("../data/per_stats_clean.csv").then(function(csv) {
  const data = crossfilter(csv);
  const all = data.groupAll();

  let states = data.dimension(function(d) {
    return d["state"];
  });

  let years = data.dimension(function(d) {
    return d["year"];
  });

  function reduceAddAvg(attr) {
    return function(p, v) {
      ++p.count;
      p.sum += parseFloat(v[attr]);
      p.avg = p.count ? p.sum / p.count : 0;
      return p;
    };
  }
  function reduceRemoveAvg(attr) {
    return function(p, v) {
      --p.count;
      p.sum -= parseFloat(v[attr]);
      p.avg = p.count ? p.sum / p.count : 0;
      return p;
    };
  }
  function reduceInitAvg() {
    return { count: 0, sum: 0, avg: 0 };
  }

  let stateRateAvg = states
    .group()
    .reduce(
      reduceAddAvg("per_total"),
      reduceRemoveAvg("per_total"),
      reduceInitAvg
    );

  d3.json("geo/us-states.json").then(function(statesJson) {
    usChart
      .width(900)
      .height(550)
      .dimension(states)
      .group(stateRateAvg)
      .colors(
        d3
          .scaleQuantize()
          .range([
            "#E2F2FF",
            "#C4E4FF",
            "#9ED2FF",
            "#81C5FF",
            "#6BBAFF",
            "#51AEFF",
            "#36A2FF",
            "#1E96FF",
            "#0089FF",
            "#0061B5"
          ])
      )
      .colorDomain([0, 5000000])
      .colorCalculator(function(d) {
        return d ? usChart.colors()(d) : "#ccc";
      })
      .overlayGeoJson(statesJson.features, "state", function(d) {
        return d.properties.name;
      })
      .projection(d3.geoAlbersUsa())
      .valueAccessor(function(kv) {
        return kv.value.avg;
      })
      .title(function(d) {
        return (
          "State: " +
          d.key +
          "\nCount of SNAP Households: " +
          numberFormat(d.value ? parseInt(d.value) : 0)
        );
      });

    let yearAvg = years
      .group()
      .reduce(
        reduceAddAvg("per_total_fail_pctoftotal"),
        reduceRemoveAvg("per_total_fail_pctoftotal"),
        reduceInitAvg
      );

    // Line chart
    usLine
      .width(400)
      .height(300)
      .margins({ top: 20, right: 20, bottom: 20, left: 100 })
      .dimension(years)
      .group(yearAvg)
      .valueAccessor(function(d) {
        //console.log(d);
        return d.value.avg;
      })
      .x(d3.scaleLinear().domain([2014, 2018]))
      .y(d3.scaleLinear().domain([0, 12]))
      //.elasticY(true)
      .brushOn(true);

    usLine
      .xAxis()
      .ticks(5)
      .tickFormat(d3.format("d"));
    usLine.yAxis().tickFormat(d => d + "%");

    // data table
    usTable
      .dimension(years)
      .group(function(d) {
        return d.year;
      })
      .size(9)
      .columns([
        "year",
        {
          label: "Participants in SNAP households ",
          format: function(d) {
            return numberFormat(d.per_total);
          }
        },
        {
          label: "Participants in SNAP households with children ",
          format: function(d) {
            return numberFormat(d.per_hhkid);
          }
        },
        {
          label: "Participants in SNAP households without children ",
          format: function(d) {
            return numberFormat(d.per_hhnokid);
          }
        },
        {
          label: "Percent of participants fail the federal income test",
          format: function(d) {
            return numberFormat(d.per_total_fail_pctoftotal) + "%";
          }
        },
        "state"
      ])
      .sortBy(function(d) {
        d.per_total;
      })
      .order(d3.descending);

    dc.renderAll();

    addSelection();
  });
});

let addSelection = function() {
  resetNode = document.createElement("a");
  resetNode.innerHTML = "Reset";
  resetNode.className = "reset";
  resetNode.href = "javascript:usChart.filterAll();dc.redrawAll();";
  resetNode.style = "display: none;";

  selectedNode = document.createElement("span");
  selectedNode.innerHTML = " Selected states: ";
  selectedNode.className = "reset";
  selectedNode.href = "javascript:usChart.filterAll();dc.redrawAll();";
  selectedNode.style = "display: none;";

  filterNode = document.createElement("span");
  filterNode.className = "filter";

  selectedNode.appendChild(filterNode);

  selectionNode = document.querySelector("#us-chart");
  selectionNode.appendChild(document.createElement("br"));
  selectionNode.appendChild(resetNode);
  selectionNode.appendChild(selectedNode);
};
