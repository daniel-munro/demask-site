import numpy as np
import sys

INFILE = sys.argv[1]
OUTFILE = sys.argv[2]

posns = []
data = {}
with open(INFILE, "r") as f:
    # lines = f.read().splitlines()
    next(f)
    for line in f:
        items = line.strip().split("\t")
        pos, WT, score = int(items[0]), items[1], float(items[3])
        entropy, log2f_var, matrix = items[4], float(items[5]), float(items[6])
        if pos not in data:
            posns.append(pos)
            data[pos] = dict(WT=WT, score=[], entropy=entropy, log2f_var=[], matrix=[])
        data[pos]["score"].append(score)
        data[pos]["log2f_var"].append(log2f_var)
        data[pos]["matrix"].append(matrix)
# data = list(zip(*[line.split("\t") for line in lines]))

for pos in posns:
    for column in ["score", "log2f_var", "matrix"]:
        data[pos][column] = np.mean(data[pos][column])

mean_scores = [data[pos]["score"] for pos in posns]
with open(OUTFILE, "w") as f:
    f.write("pos\tWT\tmean_score\tentropy\tmean_log2f_var\tmean_matrix\n")
    for i in np.argsort(mean_scores):
        pos = posns[i]
        d = data[pos]
        f.write("{}\t{}\t{:#.6g}\t{}\t{:#.6g}\t{:#.6g}\n".format(
            pos, d["WT"], d["score"], d["entropy"], d["log2f_var"], d["matrix"])
        )