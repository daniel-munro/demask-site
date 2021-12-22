function drawMatrix(data) {
    var svg = d3.select("#matrix");
    var width = +svg.attr("width");
    var height = +svg.attr("height");
    var g = svg.append("g");
    var x = d3.scaleBand().range([0, width])
	.domain(AAs);
    var y = d3.scaleBand().range([0, height])
	.domain(AAs);
    var tip = d3.tip()
	.attr('class', 'd3-tip')
	.offset([-5, 0])
	.html(function(d) {
    	    var sc = Math.round(d.score * 100) / 100;
    	    // var lab = d.WT + '&rarr;' + d.var + ': ' + sc;
    	    var lab = d.AA1 + '&rarr;' + d.AA2 + ': ' + sc;
    	    return lab;
	});
    
    var col = d3.scaleSequential(d3.interpolateBlues)
	.domain([0, d3.min(data, d => d.score)]);
    // col.domain([0, 1]);
    
    g.selectAll(".subtile")
	.data(data)
	.enter().append("rect")
	.attr("class", "subtile")
	// .attr("x", d => x(d.WT))
	// .attr("y", d => y(d.var))
	.attr("x", d => x(d.AA1))
	.attr("y", d => y(d.AA2))
	.attr("width", x.bandwidth())
	.attr("height", y.bandwidth())
	.style("fill", d => col(d.score))
	// .call(hover_WTvar)
	.call(tip)
	.on('mouseover', tip.show)
	.on('mouseout', tip.hide);

    g.selectAll(".matlabel")
    	.data(AAs)
    	.enter().append("text")
    	.attr("class", "matlabel")
    	.attr("x", d => x(d) + x.bandwidth() / 2)
    	.attr("y", d => y(d) + y.bandwidth() / 2)
    	// .attr("width", x.bandwidth())
    	// .attr("height", x.bandwidth())
    	.attr("text-anchor", "middle")
    	.attr("dominant-baseline", "central")
    	.style("font-size", (y.bandwidth() - 4) + "px")
    	.text(d => d)
	.append("title")	// Tooltips
	.text(d => AA_names[d]);
}

var AAs = ["W", "F", "Y", "P", "M", "I", "L", "V", "A", "G",
    	   "C", "S", "T", "Q", "N", "D", "E", "H", "R", "K"];

var AA_names = {
    A:	"Alanine",
    C:	"Cysteine",
    D:	"Aspartic",
    E:	"Glutamic",
    F:	"Phenylalanine",
    G:	"Glycine",
    H:	"Histidine",
    I:	"Isoleucine",
    K:	"Lysine",
    L:	"Leucine",
    M:	"Methionine",
    N:	"Asparagine",
    P:	"Proline",
    Q:	"Glutamine",
    R:	"Arginine",
    S:	"Serine",
    T:	"Threonine",
    V:	"Valine",
    W:	"Tryptophan",
    Y:	"Tyrosine"
}

d3.tsv("matrix.txt", function(d) {
    return d;
}).then(function(data) {
    var tidy = [];
    var chars = Object.keys(data[0]);
    for (var i = 0; i < data.length; i++) {
	Object.keys(data[i]).forEach(function(AA2) {
	    tidy.push({
		AA1: chars[i],
		AA2: AA2,
		score: +data[i][AA2]
	    });
	});
    }
    drawMatrix(tidy);
});

// var table = new Tabulator("#datasetTable", {
//     // layout: "fitColumns",
//     layout: "fitData",
//     columns: [
// 	{title: "Study"},
// 	{title: "PMID",
// 	 formatter: "link",
// 	 formatterParams: {
// 	     urlPrefix: "https://www.ncbi.nlm.nih.gov/pubmed/?term="
// 	 }
// 	},
// 	{title: "Species"},
// 	{title: "Protein"},
// 	{title: "Positions mutated"}
//     ]
// });
