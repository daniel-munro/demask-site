ID=$1
# DATADIR="/Genomics/demask/data"
DATADIR="/root/demask/data"
SEQFILE="${DATADIR}/working/${ID}.fa"
BLASTFILE="${DATADIR}/working/${ID}.blast.json"
ALNFILE="${DATADIR}/working/${ID}.a2m"
OUTFILE="${DATADIR}/results/${ID}.txt"
POSFILE="${DATADIR}/pos_rank/${ID}.pos_rank.txt"
DBFILE="${DATADIR}/demask.db"

# /Genomics/demask/local/bin/python3 -m demask.homologs -c demask_config.ini -s $SEQFILE -o $ALNFILE
python3 -m demask.homologs -c demask_config.ini -s $SEQFILE -o $ALNFILE

if [ $? -eq 0 ]
then
    HITS=$(($(grep -c "^>" $ALNFILE)-1))
    sqlite3 $DBFILE "UPDATE Scoreset SET homologs=1 WHERE sha1='$ID'"
    sqlite3 $DBFILE "UPDATE Scoreset SET n_homologs=$HITS WHERE sha1='$ID'"
    rm $BLASTFILE
else
    sqlite3 $DBFILE "UPDATE Scoreset SET error=1 WHERE sha1='$ID'"
    exit 1
fi

# /Genomics/demask/local/bin/python3 -m demask.predict -c demask_config.ini -i $ALNFILE -o $OUTFILE
python3 -m demask.predict -c demask_config.ini -i $ALNFILE -o $OUTFILE

if [ $? -eq 0 ]
then
    # /Genomics/demask/local/bin/python3 pos_rank.py $OUTFILE $POSFILE
    python3 pos_rank.py $OUTFILE $POSFILE
    sqlite3 $DBFILE "UPDATE Scoreset SET ready=1 WHERE sha1='$ID'"
    sqlite3 $DBFILE "UPDATE Scoreset SET finished_at=datetime('now') WHERE sha1='$ID'"
else
    sqlite3 $DBFILE "UPDATE Scoreset SET error=1 WHERE sha1='$ID'"    
fi
