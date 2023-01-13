function trapezoid(xstart, xend, ytop, ybottom) {
	// var width = scale.range()[1] - scale.range()[0];
	var svg = d3.select("#zoom");
	var margin = 20;		// For bottom of trapezoid.
	var base_x = [margin, +svg.attr("width") - margin];
	svg.selectAll(".trap").remove();
	svg.append("path")
	.attr("class", "trap")
	.attr("d",
		  "M" + xstart + "," + ytop +
		  "L" + xend + "," + ytop +
		  "L" + base_x[1] + "," + ybottom +
		  "L" + base_x[0] + "," + ybottom +
		  "L" + xstart + ytop)
	.style("fill", "#777")
	.style("fill-opacity", "0.3")
	.exit().remove();
}

function brushed(elem, scale, height, full_height) {
	// Don't run this on initial load, and prevent recursion due
	// to integer snapping:
	if (!d3.event.sourceEvent || d3.event.sourceEvent.type == "brush") {
		return;
	}
	
	var tmp = d3.event.selection.map(scale.invert);
	var span = tmp.map(Math.round);
	if (span[0] == span[1]) {	// Span is one position.
		span[0] = Math.floor(tmp[0]);
		span[1] = span[0] + 1;
	}

	// var svg = d3.select(elem);
	// var width = +svg.attr("width");
	d3.select(elem)
		.call(d3.event.target.move, [scale(span[0]), scale(span[1])]);
	trapezoid(scale(span[0]), scale(span[1]), height, full_height);

	currentSpan = [span[0], span[1] - 1];
	drawMap();
}

function drawZoomPlot() {
	data = zoomData;
	var posMax = d3.max(data, d => d.pos);

	var svg = d3.select("#zoom");
	svg.selectAll("*").remove();
	var width = +svg.attr("width");
	var full_height = +svg.attr("height");
	var height = 40;
	var margin = 30; // Thinner than map so trapezoid is recognizable.
	var g = svg.append("g");
	var x = d3.scaleLinear()
		.domain([1, posMax + 1])
		.range([margin, width - margin]);
	// Include 0 in extent since bars always start at 0:
	var extent = d3.extent(data, d => d[currentData]);
	extent = [Math.min(0, extent[0]), Math.max(0, extent[1])];
	var y = d3.scaleLinear()
		.domain(extent)
		.range([15 + height, 15]);
	console.log(y.domain(), y.range(), y(0));
	
	var barWidth = (x.range()[1] - x.range()[0]) / posMax;

	var brush = d3.brushX()
		.extent([[x.range()[0], 15], [x.range()[1], 15 + height]])
		.handleSize(40)
		.on("brush", function() { brushed(this, x, 15 + height, full_height); });

	g.selectAll(".bar")
		.data(data)
		.join(
			enter => enter
				.append("rect")
				.attr("class", "bar")
				.attr("x", d => x(d.pos))
				.attr("width", barWidth)
		)
		// Positive values are drawn from value to 0:
		.attr("y", d => y(Math.max(0, d[currentData])))
		.attr("height", d => Math.abs(y(d[currentData]) - y(0)));

	svg.append("g")
		.call(brush)
		// .call(brush.move, [x(1), x(initSpan + 1)])
		// Keep current window when changing data:
		.call(brush.move, [x(currentSpan[0]), x(currentSpan[1] + 1)])
		.selectAll(".overlay").remove(); // Prevent click-drag redefine

	// trapezoid(x(1), x(initSpan + 1), 15 + height, full_height);
	trapezoid(x(currentSpan[0]), x(currentSpan[1] + 1), 15 + height, full_height);

	svg.append("text")
		.html('Mean value per protein position (zoom window is draggable and resizable):')
		.attr("x", margin)
		// .attr("y", height + 20)
		.attr("y", 12)
		.attr("font-size", "12px");

	svg.append("text")
		.text("Fitness impact scores for each possible substitution (column AA → row AA) in the selected window:")
		.attr("x", margin)
		.attr("y", 15 + height + 35)
		.attr("font-size", "12px");
}

function drawMap() {
	var posMin = currentSpan[0];
	var posMax = currentSpan[1];
	data = mapData.filter(d => d.pos >= posMin && d.pos <= posMax);

	var svg = d3.select("#map");
	var width = +svg.attr("width");
	var height = +svg.attr("height");
	var marginSides = 20;	// Space for labels.
	var marginBottom = 30;	// Space for pos axis.
	var marginTop = 12;		// Space for WT AAs.
	
	var x = d3.scaleBand()
		.domain(d3.range(posMin, posMax + 1))
		.range([marginSides, width - marginSides]);
	var y = d3.scaleBand()
		.domain(AAs)
		.range([marginTop, height - marginBottom]);

	var tip = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-5, 0])
		.html(function(d) {
			var value = Math.round(d[currentData] * 100) / 100;
			var lab = d.WT + d.pos + d.var + ': ' + value;
			return lab;
		});
	
	svg.selectAll(".tile")
		.data(data)
		.join(
			enter => enter
				.append("rect")
				.attr("class", "tile")
				.call(hover_WTvar)
				.call(tip)
				.on('mouseover', tip.show)
				.on('mouseout', tip.hide)
		)
		.attr("width", x.bandwidth())
		.attr("height", y.bandwidth())
		.style("fill", d => mapCol[currentData](d[currentData]))
		.attr("x", d => x(d.pos))
		.attr("y", d => y(d.var));

	svg.selectAll(".varlabel1")
		.data(AAs)
		.enter().append("text")
		.attr("class", "varlabel1")
		.attr("x", 10)
		.attr("y", d => y(d) + y.bandwidth() / 2)
		.attr("text-anchor", "middle")
			.attr("dominant-baseline", "central")
			.style("font-size", (y.bandwidth()) + "px")
			.text(d => d)
		.append("title")	// Tooltips
		.text(d => AA_names[d]);

	svg.selectAll(".varlabel2")
		.data(AAs)
		.enter().append("text")
		.attr("class", "varlabel2")
		.attr("x", width - 10)
		.attr("y", d => y(d) + y.bandwidth() / 2)
		.attr("text-anchor", "middle")
		.attr("dominant-baseline", "central")
		.style("font-size", (y.bandwidth()) + "px")
		.text(d => d)
		.append("title")	// Tooltips
		.text(d => AA_names[d]);

	var axis = d3.axisBottom(x)
		.tickValues(x.domain().filter(d => !(d % 10)))
		.tickSize(3);

	svg.selectAll(".posAxis").remove();
	svg.append("g")
		.attr("class", "posAxis")
		.attr("transform", "translate(0," + (height - marginBottom) + ")")
		.call(axis)
		.select(".domain")
		.attr("stroke", "none");

	if (x.bandwidth() > 8) {
	svg.selectAll(".WTlabel")
		// .attr("class", "WTlabels")
		.data(x.domain())
		// .enter().append("text")
		.join(
			enter => enter
				.append("text")
				.attr("class", "WTlabel")
		)
		.attr("x", d => x(d) + x.bandwidth() / 2)
		.attr("y", marginTop / 2)
		.attr("text-anchor", "middle")
			.attr("dominant-baseline", "central")
			.style("font-size", (y.bandwidth()) + "px")
		.text(d => WTs[d])
		.append("title")
		.text(d => AA_names[WTs[d]]);
	} else {
		svg.selectAll(".WTlabel")
			.text("");
	}
}

function drawScale() {
	var svg = d3.select("#colorscale");
	var width = +svg.attr("width");
	var height = +svg.attr("height");

	var domain = mapCol[currentData].domain();
	var interp = d3.interpolateNumber(domain[0], domain[1]);
	// var values = d3.ticks(domain[0], domain[1], count=9);
	var values = d3.range(0, 1.01, step=0.1).map(interp);

	var x = d3.scaleBand()
		.domain(values)
		.range([30, width - 140]);

	svg.selectAll(".legendBox").remove();
	svg.selectAll(".legendBox")
		.data(values)
		.enter().append("rect")
		.attr("class", "legendBox")
		.attr("x", d => x(d))
		.attr("y", 0)
		.attr("width", x.bandwidth())
		.attr("height", x.bandwidth())
		.attr("fill", d => mapCol[currentData](d));

	svg.selectAll(".scaleLabel").remove();
	svg.selectAll(".scaleLabel")
		.data([values[0], values[5], values[10]])
		.enter().append("text")
		.attr("class", "scaleLabel")
		.text(d => d3.format(".2~r")(d))
		.attr("x", d => x(d) + 0.5 * x.bandwidth())
		.attr("y", x.bandwidth() + 16)
		.attr("text-anchor", "middle");

	svg.selectAll(".scaleTitle").remove()
	svg.append("text")
		// .data([currentData])
		// .remove()
		// .enter().append("text")
		// .append("text")
		.attr("class", "scaleTitle")
		.text(dataTypes[currentData])
		// .text(d => dataTypes[d])
		.attr("x", width - 130)
		.attr("y", 0.5 * x.bandwidth())
		.attr("dominant-baseline", "central");
		// .append("tspan")
		// .text(" ⓘ")
		// .attr("fill", "#888888")
		// .append("title")
		// .text("explanation");
}

function hover_WTvar(selection) {
	return selection
		.on("mouseover.wtvar", function(d) {
			// d3.selectAll(".highlight")
			//	 .filter(e => e.WT == d.WT && e.var == d.var)
			//	 .attr("visibility", "visible");
			d3.selectAll(".bar")
			.style("fill", "black")
			.filter(e => e.pos == d.pos)
			.style("fill", "red");
		})
		.on("mouseout.wtvar", function(d) {
			// d3.selectAll(".highlight")
			//	 .filter(e => e.WT == d.WT && e.var == d.var)
			//	 .attr("visibility", "hidden");
			d3.selectAll(".bar")
			.filter(e => e.pos == d.pos)
			.style("fill", "black");
		});
}

function pos_averages(data) {
	// Average pos, WT, var, score to pos, WT, score.
	var max = d3.max(data.map(d => d.pos));
	var WTs = d3.range(max).map(x => '');
	var values_score = d3.range(max).map(x => []);
	var values_entropy = d3.range(max).map(x => []);
	var values_log2f_var = d3.range(max).map(x => []);
	var values_matrix = d3.range(max).map(x => []);
	data.forEach(function(d) {
		WTs[d.pos - 1] = d.WT;
		values_score[d.pos - 1].push(d.score);
		values_entropy[d.pos - 1].push(d.entropy);
		values_log2f_var[d.pos - 1].push(d.log2f_var);
		values_matrix[d.pos - 1].push(d.matrix);
	});
	var data_pos = d3.range(max).map(function(i) {
		return {
			pos: i + 1,
			WT: WTs[i],
			score: d3.mean(values_score[i]),
			entropy: d3.mean(values_entropy[i]),
			log2f_var: d3.mean(values_log2f_var[i]),
			matrix: d3.mean(values_matrix[i])
		};
	});
	return data_pos;
}

function WT_AAs(data) {
	WT = {};
	data.forEach(function(d) {
		WT[d.pos] = d.WT;
	});
	return WT;
}

function getVarDataDrawPlot(id) {
	d3.tsv("https://demask.net/api/scoresets/" + id, function(d) {
		d.pos = +d.pos;
		d.score = +d.score;
		d.entropy = +d.entropy;
		d.log2f_var = +d.log2f_var;
		d.matrix = +d.matrix;
		return d;
	}).then(function(data) {
		// Save data globally, and subset for zoomed map plot:
		mapData = data;
		WTs = WT_AAs(data);
		mapCol = {
			score: d3.scaleSequential(d3.interpolateRdBu)
				.domain(symExtent(data, d => d.score)),
			entropy: d3.scaleSequential(d3.interpolateGreens)
				.domain([0, Math.log2(20)]),
			log2f_var: d3.scaleSequential(d3.interpolatePurples)
				.domain([d3.min(data, d => d.log2f_var), 0]),
			matrix: d3.scaleSequential(d3.interpolateOranges)
				.domain([d3.min(data, d => d.matrix), 0])
		};
		// Reverse score color scale to make blue low and red high (heatmap style):
		var interp = mapCol.score.interpolator();
		mapCol.score.interpolator(t => interp(1 - t));
		// Reverse other color scales so darker corresponds to low fitness variant.
		var interp2 = mapCol.entropy.interpolator();
		mapCol.entropy.interpolator(t => interp2(1 - t));
		var interp3 = mapCol.log2f_var.interpolator();
		mapCol.log2f_var.interpolator(t => interp3(1 - t));
		var interp4 = mapCol.matrix.interpolator();
		mapCol.matrix.interpolator(t => interp4(1 - t));

		initSpan = Math.min(initSpan, d3.max(data, d => d.pos));
		currentSpan = [1, initSpan];
		zoomData = pos_averages(data);
		drawZoomPlot();
		drawMap();
		drawScale();
		// currentData = "score";
	});
}

function symExtent(data, fun) {
	// Get the smallest extent that includes the data extent but is
	// symmetric around 0, for color scales.
	var ext = d3.extent(data, fun);
	var min = Math.min(ext[0], -ext[1]);
	var max = Math.max(ext[1], -ext[0]);
	return [min, max];
}

function setDownload(id) {
	$("#download").attr("href", "https://demask.net/api/scoresets/" + id + "?download=true");
	$("#download-alignment").attr("href", "https://demask.net/api/alignments/" + id + "?download=true");
	$("#download-pos-rank").attr("href", "https://demask.net/api/pos_rank/" + id + "?download=true");
}

function check() {
	jQuery.get(
		"https://demask.net/api/jobs/" + id,
		function(data) {
			if (data.ready) {
				clearInterval(checker);
				setDownload(id);
				$("#status").hide();
				$(".results").show();
				$("#n-homologs").text(data.n_homologs);
				getVarDataDrawPlot(id);
				// $("#download").show();
				// $(".data-buttons").show();
				// $(".score-explanation").show();
			} else {
				numChecks += 1;
				$("#status").text(data.status + ".".repeat(numChecks));
			}
		}
	);
}

function viewData(type) {
	currentData = type;
	drawZoomPlot();
	drawMap();
	drawScale();
}

var AAs = ["W", "F", "Y", "P", "M", "I", "L", "V", "A", "G",
		   "C", "S", "T", "Q", "N", "D", "E", "H", "R", "K"];

var AA_names = {
	A: "Alanine",
	C: "Cysteine",
	D: "Aspartic acid",
	E: "Glutamic acid",
	F: "Phenylalanine",
	G: "Glycine",
	H: "Histidine",
	I: "Isoleucine",
	K: "Lysine",
	L: "Leucine",
	M: "Methionine",
	N: "Asparagine",
	P: "Proline",
	Q: "Glutamine",
	R: "Arginine",
	S: "Serine",
	T: "Threonine",
	V: "Valine",
	W: "Tryptophan",
	Y: "Tyrosine"
};

var dataTypes = {
	score: "Δ Fitness",
	entropy: "Entropy",
	log2f_var: "log₂(Variant freq.)",
	matrix: "DMS-fit matrix"
};

var mapData;
var zoomData;
var WTs;
var mapCol;			// Compute color scale mapping once.
var initSpan = 100;
var currentData = "score";  	// Data being viewed: score, entropy, etc.
var currentSpan;

var id = window.location.hash.slice(1); // slice removes '#'.
var checker;
var numChecks = 0;
$("#status").text("Loading...");
check();
checker = setInterval(check, 10000);
