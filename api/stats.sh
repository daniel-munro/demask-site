# DB=/Genomics/demask/data/demask.db
# STATS=/var/www/demask/stats.txt
# STATS_DB=/var/www/demask/stats_db.txt
DB=/root/demask/data/demask.db
STATS=/var/www/demask-site/stats.txt
STATS_DB=/var/www/demask-site/stats_db.txt

# Start entry with the date
date >> $STATS

# Show disk usage for / (input, working, and output data) and /var (site and blast db) partitions
df -h | grep -P '/(var)?$' >> $STATS

# Total jobs in database
sqlite3 $DB "SELECT COUNT(sha1) FROM Scoreset" | awk '{print $1" proteins in database"}' >> $STATS

# Dump entire job database into a text file
sqlite3 $DB "PRAGMA table_info(Scoreset)" | cut -d'|' -f2 | tr '\n' '\t' | sed 's/\t$/\n/' > $STATS_DB
sqlite3 $DB "SELECT * FROM Scoreset" | sed 's/|/\t/g' >> $STATS_DB
